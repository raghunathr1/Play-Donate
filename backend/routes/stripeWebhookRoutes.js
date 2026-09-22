const express = require("express");
const router = express.Router();

const Stripe = require("stripe");
const supabase = require("../config/supabase");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// =========================================================
// STRIPE WEBHOOK
// IMPORTANT:
// server.js mein ye route express.json() SE PEHLE mount hona chahiye.
// =========================================================

router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];

    let event;

    // =====================================================
    // VERIFY STRIPE WEBHOOK SIGNATURE
    // =====================================================

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
      `Stripe Webhook Received: ${event.type}`
    );

    try {
      // ===================================================
      // CHECKOUT SESSION COMPLETED
      // Handles:
      // 1. Donation
      // 2. Subscription
      // ===================================================

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        console.log(
          "Checkout completed:",
          session.id
        );

        console.log(
          "Checkout mode:",
          session.mode
        );

        // =================================================
        // DONATION CHECKOUT
        // mode = payment
        // =================================================

        if (session.mode === "payment") {
          const donationId =
            session.metadata?.donationId;

          const userId =
            session.metadata?.userId;

          const charityId =
            session.metadata?.charityId;

          console.log(
            "Donation ID:",
            donationId
          );

          console.log(
            "Donation User ID:",
            userId
          );

          console.log(
            "Donation Charity ID:",
            charityId
          );

          // -----------------------------------------------
          // Donation ID required
          // -----------------------------------------------

          if (!donationId) {
            console.error(
              "Donation ID missing from Stripe metadata"
            );

            return res.json({
              received: true,
            });
          }

          // -----------------------------------------------
          // Determine payment status
          // -----------------------------------------------

          const donationStatus =
            session.payment_status === "paid"
              ? "Paid"
              : "Pending";

          // -----------------------------------------------
          // Update donation
          // -----------------------------------------------

          const { data: updatedDonation, error } =
            await supabase
              .from("donations")
              .update({
                status: donationStatus,
                stripe_payment_intent_id:
                  session.payment_intent || null,
              })
              .eq("id", donationId)
              .select("*")
              .maybeSingle();

          if (error) {
            console.error(
              "Donation webhook update error:",
              error
            );

            return res.status(500).json({
              message:
                "Failed to update donation",
            });
          }

          console.log(
            `Donation ${donationId} updated: ${donationStatus}`
          );

          console.log(
            "Updated donation:",
            updatedDonation?.id || "not found"
          );

          // IMPORTANT:
          // Donation processing ends here.
          // Subscription code will NOT run.
          return res.json({
            received: true,
          });
        }

        // =================================================
        // SUBSCRIPTION CHECKOUT
        // mode = subscription
        // =================================================

        if (session.mode === "subscription") {
          const userId =
            session.metadata?.userId;

          const plan =
            session.metadata?.plan;

          const stripeSubscriptionId =
            session.subscription;

          console.log(
            "Subscription User ID:",
            userId
          );

          console.log(
            "Subscription Plan:",
            plan
          );

          console.log(
            "Stripe Subscription ID:",
            stripeSubscriptionId
          );

          // -----------------------------------------------
          // Validate subscription data
          // -----------------------------------------------

          if (!userId) {
            console.error(
              "Subscription user ID missing"
            );

            return res.json({
              received: true,
            });
          }

          if (!stripeSubscriptionId) {
            console.error(
              "Stripe subscription ID missing"
            );

            return res.json({
              received: true,
            });
          }

          // -----------------------------------------------
          // Get subscription from Stripe
          // -----------------------------------------------

          const stripeSubscription =
            await stripe.subscriptions.retrieve(
              stripeSubscriptionId
            );

          const subscriptionItem =
            stripeSubscription.items?.data?.[0];

          const price =
            subscriptionItem?.price;

          // -----------------------------------------------
          // Amount
          // -----------------------------------------------

          const amount =
            price?.unit_amount
              ? price.unit_amount / 100
              : 0;

          // -----------------------------------------------
          // Currency
          // -----------------------------------------------

          const currency =
            price?.currency
              ? price.currency.toUpperCase()
              : "INR";

          // -----------------------------------------------
          // Plan
          // -----------------------------------------------

          const subscriptionPlan =
            plan ||
            (
              price?.id ===
              process.env.STRIPE_YEARLY_PRICE_ID
            )
              ? "Yearly"
              : "Monthly";

          // -----------------------------------------------
          // Start date
          // -----------------------------------------------

          const startDate =
            stripeSubscription.start_date
              ? new Date(
                  stripeSubscription.start_date * 1000
                ).toISOString()
              : new Date().toISOString();

          // -----------------------------------------------
          // End / renewal date
          // -----------------------------------------------

          const endDate =
            stripeSubscription.cancel_at
              ? new Date(
                  stripeSubscription.cancel_at * 1000
                ).toISOString()
              : stripeSubscription.current_period_end
              ? new Date(
                  stripeSubscription.current_period_end * 1000
                ).toISOString()
              : null;

          // -----------------------------------------------
          // Status
          // -----------------------------------------------

          const subscriptionStatus =
            stripeSubscription.status === "active"
              ? "Active"
              : stripeSubscription.status === "canceled"
              ? "Cancelled"
              : "Lapsed";

          // -----------------------------------------------
          // Find existing local subscription
          // -----------------------------------------------

          const {
            data: existingSubscription,
            error: findError,
          } = await supabase
            .from("subscriptions")
            .select("id")
            .eq(
              "stripe_subscription_id",
              stripeSubscriptionId
            )
            .maybeSingle();

          if (findError) {
            console.error(
              "Find subscription error:",
              findError
            );

            return res.status(500).json({
              message:
                "Failed to find subscription",
            });
          }

          // -----------------------------------------------
          // Update existing subscription
          // OR create new subscription
          // -----------------------------------------------

          if (existingSubscription) {
            const { error: updateError } =
              await supabase
                .from("subscriptions")
                .update({
                  user_id: userId,
                  plan: subscriptionPlan,
                  status: subscriptionStatus,
                  amount,
                  currency,
                  start_date: startDate,
                  end_date: endDate,
                  stripe_customer_id:
                    stripeSubscription.customer || null,
                  stripe_price_id:
                    price?.id || null,
                })
                .eq(
                  "id",
                  existingSubscription.id
                );

            if (updateError) {
              console.error(
                "Update subscription error:",
                updateError
              );

              return res.status(500).json({
                message:
                  "Failed to update subscription",
              });
            }

            console.log(
              `Subscription ${stripeSubscriptionId} updated`
            );
          } else {
            const { error: insertError } =
              await supabase
                .from("subscriptions")
                .insert({
                  user_id: userId,
                  plan: subscriptionPlan,
                  status: subscriptionStatus,
                  amount,
                  currency,
                  start_date: startDate,
                  end_date: endDate,
                  stripe_customer_id:
                    stripeSubscription.customer || null,
                  stripe_subscription_id:
                    stripeSubscription.id,
                  stripe_price_id:
                    price?.id || null,
                });

            if (insertError) {
              console.error(
                "Create subscription error:",
                insertError
              );

              return res.status(500).json({
                message:
                  "Failed to create subscription",
              });
            }

            console.log(
              `Subscription ${stripeSubscriptionId} created`
            );
          }

          // -----------------------------------------------
          // Update user
          // -----------------------------------------------

          const { error: userError } =
            await supabase
              .from("users")
              .update({
                subscription_status:
                  subscriptionStatus,

                subscription_plan:
                  subscriptionPlan,

                subscription_start_date:
                  startDate,

                subscription_end_date:
                  endDate,

                stripe_customer_id:
                  stripeSubscription.customer || null,

                stripe_subscription_id:
                  stripeSubscription.id,

                stripe_price_id:
                  price?.id || null,
              })
              .eq("id", userId);

          if (userError) {
            console.error(
              "Update user subscription error:",
              userError
            );

            return res.status(500).json({
              message:
                "Failed to update user subscription",
            });
          }

          console.log(
            `Subscription activated successfully for user: ${userId}`
          );

          return res.json({
            received: true,
          });
        }

        // =================================================
        // UNKNOWN CHECKOUT MODE
        // =================================================

        console.log(
          `Unhandled checkout mode: ${session.mode}`
        );

        return res.json({
          received: true,
        });
      }

      // ===================================================
      // SUBSCRIPTION UPDATED
      // ===================================================

      if (
        event.type ===
        "customer.subscription.updated"
      ) {
        const subscription =
          event.data.object;

        const stripeSubscriptionId =
          subscription.id;

        const subscriptionItem =
          subscription.items?.data?.[0];

        const price =
          subscriptionItem?.price;

        const amount =
          price?.unit_amount
            ? price.unit_amount / 100
            : 0;

        const currency =
          price?.currency
            ? price.currency.toUpperCase()
            : "INR";

        const plan =
          price?.id ===
          process.env.STRIPE_YEARLY_PRICE_ID
            ? "Yearly"
            : "Monthly";

        const status =
          subscription.status === "active"
            ? "Active"
            : subscription.status === "canceled"
            ? "Cancelled"
            : "Lapsed";

        const startDate =
          subscription.start_date
            ? new Date(
                subscription.start_date * 1000
              ).toISOString()
            : null;

        const endDate =
          subscription.cancel_at
            ? new Date(
                subscription.cancel_at * 1000
              ).toISOString()
            : subscription.current_period_end
            ? new Date(
                subscription.current_period_end * 1000
              ).toISOString()
            : null;

        // -----------------------------------------------
        // Find local subscription
        // -----------------------------------------------

        const {
          data: localSubscription,
          error: findError,
        } = await supabase
          .from("subscriptions")
          .select("id, user_id")
          .eq(
            "stripe_subscription_id",
            stripeSubscriptionId
          )
          .maybeSingle();

        if (findError) {
          console.error(
            "Find updated subscription error:",
            findError
          );

          return res.status(500).json({
            message:
              "Failed to find subscription",
          });
        }

        if (!localSubscription) {
          console.log(
            "Local subscription not found:",
            stripeSubscriptionId
          );

          return res.json({
            received: true,
          });
        }

        // -----------------------------------------------
        // Update local subscription
        // -----------------------------------------------

        const {
          error: subscriptionError,
        } = await supabase
          .from("subscriptions")
          .update({
            plan,
            status,
            amount,
            currency,
            start_date: startDate,
            end_date: endDate,
            stripe_customer_id:
              subscription.customer || null,
            stripe_price_id:
              price?.id || null,
          })
          .eq(
            "id",
            localSubscription.id
          );

        if (subscriptionError) {
          console.error(
            "Update subscription error:",
            subscriptionError
          );

          return res.status(500).json({
            message:
              "Failed to update subscription",
          });
        }

        // -----------------------------------------------
        // Update user
        // -----------------------------------------------

        const { error: userError } =
          await supabase
            .from("users")
            .update({
              subscription_status: status,
              subscription_plan: plan,
              subscription_start_date:
                startDate,
              subscription_end_date:
                endDate,
              stripe_customer_id:
                subscription.customer || null,
              stripe_subscription_id:
                subscription.id,
              stripe_price_id:
                price?.id || null,
            })
            .eq(
              "id",
              localSubscription.user_id
            );

        if (userError) {
          console.error(
            "Update user subscription error:",
            userError
          );

          return res.status(500).json({
            message:
              "Failed to update user subscription",
          });
        }

        console.log(
          `Subscription ${stripeSubscriptionId} updated successfully`
        );

        return res.json({
          received: true,
        });
      }

      // ===================================================
      // SUBSCRIPTION DELETED
      // ===================================================

      if (
        event.type ===
        "customer.subscription.deleted"
      ) {
        const subscription =
          event.data.object;

        const stripeSubscriptionId =
          subscription.id;

        const endDate =
          subscription.ended_at
            ? new Date(
                subscription.ended_at * 1000
              ).toISOString()
            : new Date().toISOString();

        // -----------------------------------------------
        // Find local subscription
        // -----------------------------------------------

        const {
          data: localSubscription,
          error: findError,
        } = await supabase
          .from("subscriptions")
          .select("id, user_id")
          .eq(
            "stripe_subscription_id",
            stripeSubscriptionId
          )
          .maybeSingle();

        if (findError) {
          console.error(
            "Find deleted subscription error:",
            findError
          );

          return res.status(500).json({
            message:
              "Failed to find deleted subscription",
          });
        }

        if (!localSubscription) {
          console.log(
            "Deleted subscription not found locally:",
            stripeSubscriptionId
          );

          return res.json({
            received: true,
          });
        }

        // -----------------------------------------------
        // Update local subscription
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
            "id",
            localSubscription.id
          );

        if (subscriptionError) {
          console.error(
            "Cancel local subscription error:",
            subscriptionError
          );

          return res.status(500).json({
            message:
              "Failed to cancel subscription",
          });
        }

        // -----------------------------------------------
        // Update user
        // -----------------------------------------------

        const { error: userError } =
          await supabase
            .from("users")
            .update({
              subscription_status:
                "Cancelled",

              subscription_end_date:
                endDate,
            })
            .eq(
              "id",
              localSubscription.user_id
            );

        if (userError) {
          console.error(
            "Cancel user subscription error:",
            userError
          );

          return res.status(500).json({
            message:
              "Failed to update cancelled subscription",
          });
        }

        console.log(
          `Subscription ${stripeSubscriptionId} cancelled`
        );

        return res.json({
          received: true,
        });
      }

      // ===================================================
      // SUBSCRIPTION CREATED
      // ===================================================
      // We don't need to save it here because
      // checkout.session.completed handles the subscription.
      // ===================================================

      if (
        event.type ===
        "customer.subscription.created"
      ) {
        console.log(
          "Subscription created event received:",
          event.data.object.id
        );

        return res.json({
          received: true,
        });
      }

      // ===================================================
      // OTHER STRIPE EVENTS
      // ===================================================

      console.log(
        `Unhandled Stripe event: ${event.type}`
      );

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