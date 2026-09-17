const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // ==========================================
    // USER INFORMATION
    // ==========================================

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    // ==========================================
    // USER ROLE
    // ==========================================

    role: {
      type: String,
      enum: ["User", "Admin"],
      default: "User",
    },

    // ==========================================
    // SUBSCRIPTION
    // ==========================================

    subscriptionStatus: {
      type: String,
      enum: [
        "Not Subscribed",
        "Active",
        "Cancelled",
        "Lapsed",
      ],
      default: "Not Subscribed",
    },

    subscriptionPlan: {
      type: String,
      enum: ["Monthly", "Yearly", null],
      default: null,
    },

    subscriptionStartDate: {
      type: Date,
      default: null,
    },

    subscriptionEndDate: {
      type: Date,
      default: null,
    },

    // Stripe fields
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

    // ==========================================
    // CHARITY
    // ==========================================

    charity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Charity",
      default: null,
    },

    charityContribution: {
      type: Number,
      min: 10,
      max: 100,
      default: 10,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);