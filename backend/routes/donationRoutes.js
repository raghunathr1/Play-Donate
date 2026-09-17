
const express = require("express");
const Stripe = require("stripe");

const Donation = require("../models/Donation");
const Charity = require("../models/Charity");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

// ==================================================
// CREATE DONATION CHECKOUT
// ==================================================

router.post("/create-checkout", authMiddleware, async (req, res) => {
  try {
    const {
      charityId,
      amount,
    } = req.body;

    // Validate charity
    if (!charityId) {
      return res.status(400).json({
        message: "Charity is required",
      });
    }

    // Validate amount
    if (
      !amount ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({
        message: "Donation amount must be greater than 0",
      });
    }

    const donationAmount = Number(amount);

    // Find active charity
    const charity = await Charity.findOne({
      _id: charityId,
      isActive: true,
    });

    if (!charity) {
      return res.status(404).json({
        message: "Charity not found or inactive",
      });
    }

    // Create local donation record
    const donation = await Donation.create({
      user: req.user._id,
      charity: charity._id,
      amount: donationAmount,
      currency: "INR",
      status: "Pending",
    });

    // Stripe amount is in paise
    const amountInPaise = Math.round(
      donationAmount * 100
    );

    // Create Stripe Checkout
    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",

        line_items: [
          {
            price_data: {
              currency: "inr",

              product_data: {
                name: `Donation to ${charity.name}`,
              },

              unit_amount: amountInPaise,
            },

            quantity: 1,
          },
        ],

        customer_email: req.user.email,

        metadata: {
          donationId:
            donation._id.toString(),

          userId:
            req.user._id.toString(),

          charityId:
            charity._id.toString(),
        },

        success_url:
          `${process.env.FRONTEND_URL}/charities?donation=success`,

        cancel_url:
          `${process.env.FRONTEND_URL}/charities?donation=cancelled`,
      });

    // Save Stripe session ID
    donation.stripeCheckoutSessionId =
      session.id;

    await donation.save();

    res.status(200).json({
      message:
        "Donation checkout created",

      checkoutUrl:
        session.url,

      sessionId:
        session.id,

      donation,
    });
  } catch (error) {
    console.error(
      "Create Donation Error:",
      error.message
    );

    res.status(500).json({
      message:
        "Unable to create donation checkout",
    });
  }
});

// ==================================================
// GET MY DONATIONS
// ==================================================

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const donations =
      await Donation.find({
        user: req.user._id,
      })
        .populate(
          "charity",
          "name image"
        )
        .sort({
          createdAt: -1,
        });

    res.status(200).json({
      donations,
    });
  } catch (error) {
    console.error(
      "Get Donations Error:",
      error.message
    );

    res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;