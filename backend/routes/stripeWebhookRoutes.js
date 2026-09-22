const express = require("express");
const router = express.Router();

const Stripe = require("stripe");
const supabase = require("../config/supabase");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// IMPORTANT:
// Stripe webhook route server.js mein express.json()
// se PEHLE mount hona chahiye.

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

    try {
      switch (event.type) {
        // =====================================================
        // CHECKOUT SESSION COMPLETED
        // =====================================================

        case "checkout.session.completed": {
          const session = event.data.object;

          // ---------------------------------------------------
          // DONATION
          // ---------------------------------------------------

          if (session.mode === "payment") {
            const donationId =
              session.metadata?.donationId;

            if (!donationId) {
              console.log(
                "Donation ID not found in Stripe metadata"
              );
              break;
            }

            const paymentStatus =
              session.payment_status;

            const donationStatus =
              paymentStatus === "paid"
                ? "Paid"
                : "Pending";

            const { error: donationError } =
              await supabase
                .from("donations")
                .update({
                  status: donationStatus,
                  stripe_payment_intent_id:
                    session.payment_intent || null,
                })
                .eq("id", donationId);

            if (donationError) {
              console.error(
                "Donation webhook update error:",
                donationError
              );
            } else {
              console.log(
                `Donation ${donationId} updated: ${donationStatus}`
              );
            }
          }

          // ---------------------------------------------------
          // SUBSCRIPTION
          // ---------------------------------------------------

          if (session.mode === "subscription") {
            const userId =
              session.metadata?.userId;

            const plan =
              session.metadata?.plan;

            const stripeSubscriptionId =
              session.subscription;

            if (!userId || !stripeSubscriptionId) {
              console.log(
                "Subscription metadata is incomplete"
              );
              break;
            }

            const stripeSubscription =
              await stripe.subscriptions.retrieve(
                stripeSubscriptionId
              );

            const subscriptionItem =
              stripeSubscription.items?.data?.[0];

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

            const startDate =
              stripeSubscription.start_date
                ? new Date(
                    stripeSubscription.start_date * 1000
                  ).toISOString()
                : new Date().toISOString();

            const endDate =
              stripeSubscription.cancel_at
                ? new Date(
                    stripeSubscription.cancel_at * 1000
                  ).toISOString()
                : stripeSubscription.current_period_end
                ? new Date(
                    stripeSubscription.current_period_end *
                      1000
                  ).toISOString()
                : null;

            const subscriptionStatus =
              stripeSubscription.status === "active"
                ? "Active"
                : stripeSubscription.status === "canceled"
                ? "Cancelled"
                : "Lapsed";

            // -----------------------------------------------
            // Save subscription
            // -----------------------------------------------

            const { data: existingSubscription, error: findError } =
              await supabase
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
              break;
            }

            let subscriptionError;

            if (existingSubscription) {
              const result = await supabase
                .from("subscriptions")
                .update({
                  user_id: userId,
                  plan:
                    plan ||
                    (price?.id ===
                    process.env.STRIPE_YEARLY_PRICE_ID
                      ? "Yearly"
                      : "Monthly"),
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
                .eq("id", existingSubscription.id);

              subscriptionError = result.error;
            } else {
              const result = await supabase
                .from("subscriptions")
                .insert({
                  user_id: userId,
                  plan:
                    plan ||
                    (price?.id ===
                    process.env.STRIPE_YEARLY_PRICE_ID
                      ? "Yearly"
                      : "Monthly"),
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

              subscriptionError = result.error;
            }

            if (subscriptionError) {
              console.error(
                "Save subscription error:",
                subscriptionError
              );
              break;
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
                    plan ||
                    (price?.id ===
                    process.env.STRIPE_YEARLY_PRICE_ID
                      ? "Yearly"
                      : "Monthly"),
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
            } else {
              console.log(
                `User ${userId} subscription activated`
              );
            }
          }

          break;
        }

        // =====================================================
        // SUBSCRIPTION UPDATED
        // =====================================================

        case "customer.subscription.updated": {
          const subscription = event.data.object;

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

          // Find local subscription
          const { data: localSubscription, error: findError } =
            await supabase
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
            break;
          }

          if (!localSubscription) {
            console.log(
              "Local subscription not found:",
              stripeSubscriptionId
            );
            break;
          }

          // Update subscription
          const { error: subscriptionError } =
            await supabase
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
              .eq("id", localSubscription.id);

          if (subscriptionError) {
            console.error(
              "Update subscription error:",
              subscriptionError
            );
            break;
          }

          // Update user
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
          }

          break;
        }

        // =====================================================
        // SUBSCRIPTION DELETED
        // =====================================================

        case "customer.subscription.deleted": {
          const subscription = event.data.object;

          const stripeSubscriptionId =
            subscription.id;

          const endDate =
            subscription.ended_at
              ? new Date(
                  subscription.ended_at * 1000
                ).toISOString()
              : new Date().toISOString();

          // Find subscription
          const { data: localSubscription, error: findError } =
            await supabase
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
            break;
          }

          if (!localSubscription) {
            console.log(
              "Deleted subscription not found locally:",
              stripeSubscriptionId
            );
            break;
          }

          // Update subscription
          const { error: subscriptionError } =
            await supabase
              .from("subscriptions")
              .update({
                status: "Cancelled",
                end_date: endDate,
              })
              .eq("id", localSubscription.id);

          if (subscriptionError) {
            console.error(
              "Cancel local subscription error:",
              subscriptionError
            );
            break;
          }

          // Update user
          const { error: userError } =
            await supabase
              .from("users")
              .update({
                subscription_status: "Cancelled",
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
          } else {
            console.log(
              `Subscription ${stripeSubscriptionId} cancelled`
            );
          }

          break;
        }

        default:
          console.log(
            `Unhandled Stripe event: ${event.type}`
          );
      }

      return res.json({
        received: true,
      });
    } catch (error) {
      console.error(
        "Stripe webhook processing error:",
        error
      );

      return res.status(500).json({
        message: "Webhook processing failed",
      });
    }
  }
);

module.exports = router;