const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    // ==========================================
    // USER
    // ==========================================

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ==========================================
    // PLAN
    // ==========================================

    plan: {
      type: String,
      enum: ["Monthly", "Yearly"],
      required: true,
    },

    // ==========================================
    // PAYMENT
    // ==========================================

    status: {
      type: String,
      enum: [
        "Pending",
        "Active",
        "Cancelled",
        "Lapsed",
      ],
      default: "Pending",
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
    },

    // ==========================================
    // SUBSCRIPTION DATES
    // ==========================================

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    // ==========================================
    // STRIPE INFORMATION
    // ==========================================

    stripeCustomerId: {
      type: String,
      default: null,
    },

    stripeSubscriptionId: {
      type: String,
      default: null,
    },

    stripePriceId: {
      type: String,
      default: null,
    },

    stripeCheckoutSessionId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Subscription",
  subscriptionSchema
);