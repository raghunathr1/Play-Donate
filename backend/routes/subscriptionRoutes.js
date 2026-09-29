const express = require("express");
const router = express.Router();
const Stripe = require("stripe");

const authMiddleware = require("../middleware/authMiddleware");
const supabase = require("../config/supabase");

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

// =====================================================
// HELPER - MAP SUBSCRIPTION
// =====================================================

const formatSubscription = (subscription) => {
  if (!subscription) {
    return null;
  }

  return {
    id: subscription.id,

    userId:
      subscription.user_id,

    plan:
      subscription.plan,

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

    stripeCheckoutSessionId:
      subscription.stripe_checkout_session_id,

    createdAt:
      subscription.created_at,

    updatedAt:
      subscription.updated_at,
  };
};

// =====================================================
// HELPER - CHECK WHETHER STRIPE SUBSCRIPTION IS MISSING
// =====================================================

const isMissingStripeSubscription = (error) => {
  if (!error) {
    return false;
  }

  if (
    error.code === "resource_missing"
  ) {
    return true;
  }

  if (
    typeof error.message === "string" &&
    error.message
      .toLowerCase()
      .includes("no such subscription")
  ) {
    return true;
  }

  return false;
};

// =====================================================
// HELPER - GET STRIPE PERIOD DATES
// =====================================================
//
// Newer Stripe API versions expose billing-period dates
// on the Subscription Item.
// We keep top-level fields as backward-compatible fallbacks.
// =====================================================

const getStripePeriodDates = (
  stripeSubscription
) => {
  const subscriptionItem =
    stripeSubscription?.items
      ?.data?.[0] || null;

  const currentPeriodStart =
    subscriptionItem
      ?.current_period_start ||
    stripeSubscription
      ?.current_period_start ||
    stripeSubscription
      ?.start_date ||
    stripeSubscription
      ?.created ||
    null;

  const currentPeriodEnd =
    subscriptionItem
      ?.current_period_end ||
    stripeSubscription
      ?.current_period_end ||
    null;

  return {
    subscriptionItem,
    currentPeriodStart,
    currentPeriodEnd,
  };
};

// =====================================================
// GET - CURRENT USER SUBSCRIPTION
// GET /api/subscriptions/me
// =====================================================

