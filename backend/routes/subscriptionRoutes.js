const express = require("express");
const router = express.Router();
const Stripe = require("stripe");

const authMiddleware = require("../middleware/authMiddleware");
const supabase = require("../config/supabase");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// =====================================================
// GET - CURRENT USER SUBSCRIPTION
// =====================================================

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "Get subscription error:",
        error
      );

      return res.status(500).json({
        message: "Failed to fetch subscription",
      });
    }

    // No subscription yet
    if (!subscription) {
      return res.json({
        subscription: null,
      });
    }

    // Convert Supabase snake_case → frontend camelCase
    return res.json({
      subscription: {
        id: subscription.id,

        userId: subscription.user_id,

        plan: subscription.plan,

        status: subscription.status,

        amount: subscription.amount,

        currency: subscription.currency,

        startDate: subscription.start_date,

        endDate: subscription.end_date,

        stripeCustomerId:
          subscription.stripe_customer_id,

        stripeSubscriptionId:
          subscription.stripe_subscription_id,

        stripePriceId:
          subscription.stripe_price_id,

        createdAt:
          subscription.created_at,

        updatedAt:
          subscription.updated_at,
      },
    });
  } catch (error) {
    console.error(
      "Get subscription error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// POST - CREATE STRIPE SUBSCRIPTION CHECKOUT
// =====================================================

router.post(
  "/create-checkout",
  authMiddleware,
  async (req, res) => {
    try {
      const { plan } = req.body;

      // -------------------------------------------------
      // VALIDATE PLAN
      // -------------------------------------------------

      if (
        !["Monthly", "Yearly"].includes(plan)
      ) {
        return res.status(400).json({
          message:
            "Invalid subscription plan",
        });
      }

      // -------------------------------------------------
      // GET CURRENT USER
      // -------------------------------------------------

      const {
        data: currentUser,
        error: userError,
      } = await supabase
        .from("users")
        .select(
          `
          id,
          name,
          email,
          subscription_status,
          subscription_plan
          `
        )
        .eq("id", req.user.id)
        .maybeSingle();

      if (userError) {
        console.error(
          "Get user subscription error:",
          userError
        );

        return res.status(500).json({
          message:
            "Failed to fetch user subscription",
        });
      }

      if (!currentUser) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      // -------------------------------------------------
      // PREVENT DUPLICATE ACTIVE SUBSCRIPTION
      // -------------------------------------------------

      if (
        currentUser.subscription_status ===
        "Active"
      ) {
        return res.status(400).json({
          message:
            "You already have an active subscription",
        });
      }

      // -------------------------------------------------
      // SELECT STRIPE PRICE
      // -------------------------------------------------

      const priceId =
        plan === "Monthly"
          ? process.env
              .STRIPE_MONTHLY_PRICE_ID
          : process.env
              .STRIPE_YEARLY_PRICE_ID;

      if (!priceId) {
        return res.status(500).json({
          message:
            "Stripe price ID is not configured",
        });
      }

      // -------------------------------------------------
      // CREATE CHECKOUT SESSION
      // -------------------------------------------------

      const session =
        await stripe.checkout.sessions.create(
          {
            mode: "subscription",

            line_items: [
              {
                price: priceId,
                quantity: 1,
              },
            ],

            customer_email:
              currentUser.email,

            metadata: {
              userId: currentUser.id,
              plan: plan,
            },

            subscription_data: {
              metadata: {
                userId: currentUser.id,
                plan: plan,
              },
            },

            success_url:
              `${process.env.FRONTEND_URL}` +
              `/subscription?success=true`,

            cancel_url:
              `${process.env.FRONTEND_URL}` +
              `/subscription?cancelled=true`,
          }
        );

      return res.json({
        message:
          "Subscription checkout created successfully",

        sessionId: session.id,

        checkoutUrl: session.url,
      });
    } catch (error) {
      console.error(
        "Create subscription checkout error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to create subscription checkout",
      });
    }
  }
);

// =====================================================
// PUT - CANCEL SUBSCRIPTION
// =====================================================

router.put(
  "/cancel",
  authMiddleware,
  async (req, res) => {
    try {
      // -------------------------------------------------
      // GET USER SUBSCRIPTION
      // -------------------------------------------------

      const {
        data: user,
        error: userError,
      } = await supabase
        .from("users")
        .select(
          `
          id,
          name,
          email,
          subscription_status,
          subscription_plan,
          subscription_start_date,
          subscription_end_date,
          stripe_subscription_id
          `
        )
        .eq("id", req.user.id)
        .maybeSingle();

      if (userError) {
        console.error(
          "Get user for cancellation error:",
          userError
        );

        return res.status(500).json({
          message:
            "Failed to fetch subscription",
        });
      }

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      // -------------------------------------------------
      // CHECK ACTIVE STATUS
      // -------------------------------------------------

      if (
        user.subscription_status !==
        "Active"
      ) {
        return res.status(400).json({
          message:
            "No active subscription found",
        });
      }

      // -------------------------------------------------
      // CHECK STRIPE SUBSCRIPTION ID
      // -------------------------------------------------

      if (
        !user.stripe_subscription_id
      ) {
        return res.status(400).json({
          message:
            "Stripe subscription ID not found",
        });
      }

      // -------------------------------------------------
      // CANCEL STRIPE SUBSCRIPTION
      // -------------------------------------------------

      const stripeSubscription =
        await stripe.subscriptions.cancel(
          user.stripe_subscription_id
        );

      // -------------------------------------------------
      // END DATE
      // -------------------------------------------------

      const endDate =
        stripeSubscription.ended_at
          ? new Date(
              stripeSubscription.ended_at *
                1000
            ).toISOString()
          : new Date().toISOString();

      // -------------------------------------------------
      // UPDATE LOCAL SUBSCRIPTION
      // -------------------------------------------------

      const {
        data: subscription,
        error: subscriptionError,
      } = await supabase
        .from("subscriptions")
        .update({
          status: "Cancelled",
          end_date: endDate,
        })
        .eq(
          "user_id",
          req.user.id
        )
        .eq(
          "stripe_subscription_id",
          user.stripe_subscription_id
        )
        .select("*")
        .maybeSingle();

      if (subscriptionError) {
        console.error(
          "Update local subscription error:",
          subscriptionError
        );

        return res.status(500).json({
          message:
            "Stripe subscription cancelled but local subscription update failed",
        });
      }

      // -------------------------------------------------
      // UPDATE USER
      // -------------------------------------------------

      const {
        data: updatedUser,
        error: updateUserError,
      } = await supabase
        .from("users")
        .update({
          subscription_status:
            "Cancelled",

          subscription_end_date:
            endDate,
        })
        .eq("id", req.user.id)
        .select(
          `
          id,
          name,
          email,
          subscription_status,
          subscription_plan,
          subscription_start_date,
          subscription_end_date,
          stripe_subscription_id
          `
        )
        .single();

      if (updateUserError) {
        console.error(
          "Update user subscription error:",
          updateUserError
        );

        return res.status(500).json({
          message:
            "Subscription cancelled but user status update failed",
        });
      }

      // -------------------------------------------------
      // RESPONSE
      // -------------------------------------------------

      return res.json({
        message:
          "Subscription cancelled successfully",

        subscription: subscription
          ? {
              id: subscription.id,
              userId:
                subscription.user_id,
              plan: subscription.plan,
              status:
                subscription.status,
              amount:
                subscription.amount,
              currency:
                subscription.currency,
              startDate:
                subscription.start_date,
              endDate:
                subscription.end_date,
              stripeCustomerId:
                subscription.stripe_customer_id,
              stripeSubscriptionId:
                subscription.stripe_subscription_id,
              stripePriceId:
                subscription.stripe_price_id,
            }
          : null,

        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,

          subscriptionStatus:
            updatedUser.subscription_status,

          subscriptionPlan:
            updatedUser.subscription_plan,

          subscriptionStartDate:
            updatedUser.subscription_start_date,

          subscriptionEndDate:
            updatedUser.subscription_end_date,

          stripeSubscriptionId:
            updatedUser.stripe_subscription_id,
        },
      });
    } catch (error) {
      console.error(
        "Cancel subscription error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to cancel subscription",
      });
    }
  }
);

// =====================================================
// EXPORT
// =====================================================

module.exports = router;