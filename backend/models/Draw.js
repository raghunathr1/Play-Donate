const mongoose = require("mongoose");

const drawSchema = new mongoose.Schema(
  {
    drawMonth: {
      type: String,
      required: true,
      unique: true,
      match: /^\d{4}-\d{2}$/,
    },

    drawMode: {
      type: String,
      enum: ["standard", "weighted"],
      default: "standard",
    },

    winningNumbers: {
      type: [Number],
      required: true,
      validate: {
        validator: function (numbers) {
          return (
            numbers.length === 5 &&
            numbers.every(
              (number) =>
                Number.isInteger(number) &&
                number >= 1 &&
                number <= 45
            ) &&
            new Set(numbers).size === 5
          );
        },
        message:
          "Winning numbers must contain 5 unique numbers between 1 and 45",
      },
    },

    status: {
      type: String,
      enum: ["Simulated", "Published"],
      default: "Simulated",
    },

    /*
     * Prevent duplicate draw calculation.
     *
     * false = results not calculated yet
     * true  = results already calculated
     */
    resultsCalculated: {
      type: Boolean,
      default: false,
    },

    jackpotAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    prizePool: {
      type: Number,
      default: 0,
      min: 0,
    },

    jackpotRolledOver: {
      type: Boolean,
      default: false,
    },

    winners5Match: {
      type: Number,
      default: 0,
      min: 0,
    },

    winners4Match: {
      type: Number,
      default: 0,
      min: 0,
    },

    winners3Match: {
      type: Number,
      default: 0,
      min: 0,
    },

    jackpotWinner: {
      type: Boolean,
      default: false,
    },

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.model("Draw", drawSchema);