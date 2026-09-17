const jwt = require("jsonwebtoken");
const Stripe = require("stripe");

const User = require("../models/User");

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

const authMiddleware = async (req, res, next) => {
  try {
    // ==================================================
    // GET TOKEN
    // ==================================================

    const authHeader = req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        message:
          "Access denied. No token provided",
      });
    }

    const token =
      authHeader.split(" ")[1];

    // ==================================================
    // VERIFY JWT
    // ==================================================

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    // ==================================================
    // FIND USER
    // ==================================================

    const user =
      await User.findById(
        decoded.userId
      ).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    // ==================================================
    // ADMIN USERS
    // ==================================================
    // Admins don't need a subscription.
    // We still allow them to continue normally.

    if (user.role === "Admin") {
      req.user = user;
      return next();
    }

    // ==================================================
    // STRIPE SUBSCRIPTION SYNC
    // ==================================================

    if (user.stripeSubscriptionId) {
      try {
        const stripeSubscription =
          await stripe.subscriptions.retrieve(
            user.stripeSubscriptionId
          );

        // ----------------------------------------------
        // STRIPE STATUS
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
        // CURRENT PERIOD DATES
        // ----------------------------------------------

        const startDate =
          stripeSubscription
            .current_period_start
            ? new Date(
                stripeSubscription
                  .current_period_start * 1000
              )
            : user.subscriptionStartDate;

        const endDate =
          stripeSubscription
            .current_period_end
            ? new Date(
                stripeSubscription
                  .current_period_end * 1000
              )
            : user.subscriptionEndDate;

        // ----------------------------------------------
        // EXTRA EXPIRY CHECK
        // ----------------------------------------------

        if (
          subscriptionStatus === "Active" &&
          endDate &&
          endDate < new Date()
        ) {
          subscriptionStatus =
            "Lapsed";
        }

        // ----------------------------------------------
        // STRIPE PRICE
        // ----------------------------------------------

        const price =
          stripeSubscription
            .items
            .data[0]
            ?.price;

        const priceId =
          price?.id ||
          user.stripePriceId ||
          null;

        // ----------------------------------------------
        // UPDATE USER ONLY IF SOMETHING CHANGED
        // ----------------------------------------------

        const statusChanged =
          user.subscriptionStatus !==
          subscriptionStatus;

        const endDateChanged =
          String(
            user.subscriptionEndDate || ""
          ) !==
          String(endDate || "");

        const startDateChanged =
          String(
            user.subscriptionStartDate || ""
          ) !==
          String(startDate || "");

        const priceChanged =
          user.stripePriceId !==
          priceId;

        if (
          statusChanged ||
          endDateChanged ||
          startDateChanged ||
          priceChanged
        ) {
          await User.findByIdAndUpdate(
            user._id,
            {
              subscriptionStatus:
                subscriptionStatus,

              subscriptionStartDate:
                startDate,

              subscriptionEndDate:
                endDate,

              stripePriceId:
                priceId,
            }
          );

          // Keep req.user updated
          user.subscriptionStatus =
            subscriptionStatus;

          user.subscriptionStartDate =
            startDate;

          user.subscriptionEndDate =
            endDate;

          user.stripePriceId =
            priceId;
        }
      } catch (stripeError) {
        // ----------------------------------------------
        // STRIPE LOOKUP FAILED
        // ----------------------------------------------
        //
        // Don't immediately reject the user.
        // Webhooks/local DB remain the fallback.
        // ----------------------------------------------

        console.error(
          "Stripe Subscription Sync Error:",
          stripeError.message
        );

        // Local expiry fallback
        if (
          user.subscriptionStatus ===
            "Active" &&
          user.subscriptionEndDate &&
          new Date(
            user.subscriptionEndDate
          ) < new Date()
        ) {
          user.subscriptionStatus =
            "Lapsed";

          await User.findByIdAndUpdate(
            user._id,
            {
              subscriptionStatus:
                "Lapsed",
            }
          );
        }
      }
    } else {
      // ==================================================
      // NO STRIPE SUBSCRIPTION
      // ==================================================

      if (
        user.subscriptionStatus ===
          "Active" &&
        user.subscriptionEndDate &&
        new Date(
          user.subscriptionEndDate
        ) < new Date()
      ) {
        user.subscriptionStatus =
          "Lapsed";

        await User.findByIdAndUpdate(
          user._id,
          {
            subscriptionStatus:
              "Lapsed",
          }
        );
      }
    }

    // ==================================================
    // ATTACH USER TO REQUEST
    // ==================================================

    req.user = user;

    next();
  } catch (error) {
    console.error(
      "Auth Middleware Error:",
      error.message
    );

    return res.status(401).json({
      message:
        "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;
