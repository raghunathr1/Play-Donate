
const express = require("express");
const Stripe = require("stripe");

const User = require("../models/User");
const Subscription = require("../models/Subscription");
const Donation = require("../models/Donation");

const router = express.Router();

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

// ======================================================
// STRIPE WEBHOOK
// POST /api/subscriptions/webhook
// ======================================================

router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature =
      req.headers["stripe-signature"];

    let event;

    // ==================================================
    // VERIFY STRIPE WEBHOOK
    // ==================================================

    try {
      event =
        stripe.webhooks.constructEvent(
          req.body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (error) {
      console.error(
        "Webhook Signature Error:",
        error.message
      );

      return res
        .status(400)
        .send(
          `Webhook Error: ${error.message}`
        );
    }

    // ==================================================
    // PROCESS STRIPE EVENT
    // ==================================================

    try {
      switch (event.type) {
        // ==================================================
        // CHECKOUT SESSION COMPLETED
        // Handles:
        // 1. Subscription checkout
        // 2. One-time donation checkout
        // ==================================================

        case "checkout.session.completed": {
          const session =
            event.data.object;

          // ==================================================
          // DONATION CHECKOUT
          // ==================================================

          if (
            session.mode === "payment"
          ) {
            const donationId =
              session.metadata?.donationId;

            if (!donationId) {
              console.log(
                "Donation webhook: Missing donationId"
              );

              break;
            }

            const donation =
              await Donation.findById(
                donationId
              );

            if (!donation) {
              console.log(
                "Donation not found:",
                donationId
              );

              break;
            }

            // Save successful payment information
            donation.status = "Paid";

            donation.stripeCheckoutSessionId =
              session.id;

            if (
              session.payment_intent
            ) {
              donation.stripePaymentIntentId =
                session.payment_intent;
            }

            await donation.save();

            console.log(
              "Donation Paid:",
              donation._id
            );

            break;
          }

          // ==================================================
          // SUBSCRIPTION CHECKOUT
          // ==================================================

          if (
            session.mode !==
            "subscription"
          ) {
            break;
          }

          // ----------------------------------------------
          // Get metadata
          // ----------------------------------------------

          const userId =
            session.metadata?.userId;

          const plan =
            session.metadata?.plan;

          if (
            !userId ||
            !session.subscription
          ) {
            console.log(
              "Webhook: Missing userId or subscription ID"
            );

            break;
          }

          // ----------------------------------------------
          // Retrieve Stripe Subscription
          // ----------------------------------------------

          const stripeSubscription =
            await stripe.subscriptions.retrieve(
              session.subscription
            );

          // ----------------------------------------------
          // Stripe Price
          // ----------------------------------------------

          const price =
            stripeSubscription
              .items
              .data[0]
              ?.price;

          const priceId =
            price?.id || null;

          // ----------------------------------------------
          // Amount
          // ----------------------------------------------

          const amount =
            price?.unit_amount
              ? price.unit_amount / 100
              : 0;

          // ----------------------------------------------
          // Currency
          // ----------------------------------------------

          const currency =
            price?.currency
              ?.toUpperCase() || "INR";

          // ----------------------------------------------
          // Subscription Status
          // ----------------------------------------------

          let subscriptionStatus =
            "Lapsed";

          if (
            stripeSubscription.status ===
              "active" ||
            stripeSubscription.status ===
              "trialing"
          ) {
            subscriptionStatus =
              "Active";
          } else if (
            stripeSubscription.status ===
            "canceled"
          ) {
            subscriptionStatus =
              "Cancelled";
          }

          // ----------------------------------------------
          // Start Date
          // ----------------------------------------------

          const startDate =
            stripeSubscription
              .current_period_start
              ? new Date(
                  stripeSubscription
                    .current_period_start * 1000
                )
              : new Date();

          // ----------------------------------------------
          // End Date
          // ----------------------------------------------

          const endDate =
            stripeSubscription
              .current_period_end
              ? new Date(
                  stripeSubscription
                    .current_period_end * 1000
                )
              : null;

          // ----------------------------------------------
          // Save Subscription
          // ----------------------------------------------

          const subscription =
            await Subscription.findOneAndUpdate(
              {
                stripeSubscriptionId:
                  stripeSubscription.id,
              },
              {
                user: userId,

                plan:
                  plan || "Monthly",

                status:
                  subscriptionStatus,

                amount,

                currency,

                startDate,

                endDate,

                stripeCustomerId:
                  stripeSubscription.customer,

                stripeSubscriptionId:
                  stripeSubscription.id,

                stripePriceId:
                  priceId,

                stripeCheckoutSessionId:
                  session.id,
              },
              {
                new: true,
                upsert: true,
              }
            );

          // ----------------------------------------------
          // Update User
          // ----------------------------------------------

          await User.findByIdAndUpdate(
            userId,
            {
              subscriptionStatus:
                subscriptionStatus,

              subscriptionPlan:
                plan || "Monthly",

              subscriptionStartDate:
                startDate,

              subscriptionEndDate:
                endDate,

              stripeCustomerId:
                stripeSubscription.customer,

              stripeSubscriptionId:
                stripeSubscription.id,

              stripePriceId:
                priceId,
            }
          );

          console.log(
            "Subscription Activated:",
            subscription._id
          );

          break;
        }

        // ==================================================
        // CUSTOMER SUBSCRIPTION UPDATED
        // ==================================================

        case "customer.subscription.updated": {
          const stripeSubscription =
            event.data.object;

          const subscription =
            await Subscription.findOne({
              stripeSubscriptionId:
                stripeSubscription.id,
            });

          if (!subscription) {
            console.log(
              "Subscription not found:",
              stripeSubscription.id
            );

            break;
          }

          // ----------------------------------------------
          // Determine status
          // ----------------------------------------------

          let status =
            "Lapsed";

          if (
            stripeSubscription.status ===
              "active" ||
            stripeSubscription.status ===
              "trialing"
          ) {
            status =
              "Active";
          } else if (
            stripeSubscription.status ===
            "canceled"
          ) {
            status =
              "Cancelled";
          }

          // ----------------------------------------------
          // Stripe Price
          // ----------------------------------------------

          const price =
            stripeSubscription
              .items
              .data[0]
              ?.price;

          const priceId =
            price?.id || null;

          // ----------------------------------------------
          // Dates
          // ----------------------------------------------

          const startDate =
            stripeSubscription
              .current_period_start
              ? new Date(
                  stripeSubscription
                    .current_period_start * 1000
                )
              : null;

          const endDate =
            stripeSubscription
              .current_period_end
              ? new Date(
                  stripeSubscription
                    .current_period_end * 1000
                )
              : null;

          // ----------------------------------------------
          // Update local subscription
          // ----------------------------------------------

          subscription.status =
            status;

          subscription.stripePriceId =
            priceId;

          subscription.startDate =
            startDate;

          subscription.endDate =
            endDate;

          await subscription.save();

          // ----------------------------------------------
          // Update User
          // ----------------------------------------------

          await User.findByIdAndUpdate(
            subscription.user,
            {
              subscriptionStatus:
                status,

              subscriptionStartDate:
                startDate,

              subscriptionEndDate:
                endDate,

              stripePriceId:
                priceId,
            }
          );

          console.log(
            "Subscription Updated:",
            stripeSubscription.id
          );

          break;
        }

        // ==================================================
        // CUSTOMER SUBSCRIPTION DELETED
        // ==================================================

        case "customer.subscription.deleted": {
          const stripeSubscription =
            event.data.object;

          // ----------------------------------------------
          // Update Subscription
          // ----------------------------------------------

          const subscription =
            await Subscription.findOneAndUpdate(
              {
                stripeSubscriptionId:
                  stripeSubscription.id,
              },
              {
                status:
                  "Cancelled",

                endDate:
                  stripeSubscription
                    .current_period_end
                    ? new Date(
                        stripeSubscription
                          .current_period_end * 1000
                      )
                    : new Date(),
              },
              {
                new: true,
              }
            );

          // ----------------------------------------------
          // Update User
          // ----------------------------------------------

          if (subscription) {
            await User.findByIdAndUpdate(
              subscription.user,
              {
                subscriptionStatus:
                  "Cancelled",

                subscriptionEndDate:
                  stripeSubscription
                    .current_period_end
                    ? new Date(
                        stripeSubscription
                          .current_period_end * 1000
                      )
                    : new Date(),
              }
            );
          }

          console.log(
            "Subscription Cancelled:",
            stripeSubscription.id
          );

          break;
        }

        // ==================================================
        // DEFAULT
        // ==================================================

        default: {
          console.log(
            `Unhandled Stripe event: ${event.type}`
          );

          break;
        }
      }

      // ==================================================
      // STRIPE WEBHOOK SUCCESS
      // ==================================================

      return res
        .status(200)
        .json({
          received: true,
        });
    } catch (error) {
      console.error(
        "Webhook Processing Error:",
        error.message
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

module.exports = router;
