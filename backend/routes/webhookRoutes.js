const express = require("express");
const router = express.Router();

const Stripe = require("stripe");
const supabase = require("../config/supabase");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// =========================================================
// STRIPE WEBHOOK
// IMPORTANT:
// This route must be mounted BEFORE express.json()
// =========================================================

router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];

    let event;

    // =====================================================
    // VERIFY STRIPE SIGNATURE
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
      // ===================================================

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        console.log(
          "Checkout completed:",
          session.id
        );

        // =================================================
        // DONATION CHECKOUT
        // =================================================

        if (session.mode === "payment") {
          const donationId =
            session.metadata?.donationId;

          if (!donationId) {
            console.log(
              "Donation ID not found in Stripe metadata"
            );

            return res.json({
              received: true,
            });
          }

          const paymentStatus =
            session.payment_status;

          const donationStatus =
            paymentStatus === "paid"
              ? "Paid"
              : "Pending";

          const { error } = await supabase
            .from("donations")
            .update({
              status: donationStatus,
              stripe_payment_intent_id:
                session.payment_intent || null,
            })
            .eq("id", donationId);

          if (error) {
            console.error(
              "Donation webhook update error:",
              error
            );

            // Do NOT return 400.
            // Stripe webhook itself was valid.
            return res.json({
              received: true,
            });
          }

          console.log(
            `Donation ${donationId} updated: ${donationStatus}`
          );

          return res.json({
            received: true,
          });
        }

        // =================================================
        // SUBSCRIPTION CHECKOUT
        // =================================================

        if (session.mode === "subscription") {
          const userId =
            session.metadata?.userId;

          const plan =
            session.metadata?.plan || null;

          const stripeSubscriptionId =
            session.subscription;

          // -----------------------------------------------
          // IMPORTANT FIX
          // -----------------------------------------------

          if (!stripeSubscriptionId) {
            console.error(
              "Webhook error: Stripe subscription ID missing"
            );

            console.log(
              "Session mode:",
              session.mode
            );

            console.log(
              "Session metadata:",
              session.metadata
            );

            /*
              Do NOT return 400 here.

              Stripe event itself is valid.
              Returning 400 causes Stripe/Stripe CLI
              to treat it as failed and retry it.
            */

            return res.json({
              received: true,
              message:
                "Subscription ID not available yet",
            });
          }

          if (!userId) {
            console.error(
              "Webhook error: User ID missing from metadata"
            );

            return res.json({
              received: true,
            });
          }

          // -----------------------------------------------
          // Retrieve Stripe subscription
          // -----------------------------------------------

          const subscription =
            await stripe.subscriptions.retrieve(
              stripeSubscriptionId
            );

          await saveSubscription(
            subscription,
            userId,
            plan
          );

          console.log(
            `Subscription activated successfully for user: ${userId}`
          );

          return res.json({
            received: true,
          });
        }

        return res.json({
          received: true,
        });
      }

      // ===================================================
      // CUSTOMER SUBSCRIPTION CREATED
      // ===================================================

      if (
        event.type ===
        "customer.subscription.created"
      ) {
        const subscription =
          event.data.object;

        console.log(
          "Stripe subscription created:",
          subscription.id
        );

        // -----------------------------------------------
        // Get metadata
        // -----------------------------------------------

        const userId =
          subscription.metadata?.userId;

        const plan =
          subscription.metadata?.plan || null;

        if (!userId) {
          console.log(
            "Subscription created but userId missing from metadata:",
            subscription.id
          );

          return res.json({
            received: true,
          });
        }

        await saveSubscription(
          subscription,
          userId,
          plan
        );

        console.log(
          `Subscription activated successfully for user: ${userId}`
        );

        return res.json({
          received: true,
        });
      }

      // ===================================================
      // CUSTOMER SUBSCRIPTION UPDATED
      // ===================================================

      if (
        event.type ===
        "customer.subscription.updated"
      ) {
        const subscription =
          event.data.object;

        const stripeSubscriptionId =
          subscription.id;

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

          return res.json({
            received: true,
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

        await updateSubscription(
          subscription,
          localSubscription.user_id
        );

        console.log(
          `Subscription updated: ${stripeSubscriptionId}`
        );

        return res.json({
          received: true,
        });
      }

      // ===================================================
      // CUSTOMER SUBSCRIPTION DELETED
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

          return res.json({
            received: true,
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
        // Update subscription
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

          return res.json({
            received: true,
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
        } else {
          console.log(
            `Subscription ${stripeSubscriptionId} cancelled`
          );
        }

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

      /*
        The webhook signature was valid.
        Returning 500 tells Stripe to retry.
      */

      return res.status(500).json({
        message:
          "Webhook processing failed",
      });
    }
  }
);

// =========================================================
// SAVE SUBSCRIPTION
// =========================================================

async function saveSubscription(
  subscription,
  userId,
  metadataPlan = null
) {
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
    metadataPlan ||
    (
      price?.id ===
      process.env.STRIPE_YEARLY_PRICE_ID
        ? "Yearly"
        : "Monthly"
    );

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
      : new Date().toISOString();

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

  // =======================================================
  // FIND EXISTING SUBSCRIPTION
  // =======================================================

  const {
    data: existingSubscription,
    error: findError,
  } = await supabase
    .from("subscriptions")
    .select("id")
    .eq(
      "stripe_subscription_id",
      subscription.id
    )
    .maybeSingle();

  if (findError) {
    console.error(
      "Find subscription error:",
      findError
    );

    throw findError;
  }

  // =======================================================
  // UPDATE EXISTING
  // =======================================================

  if (existingSubscription) {
    const { error } =
      await supabase
        .from("subscriptions")
        .update({
          user_id: userId,
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
          existingSubscription.id
        );

    if (error) {
      console.error(
        "Update subscription error:",
        error
      );

      throw error;
    }
  }

  // =======================================================
  // CREATE NEW
  // =======================================================

  else {
    const { error } =
      await supabase
        .from("subscriptions")
        .insert({
          user_id: userId,
          plan,
          status,
          amount,
          currency,
          start_date: startDate,
          end_date: endDate,
          stripe_customer_id:
            subscription.customer || null,
          stripe_subscription_id:
            subscription.id,
          stripe_price_id:
            price?.id || null,
        });

    if (error) {
      console.error(
        "Create subscription error:",
        error
      );

      throw error;
    }
  }

  // =======================================================
  // UPDATE USER
  // =======================================================

  const { error: userError } =
    await supabase
      .from("users")
      .update({
        subscription_status:
          status,

        subscription_plan:
          plan,

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
        userId
      );

  if (userError) {
    console.error(
      "Update user subscription error:",
      userError
    );

    throw userError;
  }
}

// =========================================================
// UPDATE SUBSCRIPTION
// =========================================================

async function updateSubscription(
  subscription,
  userId
) {
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

  // =======================================================
  // UPDATE SUBSCRIPTION
  // =======================================================

  const {
    data: localSubscription,
    error: findError,
  } = await supabase
    .from("subscriptions")
    .select("id")
    .eq(
      "stripe_subscription_id",
      subscription.id
    )
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (!localSubscription) {
    console.log(
      "Local subscription not found:",
      subscription.id
    );

    return;
  }

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
      .eq(
        "id",
        localSubscription.id
      );

  if (subscriptionError) {
    throw subscriptionError;
  }

  // =======================================================
  // UPDATE USER
  // =======================================================

  const { error: userError } =
    await supabase
      .from("users")
      .update({
        subscription_status:
          status,

        subscription_plan:
          plan,

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
        userId
      );

  if (userError) {
    throw userError;
  }
}

module.exports = router;