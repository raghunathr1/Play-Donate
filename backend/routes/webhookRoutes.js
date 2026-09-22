const express = require("express");
const router = express.Router();
const Stripe = require("stripe");

const supabase = require("../config/supabase");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// =========================================================
// STRIPE WEBHOOK
// IMPORTANT:
// This route receives RAW Stripe body.
// In server.js, webhook route must be registered
// BEFORE express.json()
// =========================================================

router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      console.error(
        "Stripe webhook signature verification failed:",
        error.message
      );

      return res.status(400).send(
        `Webhook Error: ${error.message}`
      );
    }

    console.log(
      "Stripe Webhook Received:",
      event.type
    );

    try {
      // =====================================================
      // CHECKOUT COMPLETED
      // =====================================================

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        console.log(
          "Checkout completed:",
          session.id
        );

        const userId =
          session.metadata?.userId;

        const plan =
          session.metadata?.plan;

        const stripeSubscriptionId =
          session.subscription;

        if (!userId) {
          console.error(
            "Webhook error: userId missing from metadata"
          );

          return res.status(400).json({
            message: "userId missing from metadata",
          });
        }

        if (!stripeSubscriptionId) {
          console.error(
            "Webhook error: Stripe subscription ID missing"
          );

          return res.status(400).json({
            message:
              "Stripe subscription ID missing",
          });
        }

        // -----------------------------------------------
        // Get complete Stripe subscription
        // -----------------------------------------------

        const stripeSubscription =
          await stripe.subscriptions.retrieve(
            stripeSubscriptionId
          );

        const startDate =
          stripeSubscription.current_period_start
            ? new Date(
                stripeSubscription.current_period_start *
                  1000
              ).toISOString()
            : new Date().toISOString();

        const endDate =
          stripeSubscription.current_period_end
            ? new Date(
                stripeSubscription.current_period_end *
                  1000
              ).toISOString()
            : null;

        const price =
          stripeSubscription.items?.data?.[0]?.price;

        const amount =
          price?.unit_amount
            ? price.unit_amount / 100
            : 0;

        // -----------------------------------------------
        // Check existing subscription
        // -----------------------------------------------

        const {
          data: existingSubscription,
          error: existingError,
        } = await supabase
          .from("subscriptions")
          .select("*")
          .eq(
            "stripe_subscription_id",
            stripeSubscriptionId
          )
          .maybeSingle();

        if (existingError) {
          console.error(
            "Check existing subscription error:",
            existingError
          );

          return res.status(500).json({
            message:
              "Failed to check subscription",
          });
        }

        // -----------------------------------------------
        // Update existing subscription
        // -----------------------------------------------

        if (existingSubscription) {
          const {
            error: updateSubscriptionError,
          } = await supabase
            .from("subscriptions")
            .update({
              status: "Active",
              plan: plan || "Monthly",
              amount,
              start_date: startDate,
              end_date: endDate,
            })
            .eq(
              "stripe_subscription_id",
              stripeSubscriptionId
            );

          if (updateSubscriptionError) {
            console.error(
              "Update subscription error:",
              updateSubscriptionError
            );

            return res.status(500).json({
              message:
                "Failed to update subscription",
            });
          }
        }

        // -----------------------------------------------
        // Create new subscription
        // -----------------------------------------------

        if (!existingSubscription) {
          const {
            error: insertSubscriptionError,
          } = await supabase
            .from("subscriptions")
            .insert({
              user_id: userId,
              plan: plan || "Monthly",
              amount,
              status: "Active",
              start_date: startDate,
              end_date: endDate,
              stripe_subscription_id:
                stripeSubscriptionId,
            });

          if (insertSubscriptionError) {
            console.error(
              "Insert subscription error:",
              insertSubscriptionError
            );

            return res.status(500).json({
              message:
                "Failed to create subscription",
            });
          }
        }

        // -----------------------------------------------
        // Update USER
        // -----------------------------------------------

        const {
          error: updateUserError,
        } = await supabase
          .from("users")
          .update({
            subscription_status: "Active",
            subscription_plan:
              plan || "Monthly",
            subscription_start_date:
              startDate,
            subscription_end_date:
              endDate,
            stripe_subscription_id:
              stripeSubscriptionId,
          })
          .eq("id", userId);

        if (updateUserError) {
          console.error(
            "Update user subscription error:",
            updateUserError
          );

          return res.status(500).json({
            message:
              "Subscription created but user update failed",
          });
        }

        console.log(
          "Subscription activated successfully for user:",
          userId
        );
      }

      // =====================================================
      // SUBSCRIPTION UPDATED
      // =====================================================

      if (
        event.type ===
        "customer.subscription.updated"
      ) {
        const subscription =
          event.data.object;

        const stripeSubscriptionId =
          subscription.id;

        const userId =
          subscription.metadata?.userId;

        const plan =
          subscription.metadata?.plan;

        const stripeStatus =
          subscription.status;

        let localStatus = "Active";

        if (
          stripeStatus === "canceled"
        ) {
          localStatus = "Cancelled";
        } else if (
          stripeStatus === "past_due"
        ) {
          localStatus = "Past Due";
        } else if (
          stripeStatus === "unpaid"
        ) {
          localStatus = "Unpaid";
        } else if (
          stripeStatus === "incomplete"
        ) {
          localStatus = "Incomplete";
        } else if (
          stripeStatus ===
          "incomplete_expired"
        ) {
          localStatus = "Cancelled";
        }

        const startDate =
          subscription.current_period_start
            ? new Date(
                subscription.current_period_start *
                  1000
              ).toISOString()
            : null;

        const endDate =
          subscription.current_period_end
            ? new Date(
                subscription.current_period_end *
                  1000
              ).toISOString()
            : null;

        const price =
          subscription.items?.data?.[0]?.price;

        const amount =
          price?.unit_amount
            ? price.unit_amount / 100
            : 0;

        // -----------------------------------------------
        // Update subscriptions table
        // -----------------------------------------------

        const {
          error: updateSubscriptionError,
        } = await supabase
          .from("subscriptions")
          .update({
            status: localStatus,
            plan: plan || "Monthly",
            amount,
            start_date: startDate,
            end_date: endDate,
          })
          .eq(
            "stripe_subscription_id",
            stripeSubscriptionId
          );

        if (updateSubscriptionError) {
          console.error(
            "Subscription update error:",
            updateSubscriptionError
          );

          return res.status(500).json({
            message:
              "Failed to update subscription",
          });
        }

        // -----------------------------------------------
        // Update users table
        // -----------------------------------------------

        const userUpdate = {
          subscription_status:
            localStatus,
          subscription_plan:
            plan || "Monthly",
          subscription_start_date:
            startDate,
          subscription_end_date:
            endDate,
        };

        if (userId) {
          const {
            error: updateUserError,
          } = await supabase
            .from("users")
            .update(userUpdate)
            .eq("id", userId);

          if (updateUserError) {
            console.error(
              "User subscription update error:",
              updateUserError
            );

            return res.status(500).json({
              message:
                "Failed to update user subscription",
            });
          }
        }

        console.log(
          "Subscription updated:",
          stripeSubscriptionId,
          localStatus
        );
      }

      // =====================================================
      // SUBSCRIPTION DELETED / CANCELLED
      // =====================================================

      if (
        event.type ===
        "customer.subscription.deleted"
      ) {
        const subscription =
          event.data.object;

        const stripeSubscriptionId =
          subscription.id;

        const userId =
          subscription.metadata?.userId;

        const endDate =
          subscription.ended_at
            ? new Date(
                subscription.ended_at * 1000
              ).toISOString()
            : new Date().toISOString();

        // -----------------------------------------------
        // Update subscriptions table
        // -----------------------------------------------

        const {
          error: subscriptionError,
        } = await supabase
          .from("subscriptions")
          .update({
            status: "Cancelled",
            end_date: endDate,
          })
          .eq(
            "stripe_subscription_id",
            stripeSubscriptionId
          );

        if (subscriptionError) {
          console.error(
            "Cancel subscription DB error:",
            subscriptionError
          );

          return res.status(500).json({
            message:
              "Failed to update cancelled subscription",
          });
        }

        // -----------------------------------------------
        // Update users table
        // -----------------------------------------------

        if (userId) {
          const {
            error: userError,
          } = await supabase
            .from("users")
            .update({
              subscription_status:
                "Cancelled",
              subscription_end_date:
                endDate,
            })
            .eq("id", userId);

          if (userError) {
            console.error(
              "Cancel user subscription error:",
              userError
            );

            return res.status(500).json({
              message:
                "Failed to update user cancellation",
            });
          }
        }

        console.log(
          "Subscription cancelled:",
          stripeSubscriptionId
        );
      }

      // =====================================================
      // PAYMENT FAILED
      // =====================================================

      if (
        event.type ===
        "invoice.payment_failed"
      ) {
        const invoice =
          event.data.object;

        const stripeSubscriptionId =
          invoice.subscription;

        if (stripeSubscriptionId) {
          const {
            data: subscription,
            error: findError,
          } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq(
              "stripe_subscription_id",
              stripeSubscriptionId
            )
            .maybeSingle();

          if (findError) {
            console.error(
              "Find failed subscription error:",
              findError
            );
          }

          if (subscription) {
            await supabase
              .from("subscriptions")
              .update({
                status: "Past Due",
              })
              .eq(
                "stripe_subscription_id",
                stripeSubscriptionId
              );

            await supabase
              .from("users")
              .update({
                subscription_status:
                  "Past Due",
              })
              .eq(
                "id",
                subscription.user_id
              );

            console.log(
              "Subscription payment failed:",
              stripeSubscriptionId
            );
          }
        }
      }

      // =====================================================
      // STRIPE ACKNOWLEDGEMENT
      // =====================================================

      return res.json({
        received: true,
      });
    } catch (error) {
      console.error(
        "Stripe webhook processing error:",
        error
      );

      return res.status(500).json({
        message:
          "Webhook processing failed",
      });
    }
  }
);

module.exports = router;