router.get(
  "/me",
  authMiddleware,
  async (req, res) => {
    try {
      // -------------------------------------------------
      // GET ALL LOCAL SUBSCRIPTIONS
      // -------------------------------------------------

      const {
        data: subscriptions,
        error,
      } = await supabase
        .from("subscriptions")
        .select("*")
        .eq(
          "user_id",
          req.user.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (error) {
        console.error(
          "Get subscription error:",
          error
        );

        return res.status(500).json({
          message:
            "Failed to fetch subscription",
        });
      }

      if (
        !subscriptions ||
        subscriptions.length === 0
      ) {
        return res.json({
          subscription: null,
        });
      }

      // -------------------------------------------------
      // PREFER NEWEST ACTIVE SUBSCRIPTION
      // -------------------------------------------------

      let subscription =
        subscriptions.find(
          (item) =>
            item.status === "Active"
        );

      // -------------------------------------------------
      // OTHERWISE USE NEWEST RECORD
      // -------------------------------------------------

      if (!subscription) {
        subscription =
          subscriptions[0];
      }

      // -------------------------------------------------
      // SYNC WITH STRIPE
      // -------------------------------------------------
      //
      // This is the important fix.
      //
      // Stripe is the source of truth for the current
      // billing period. We retrieve the real Stripe
      // subscription and update Supabase with its
      // current_period_start/current_period_end.
      // -------------------------------------------------

      if (
        subscription.stripe_subscription_id
      ) {
        try {
          const stripeSubscription =
            await stripe.subscriptions.retrieve(
              subscription.stripe_subscription_id
            );

          const {
            subscriptionItem,
            currentPeriodStart,
            currentPeriodEnd,
          } =
            getStripePeriodDates(
              stripeSubscription
            );

          // -------------------------------------------------
          // DETERMINE START DATE
          // -------------------------------------------------

          const startDate =
            currentPeriodStart
              ? new Date(
                  currentPeriodStart * 1000
                ).toISOString()
              : subscription.start_date ||
                null;

          // -------------------------------------------------
          // DETERMINE END / RENEWAL DATE
          // -------------------------------------------------

          let endDate =
            currentPeriodEnd
              ? new Date(
                  currentPeriodEnd * 1000
                ).toISOString()
              : subscription.end_date ||
                null;

          // If Stripe says the subscription has already
          // been canceled, use ended_at/cancel_at first.
          if (
            stripeSubscription.status ===
            "canceled"
          ) {
            const cancelledTimestamp =
              stripeSubscription.ended_at ||
              stripeSubscription.cancel_at ||
              currentPeriodEnd ||
              null;

            endDate =
              cancelledTimestamp
                ? new Date(
                    cancelledTimestamp * 1000
                  ).toISOString()
                : endDate;
          }

          // -------------------------------------------------
          // UPDATE LOCAL SUBSCRIPTION
          // -------------------------------------------------

          const {
            data: updatedSubscription,
            error:
              updateSubscriptionError,
          } = await supabase
            .from("subscriptions")
            .update({
              start_date:
                startDate,

              end_date:
                endDate,

              stripe_customer_id:
                stripeSubscription.customer ||
                subscription.stripe_customer_id ||
                null,

              stripe_price_id:
                subscriptionItem
                  ?.price?.id ||
                subscription.stripe_price_id ||
                null,
            })
            .eq(
              "id",
              subscription.id
            )
            .select("*")
            .maybeSingle();

          if (
            updateSubscriptionError
          ) {
            console.error(
              "Sync subscription error:",
              updateSubscriptionError
            );
          } else if (
            updatedSubscription
          ) {
            subscription =
              updatedSubscription;
          }

          // -------------------------------------------------
          // UPDATE USER SUBSCRIPTION DATES
          // -------------------------------------------------

          const {
            error:
              updateUserError,
          } = await supabase
            .from("users")
            .update({
              subscription_start_date:
                startDate,

              subscription_end_date:
                endDate,

              stripe_customer_id:
                stripeSubscription.customer ||
                subscription.stripe_customer_id ||
                null,

              stripe_subscription_id:
                stripeSubscription.id,

              stripe_price_id:
                subscriptionItem
                  ?.price?.id ||
                subscription.stripe_price_id ||
                null,
            })
            .eq(
              "id",
              req.user.id
            );

          if (
            updateUserError
          ) {
            console.error(
              "Sync user subscription error:",
              updateUserError
            );
          }

          // -------------------------------------------------
          // DEBUG LOG
          // -------------------------------------------------

          console.log(
            "Subscription synced from Stripe:",
            {
              subscriptionId:
                stripeSubscription.id,

              startDate,

              endDate,

              status:
                stripeSubscription.status,
            }
          );
        } catch (stripeError) {
          // -------------------------------------------------
          // DO NOT BREAK DASHBOARD
          // -------------------------------------------------

          if (
            isMissingStripeSubscription(
              stripeError
            )
          ) {
            console.error(
              "Stripe subscription no longer exists:",
              subscription
                .stripe_subscription_id
            );
          } else {
            console.error(
              "Stripe subscription sync error:",
              stripeError.message
            );
          }
        }
      }

      // -------------------------------------------------
      // RETURN FINAL SUBSCRIPTION
      // -------------------------------------------------

      return res.json({
        subscription:
          formatSubscription(
            subscription
          ),
      });
    } catch (error) {
      console.error(
        "Get subscription error:",
        error
      );

      return res.status(500).json({
        message:
          "Server error",
      });
    }
  }
);

// =====================================================
// POST - CREATE STRIPE SUBSCRIPTION CHECKOUT
// POST /api/subscriptions/create-checkout
// =====================================================

router.post(
  "/create-checkout",
  authMiddleware,
  async (req, res) => {
    try {
      const {
        plan,
      } = req.body;

      // -------------------------------------------------
      // VALIDATE PLAN
      // -------------------------------------------------

      if (
        !["Monthly", "Yearly"].includes(
          plan
        )
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
        .eq(
          "id",
          req.user.id
        )
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
          message:
            "User not found",
        });
      }

      // -------------------------------------------------
      // CHECK USER ACTIVE STATUS
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
      // CHECK SUBSCRIPTIONS TABLE
      // THIS PREVENTS DUPLICATE CHECKOUT
      // -------------------------------------------------

      const {
        data: activeSubscriptions,
        error:
          activeSubscriptionError,
      } = await supabase
        .from("subscriptions")
        .select(
          "id, stripe_subscription_id, status"
        )
        .eq(
          "user_id",
          req.user.id
        )
        .eq(
          "status",
          "Active"
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (
        activeSubscriptionError
      ) {
        console.error(
          "Check active subscriptions error:",
          activeSubscriptionError
        );

        return res.status(500).json({
          message:
            "Failed to check existing subscriptions",
        });
      }

      if (
        activeSubscriptions &&
        activeSubscriptions.length > 0
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
            mode:
              "subscription",

            line_items: [
              {
                price:
                  priceId,

                quantity: 1,
              },
            ],

            customer_email:
              currentUser.email,

            metadata: {
              userId:
                currentUser.id,

              plan:
                plan,
            },

            subscription_data: {
              metadata: {
                userId:
                  currentUser.id,

                plan:
                  plan,
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

        sessionId:
          session.id,

        checkoutUrl:
          session.url,
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
// PUT /api/subscriptions/cancel
// =====================================================

router.put(
  "/cancel",
  authMiddleware,
  async (req, res) => {
    try {
      // -------------------------------------------------
      // GET USER
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
          stripe_customer_id,
          stripe_subscription_id,
          stripe_price_id
          `
        )
        .eq(
          "id",
          req.user.id
        )
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
          message:
            "User not found",
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
      // IMPORTANT:
      // DO NOT TRUST users.stripe_subscription_id
      //
      // We get the real subscription IDs from
      // subscriptions table.
      // -------------------------------------------------

      const {
        data: localSubscriptions,
        error:
          localSubscriptionError,
      } = await supabase
        .from("subscriptions")
        .select("*")
        .eq(
          "user_id",
          req.user.id
        )
        .eq(
          "status",
          "Active"
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (
        localSubscriptionError
      ) {
        console.error(
          "Get active subscriptions error:",
          localSubscriptionError
        );

        return res.status(500).json({
          message:
            "Failed to fetch active subscriptions",
        });
      }

      if (
        !localSubscriptions ||
        localSubscriptions.length === 0
      ) {
        return res.status(400).json({
          message:
            "No active subscription record found",
        });
      }

      // -------------------------------------------------
      // CANCEL ALL ACTIVE LOCAL STRIPE SUBSCRIPTIONS
      //
      // Preserves existing duplicate-cleanup behavior.
      // -------------------------------------------------

      const cancelledSubscriptions = [];

      const staleSubscriptionIds = [];

      for (
        const localSubscription
        of localSubscriptions
      ) {
        const stripeSubscriptionId =
          localSubscription
            .stripe_subscription_id;

        // -----------------------------------------------
        // NO STRIPE ID
        // -----------------------------------------------

        if (!stripeSubscriptionId) {
          const endDate =
            new Date().toISOString();

          const {
            error:
              updateMissingIdError,
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

          if (
            updateMissingIdError
          ) {
            console.error(
              "Update subscription without Stripe ID error:",
              updateMissingIdError
            );

            return res.status(500).json({
              message:
                "Failed to update subscription",
            });
          }

          staleSubscriptionIds.push(
            localSubscription.id
          );

          continue;
        }

        // -----------------------------------------------
        // RETRIEVE STRIPE SUBSCRIPTION
        // -----------------------------------------------

        let stripeSubscription;

        try {
          stripeSubscription =
            await stripe.subscriptions.retrieve(
              stripeSubscriptionId
            );
        } catch (error) {
          // ---------------------------------------------
          // OLD / INVALID STRIPE ID
          // ---------------------------------------------

          if (
            isMissingStripeSubscription(
              error
            )
          ) {
            const endDate =
              new Date().toISOString();

            const {
              error:
                staleUpdateError,
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

            if (
              staleUpdateError
            ) {
              console.error(
                "Cleanup stale subscription error:",
                staleUpdateError
              );

              return res.status(500).json({
                message:
                  "Failed to clean old subscription record",
              });
            }

            staleSubscriptionIds.push(
              localSubscription.id
            );

            continue;
          }

          throw error;
        }

        // -----------------------------------------------
        // CANCEL IF NOT ALREADY CANCELED
        // -----------------------------------------------

        if (
          stripeSubscription.status !==
          "canceled"
        ) {
          stripeSubscription =
            await stripe.subscriptions.cancel(
              stripeSubscriptionId
            );
        }

        // -----------------------------------------------
        // GET STRIPE PERIOD DATES
        // -----------------------------------------------

        const {
          subscriptionItem,
          currentPeriodEnd,
        } =
          getStripePeriodDates(
            stripeSubscription
          );

        // -----------------------------------------------
        // DETERMINE END DATE
        // -----------------------------------------------

        const endTimestamp =
          stripeSubscription.ended_at ||
          stripeSubscription.cancel_at ||
          currentPeriodEnd ||
          null;

        const endDate =
          endTimestamp
            ? new Date(
                endTimestamp * 1000
              ).toISOString()
            : new Date().toISOString();

        // -----------------------------------------------
        // UPDATE LOCAL SUBSCRIPTION
        // -----------------------------------------------

        const {
          data:
            updatedLocalSubscription,
          error:
            updateLocalSubscriptionError,
        } = await supabase
          .from("subscriptions")
          .update({
            status:
              "Cancelled",

            end_date:
              endDate,

            stripe_customer_id:
              stripeSubscription.customer ||
              localSubscription.stripe_customer_id ||
              null,

            stripe_price_id:
              subscriptionItem
                ?.price?.id ||
              localSubscription.stripe_price_id ||
              null,
          })
          .eq(
            "id",
            localSubscription.id
          )
          .select("*")
          .maybeSingle();

        if (
          updateLocalSubscriptionError
        ) {
          console.error(
            "Update local subscription error:",
            updateLocalSubscriptionError
          );

          return res.status(500).json({
            message:
              "Stripe subscription cancelled but local subscription update failed",
          });
        }

        cancelledSubscriptions.push({
          subscription:
            updatedLocalSubscription,

          endDate:
            endDate,
        });
      }

      // -------------------------------------------------
      // FINAL USER END DATE
      // -------------------------------------------------

      let finalEndDate =
        new Date().toISOString();

      if (
        cancelledSubscriptions.length >
        0
      ) {
        finalEndDate =
          cancelledSubscriptions
            .map(
              (item) =>
                new Date(
                  item.endDate
                )
            )
            .sort(
              (a, b) =>
                b.getTime() -
                a.getTime()
            )[0]
            .toISOString();
      }

      // -------------------------------------------------
      // UPDATE USER
      //
      // Remove stale Stripe subscription ID.
      // -------------------------------------------------

      const {
        data: updatedUser,
        error:
          updateUserError,
      } = await supabase
        .from("users")
        .update({
          subscription_status:
            "Cancelled",

          subscription_end_date:
            finalEndDate,

          stripe_subscription_id:
            null,

          stripe_customer_id:
            null,

          stripe_price_id:
            null,
        })
        .eq(
          "id",
          req.user.id
        )
        .select(
          `
          id,
          name,
          email,
          subscription_status,
          subscription_plan,
          subscription_start_date,
          subscription_end_date,
          stripe_customer_id,
          stripe_subscription_id,
          stripe_price_id
          `
        )
        .single();

      if (
        updateUserError
      ) {
        console.error(
          "Update user subscription error:",
          updateUserError
        );

        return res.status(500).json({
          message:
            "Subscriptions cancelled but user status update failed",
        });
      }

      // -------------------------------------------------
      // GET LATEST CANCELLED SUBSCRIPTION
      // -------------------------------------------------

      const {
        data: latestSubscription,
        error:
          latestSubscriptionError,
      } = await supabase
        .from("subscriptions")
        .select("*")
        .eq(
          "user_id",
          req.user.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle();

      if (
        latestSubscriptionError
      ) {
        console.error(
          "Get latest subscription error:",
          latestSubscriptionError
        );
      }

      // -------------------------------------------------
      // RESPONSE
      // -------------------------------------------------

      return res.json({
        message:
          "Subscription cancelled successfully",

        subscription:
          latestSubscription
            ? formatSubscription(
                latestSubscription
              )
            : null,

        cancelledCount:
          cancelledSubscriptions.length,

        cleanedStaleCount:
          staleSubscriptionIds.length,

        user: {
          id:
            updatedUser.id,

          name:
            updatedUser.name,

          email:
            updatedUser.email,

          subscriptionStatus:
            updatedUser.subscription_status,

          subscriptionPlan:
            updatedUser.subscription_plan,

          subscriptionStartDate:
            updatedUser.subscription_start_date,

          subscriptionEndDate:
            updatedUser.subscription_end_date,

          stripeCustomerId:
            updatedUser.stripe_customer_id,

          stripeSubscriptionId:
            updatedUser.stripe_subscription_id,

          stripePriceId:
            updatedUser.stripe_price_id,
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