const express = require("express");
const router = express.Router();

const Stripe = require("stripe");
const supabase = require("../config/supabase");

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

// =========================================================
// STRIPE WEBHOOK
// IMPORTANT:
// server.js mein ye route express.json() se PEHLE
// mount hona chahiye.
// =========================================================

router.post(
  "/",
  express.raw({
    type: "application/json",
  }),
  async (req, res) => {
    const signature =
      req.headers["stripe-signature"];

    let event;

    // =====================================================
    // VERIFY STRIPE WEBHOOK
    // =====================================================

    try {
      event =
        stripe.webhooks.constructEvent(
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

    // =====================================================
    // PROCESS EVENT
    // =====================================================

    try {
      switch (event.type) {
        // =================================================
        // CHECKOUT SESSION COMPLETED
        // =================================================

        case "checkout.session.completed": {
          const session =
            event.data.object;

          console.log(
            "Checkout completed:",
            session.id
          );

          // =================================================
          // DONATION PAYMENT
          // =================================================

          if (
            session.mode === "payment"
          ) {
            const donationId =
              session.metadata?.donationId;

            if (!donationId) {
              console.log(
                "Donation ID not found in metadata"
              );

              break;
            }

            const donationStatus =
              session.payment_status ===
              "paid"
                ? "Paid"
                : "Pending";

            const { error } =
              await supabase
                .from("donations")
                .update({
                  status:
                    donationStatus,

                  stripe_payment_intent_id:
                    session.payment_intent ||
                    null,
                })
                .eq(
                  "id",
                  donationId
                );

            if (error) {
              console.error(
                "Donation webhook update error:",
                error
              );
            } else {
              console.log(
                `Donation ${donationId} updated: ${donationStatus}`
              );
            }

            break;
          }

          // =================================================
          // SUBSCRIPTION CHECKOUT
          // =================================================

          if (
            session.mode ===
            "subscription"
          ) {
            const userId =
              session.metadata?.userId;

            const plan =
              session.metadata?.plan ||
              null;

            // -------------------------------------------------
            // GET STRIPE SUBSCRIPTION ID
            // -------------------------------------------------

            const stripeSubscriptionId =
              session.subscription ||
              null;

            if (!userId) {
              console.error(
                "Subscription user ID missing from metadata"
              );

              break;
            }

            if (
              !stripeSubscriptionId
            ) {
              console.log(
                "Stripe subscription ID missing in checkout session."
              );

              console.log(
                "Waiting for customer.subscription.created event."
              );

              break;
            }

            // -------------------------------------------------
            // RETRIEVE STRIPE SUBSCRIPTION
            // -------------------------------------------------

            const stripeSubscription =
              await stripe.subscriptions.retrieve(
                stripeSubscriptionId
              );

            // -------------------------------------------------
            // SAVE SUBSCRIPTION
            // -------------------------------------------------

            await saveSubscription(
              stripeSubscription,
              userId,
              plan,
              session.id
            );

            break;
          }

          break;
        }

        // =================================================
        // SUBSCRIPTION CREATED
        // =================================================

        case "customer.subscription.created": {
          const subscription =
            event.data.object;

          console.log(
            "Subscription created:",
            subscription.id
          );

          // -------------------------------------------------
          // FIND USER FROM SUBSCRIPTION METADATA
          // -------------------------------------------------

          let userId =
            subscription.metadata
              ?.userId || null;

          let plan =
            subscription.metadata
              ?.plan || null;

          // -------------------------------------------------
          // METADATA FOUND
          // -------------------------------------------------

          if (userId) {
            await saveSubscription(
              subscription,
              userId,
              plan,
              null
            );

            console.log(
              `Subscription activated successfully for user: ${userId}`
            );

            break;
          }

          // -------------------------------------------------
          // METADATA MISSING
          // TRY CUSTOMER METADATA
          // -------------------------------------------------

          const customerId =
            subscription.customer;

          if (customerId) {
            try {
              const customer =
                await stripe.customers.retrieve(
                  customerId
                );

              if (
                customer &&
                !customer.deleted
              ) {
                userId =
                  customer.metadata
                    ?.userId || null;

                plan =
                  customer.metadata
                    ?.plan || null;
              }
            } catch (
              customerError
            ) {
              console.error(
                "Stripe customer lookup error:",
                customerError.message
              );
            }
          }

          if (!userId) {
            console.log(
              "User ID not found for subscription:",
              subscription.id
            );

            break;
          }

          await saveSubscription(
            subscription,
            userId,
            plan,
            null
          );

          console.log(
            `Subscription activated successfully for user: ${userId}`
          );

          break;
        }

        // =================================================
        // SUBSCRIPTION UPDATED
        // =================================================

        case "customer.subscription.updated": {
          const subscription =
            event.data.object;

          console.log(
            "Subscription updated:",
            subscription.id
          );

          const stripeSubscriptionId =
            subscription.id;

          // -------------------------------------------------
          // FIND LOCAL SUBSCRIPTION
          // -------------------------------------------------

          const {
            data: localSubscription,
            error: findError,
          } = await supabase
            .from("subscriptions")
            .select(
              "id, user_id"
            )
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

          // -------------------------------------------------
          // IF NOT FOUND, USE METADATA
          // -------------------------------------------------

          if (!localSubscription) {
            const userId =
              subscription.metadata
                ?.userId;

            if (!userId) {
              console.log(
                "Local subscription not found and user ID missing:",
                stripeSubscriptionId
              );

              break;
            }

            await saveSubscription(
              subscription,
              userId,
              subscription.metadata
                ?.plan || null,
              null
            );

            break;
          }

          // -------------------------------------------------
          // PREPARE SUBSCRIPTION DATA
          // -------------------------------------------------

          const subscriptionData =
            getSubscriptionData(
              subscription
            );

          // -------------------------------------------------
          // UPDATE SUBSCRIPTIONS TABLE
          // -------------------------------------------------

          const {
            error:
              subscriptionError,
          } = await supabase
            .from("subscriptions")
            .update({
              plan:
                subscriptionData.plan,

              status:
                subscriptionData.status,

              amount:
                subscriptionData.amount,

              currency:
                subscriptionData.currency,

              start_date:
                subscriptionData.startDate,

              end_date:
                subscriptionData.endDate,

              stripe_customer_id:
                subscriptionData.customerId,

              stripe_price_id:
                subscriptionData.priceId,
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

            break;
          }

          // -------------------------------------------------
          // UPDATE USER
          // -------------------------------------------------

          const {
            error: userError,
          } = await supabase
            .from("users")
            .update({
              subscription_status:
                subscriptionData.status,

              subscription_plan:
                subscriptionData.plan,

              subscription_start_date:
                subscriptionData.startDate,

              subscription_end_date:
                subscriptionData.endDate,

              stripe_customer_id:
                subscriptionData.customerId,

              stripe_subscription_id:
                subscription.id,

              stripe_price_id:
                subscriptionData.priceId,
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

        // =================================================
        // SUBSCRIPTION DELETED / CANCELLED
        // =================================================

        case "customer.subscription.deleted": {
          const subscription =
            event.data.object;

          console.log(
            "Subscription cancelled:",
            subscription.id
          );

          const stripeSubscriptionId =
            subscription.id;

          // -------------------------------------------------
          // GET SUBSCRIPTION ITEM
          // -------------------------------------------------

          const subscriptionItem =
            subscription.items
              ?.data?.[0];

          // -------------------------------------------------
          // DETERMINE END DATE
          //
          // For newer Stripe API versions,
          // billing-period dates are on Subscription Item.
          // -------------------------------------------------

          const endTimestamp =
            subscription.ended_at ||
            subscription.cancel_at ||
            subscriptionItem
              ?.current_period_end ||
            subscription.current_period_end ||
            null;

          const endDate =
            endTimestamp
              ? new Date(
                  endTimestamp *
                    1000
                ).toISOString()
              : new Date().toISOString();

          // -------------------------------------------------
          // FIND LOCAL SUBSCRIPTION
          // -------------------------------------------------

          const {
            data: localSubscription,
            error: findError,
          } = await supabase
            .from("subscriptions")
            .select(
              "id, user_id"
            )
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

          // -------------------------------------------------
          // UPDATE SUBSCRIPTION
          // -------------------------------------------------

          const {
            error:
              subscriptionError,
          } = await supabase
            .from("subscriptions")
            .update({
              status:
                "Cancelled",

              end_date:
                endDate,
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

            break;
          }

          // -------------------------------------------------
          // UPDATE USER
          // -------------------------------------------------

          const {
            error: userError,
          } = await supabase
            .from("users")
            .update({
              subscription_status:
                "Cancelled",

              subscription_end_date:
                endDate,

              stripe_subscription_id:
                null,

              stripe_price_id:
                null,
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

        // =================================================
        // INVOICE PAYMENT SUCCEEDED
        // =================================================

        case "invoice.payment_succeeded": {
          const invoice =
            event.data.object;

          console.log(
            "Invoice payment succeeded:",
            invoice.id
          );

          break;
        }

        // =================================================
        // INVOICE PAID
        // =================================================

        case "invoice.paid": {
          const invoice =
            event.data.object;

          console.log(
            "Invoice paid:",
            invoice.id
          );

          break;
        }

        // =================================================
        // PAYMENT INTENT SUCCEEDED
        // =================================================

        case "payment_intent.succeeded": {
          const paymentIntent =
            event.data.object;

          console.log(
            "Payment intent succeeded:",
            paymentIntent.id
          );

          break;
        }

        // =================================================
        // CHARGE SUCCEEDED
        // =================================================

        case "charge.succeeded": {
          const charge =
            event.data.object;

          console.log(
            "Charge succeeded:",
            charge.id
          );

          break;
        }

        // =================================================
        // DEFAULT
        // =================================================

        default: {
          console.log(
            `Unhandled Stripe event: ${event.type}`
          );

          break;
        }
      }

      // ===================================================
      // ALWAYS RETURN 200 FOR VALID STRIPE EVENT
      // ===================================================

      return res
        .status(200)
        .json({
          received: true,
        });
    } catch (error) {
      console.error(
        "Webhook processing error:",
        error
      );

      return res
        .status(500)
        .json({
          message:
            "Webhook processing failed",
        });
    }
  }
);

// =========================================================
// HELPER - GET SUBSCRIPTION DATA
// =========================================================

function getSubscriptionData(
  subscription
) {
  // -------------------------------------------------------
  // STRIPE SUBSCRIPTION ITEM
  // -------------------------------------------------------

  const subscriptionItem =
    subscription.items
      ?.data?.[0];

  // -------------------------------------------------------
  // STRIPE PRICE
  // -------------------------------------------------------

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

  // -------------------------------------------------------
  // PLAN
  // -------------------------------------------------------

  const plan =
    price?.id ===
    process.env.STRIPE_YEARLY_PRICE_ID
      ? "Yearly"
      : "Monthly";

  // -------------------------------------------------------
  // STATUS
  // -------------------------------------------------------

  let status = "Lapsed";

  if (
    subscription.status ===
      "active" ||
    subscription.status ===
      "trialing"
  ) {
    status = "Active";
  } else if (
    subscription.status ===
    "canceled"
  ) {
    status = "Cancelled";
  }

  // -------------------------------------------------------
  // CURRENT PERIOD START
  //
  // New Stripe API versions:
  // subscription.items.data[0].current_period_start
  // -------------------------------------------------------

  const currentPeriodStart =
    subscriptionItem
      ?.current_period_start ||
    subscription.current_period_start ||
    subscription.start_date ||
    subscription.created ||
    null;

  // -------------------------------------------------------
  // CURRENT PERIOD END
  //
  // New Stripe API versions:
  // subscription.items.data[0].current_period_end
  // -------------------------------------------------------

  let currentPeriodEnd =
    subscriptionItem
      ?.current_period_end ||
    subscription.current_period_end ||
    null;

  // -------------------------------------------------------
  // FOR CANCELLED SUBSCRIPTION
  // -------------------------------------------------------

  if (
    subscription.status ===
    "canceled"
  ) {
    currentPeriodEnd =
      subscription.ended_at ||
      subscription.cancel_at ||
      currentPeriodEnd;
  }

  // -------------------------------------------------------
  // START DATE
  // -------------------------------------------------------

  const startDate =
    currentPeriodStart
      ? new Date(
          currentPeriodStart *
            1000
        ).toISOString()
      : new Date().toISOString();

  // -------------------------------------------------------
  // END DATE
  // -------------------------------------------------------

  const endDate =
    currentPeriodEnd
      ? new Date(
          currentPeriodEnd *
            1000
        ).toISOString()
      : null;

  // -------------------------------------------------------
  // RETURN
  // -------------------------------------------------------

  return {
    plan,

    status,

    amount,

    currency,

    startDate,

    endDate,

    customerId:
      subscription.customer ||
      null,

    priceId:
      price?.id ||
      null,
  };
}

// =========================================================
// HELPER - SAVE SUBSCRIPTION
// =========================================================

async function saveSubscription(
  subscription,
  userId,
  metadataPlan = null,
  checkoutSessionId = null
) {
  const stripeSubscriptionId =
    subscription.id;

  // -------------------------------------------------------
  // PREPARE DATA
  // -------------------------------------------------------

  const subscriptionData =
    getSubscriptionData(
      subscription
    );

  // -------------------------------------------------------
  // PLAN FROM METADATA OR PRICE
  // -------------------------------------------------------

  const plan =
    metadataPlan ||
    subscriptionData.plan;

  // -------------------------------------------------------
  // CHECK EXISTING SUBSCRIPTION
  // -------------------------------------------------------

  const {
    data: existingSubscription,
    error: findError,
  } = await supabase
    .from("subscriptions")
    .select(
      "id, stripe_checkout_session_id"
    )
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

    return;
  }

  let subscriptionError =
    null;

  // -------------------------------------------------------
  // UPDATE EXISTING SUBSCRIPTION
  // -------------------------------------------------------

  if (existingSubscription) {
    const updateData = {
      user_id:
        userId,

      plan,

      status:
        subscriptionData.status,

      amount:
        subscriptionData.amount,

      currency:
        subscriptionData.currency,

      start_date:
        subscriptionData.startDate,

      end_date:
        subscriptionData.endDate,

      stripe_customer_id:
        subscriptionData.customerId,

      stripe_price_id:
        subscriptionData.priceId,
    };

    // Do not overwrite existing checkout
    // session ID with null.
    if (checkoutSessionId) {
      updateData.stripe_checkout_session_id =
        checkoutSessionId;
    }

    const {
      error,
    } = await supabase
      .from("subscriptions")
      .update(
        updateData
      )
      .eq(
        "id",
        existingSubscription.id
      );

    subscriptionError =
      error;
  }

  // -------------------------------------------------------
  // INSERT NEW SUBSCRIPTION
  // -------------------------------------------------------

  else {
    const {
      error,
    } = await supabase
      .from("subscriptions")
      .insert({
        user_id:
          userId,

        plan,

        status:
          subscriptionData.status,

        amount:
          subscriptionData.amount,

        currency:
          subscriptionData.currency,

        start_date:
          subscriptionData.startDate,

        end_date:
          subscriptionData.endDate,

        stripe_customer_id:
          subscriptionData.customerId,

        stripe_subscription_id:
          stripeSubscriptionId,

        stripe_price_id:
          subscriptionData.priceId,

        stripe_checkout_session_id:
          checkoutSessionId ||
          null,
      });

    subscriptionError =
      error;
  }

  // -------------------------------------------------------
  // CHECK SAVE ERROR
  // -------------------------------------------------------

  if (subscriptionError) {
    console.error(
      "Save subscription error:",
      subscriptionError
    );

    return;
  }

  // -------------------------------------------------------
  // UPDATE USER
  // -------------------------------------------------------

  const {
    error: userError,
  } = await supabase
    .from("users")
    .update({
      subscription_status:
        subscriptionData.status,

      subscription_plan:
        plan,

      subscription_start_date:
        subscriptionData.startDate,

      subscription_end_date:
        subscriptionData.endDate,

      stripe_customer_id:
        subscriptionData.customerId,

      stripe_subscription_id:
        stripeSubscriptionId,

      stripe_price_id:
        subscriptionData.priceId,
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

    return;
  }

  console.log(
    `Subscription saved successfully for user: ${userId}`
  );
}

// =========================================================
// EXPORT
// =========================================================

module.exports = router;