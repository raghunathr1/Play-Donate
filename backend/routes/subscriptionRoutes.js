const express = require("express");
const Stripe = require("stripe");

const Subscription = require("../models/Subscription");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);


// ======================================================
// GET MY SUBSCRIPTION
// GET /api/subscriptions/me
// ======================================================

router.get(
  "/me",
  authMiddleware,
  async (req, res) => {
    try {
      const subscription =
        await Subscription.findOne({
          user: req.user._id,
        }).sort({
          createdAt: -1,
        });

      res.status(200).json({
        subscription: subscription || null,
      });

    } catch (error) {

      console.error(
        "Get Subscription Error:",
        error.message
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);


// ======================================================
// CREATE STRIPE CHECKOUT SESSION
// POST /api/subscriptions/create-checkout
// ======================================================

router.post(
  "/create-checkout",
  authMiddleware,
  async (req, res) => {
    try {
      const { plan } = req.body;


      // ------------------------------------------
      // Validate plan
      // ------------------------------------------

      if (
        plan !== "Monthly" &&
        plan !== "Yearly"
      ) {
        return res.status(400).json({
          message:
            "Plan must be Monthly or Yearly",
        });
      }


      // ------------------------------------------
      // Get Stripe Price ID
      // ------------------------------------------

      const priceId =
        plan === "Monthly"
          ? process.env.STRIPE_MONTHLY_PRICE_ID
          : process.env.STRIPE_YEARLY_PRICE_ID;


      if (!priceId) {
        return res.status(500).json({
          message:
            "Stripe price ID is not configured",
        });
      }


      // ------------------------------------------
      // Prevent duplicate active subscription
      // ------------------------------------------

      const activeSubscription =
        await Subscription.findOne({
          user: req.user._id,
          status: "Active",
        });

      if (activeSubscription) {
        return res.status(400).json({
          message:
            "You already have an active subscription",
        });
      }


      // ------------------------------------------
      // Create Stripe Checkout Session
      // ------------------------------------------

      const session =
        await stripe.checkout.sessions.create({
          mode: "subscription",

          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],

          customer_email: req.user.email,

          metadata: {
            userId: req.user._id.toString(),
            plan,
          },

          success_url:
            `${process.env.FRONTEND_URL}/subscription?success=true`,

          cancel_url:
            `${process.env.FRONTEND_URL}/subscription?cancelled=true`,
        });


      // ------------------------------------------
      // Response
      // ------------------------------------------

      res.status(200).json({
        message:
          "Checkout session created",

        sessionId: session.id,

        checkoutUrl: session.url,
      });

    } catch (error) {

      console.error(
        "Create Checkout Error:",
        error.message
      );

      res.status(500).json({
        message:
          "Unable to create checkout session",
      });
    }
  }
);


// ======================================================
// CANCEL SUBSCRIPTION
// PUT /api/subscriptions/cancel
// ======================================================

router.put(
  "/cancel",
  authMiddleware,
  async (req, res) => {
    try {

      // ------------------------------------------
      // Find active local subscription
      // ------------------------------------------

      const subscription =
        await Subscription.findOne({
          user: req.user._id,
          status: "Active",
        }).sort({
          createdAt: -1,
        });


      if (!subscription) {
        return res.status(404).json({
          message:
            "Active subscription not found",
        });
      }


      // ------------------------------------------
      // Stripe subscription ID required
      // ------------------------------------------

      if (!subscription.stripeSubscriptionId) {
        return res.status(400).json({
          message:
            "Stripe subscription ID not found",
        });
      }


      // ------------------------------------------
      // Cancel subscription in Stripe
      // ------------------------------------------

      const stripeSubscription =
        await stripe.subscriptions.cancel(
          subscription.stripeSubscriptionId
        );


      // ------------------------------------------
      // Update local database
      // ------------------------------------------

      subscription.status =
        "Cancelled";

      await subscription.save();


      req.user.subscriptionStatus =
        "Cancelled";

      await req.user.save();


      // ------------------------------------------
      // Response
      // ------------------------------------------

      res.status(200).json({

        message:
          "Subscription cancelled successfully",

        subscription,

        stripeStatus:
          stripeSubscription.status,

      });

    } catch (error) {

      console.error(
        "Cancel Subscription Error:",
        error.message
      );

      res.status(500).json({
        message:
          "Unable to cancel subscription",
      });
    }
  }
);


module.exports = router;