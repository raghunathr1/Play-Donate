const mongoose = require("mongoose");

const drawResultSchema = new mongoose.Schema(
  {
    draw: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Draw",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    matchedNumbers: {
      type: Number,
      required: true,
      enum: [3, 4, 5],
    },

    prizeCategory: {
      type: String,
      enum: ["5 Match", "4 Match", "3 Match"],
      required: true,
    },

    prizeAmount: {
      type: Number,
      required: true,
      default: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid"],
      default: "Pending",
    },

    proofScreenshot: {
      type: String,
      default: "",
    },

    verificationStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "DrawResult",
  drawResultSchema
);