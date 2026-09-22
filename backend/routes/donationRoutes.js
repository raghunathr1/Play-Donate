const express = require("express");
const router = express.Router();
const Stripe = require("stripe");

const authMiddleware = require("../middleware/authMiddleware");
const supabase = require("../config/supabase");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// =========================================================
// POST - Create donation checkout
// =========================================================
router.post("/create-checkout", authMiddleware, async (req, res) => {
  try {
    const { amount, charityId } = req.body;

    const donationAmount = Number(amount);

    // =====================================================
    // Validate charity ID
    // =====================================================
    if (!charityId) {
      return res.status(400).json({
        message: "Charity ID is required",
      });
    }

    // =====================================================
    // Validate donation amount
    // =====================================================
    if (!Number.isFinite(donationAmount) || donationAmount <= 0) {
      return res.status(400).json({
        message: "Donation amount must be greater than 0",
      });
    }

    // =====================================================
    // Check active charity
    // =====================================================
    const { data: charity, error: charityError } = await supabase
      .from("charities")
      .select("id, name, is_active")
      .eq("id", charityId)
      .eq("is_active", true)
      .maybeSingle();

    if (charityError) {
      console.error("Charity lookup error:", charityError);

      return res.status(500).json({
        message: "Failed to verify charity",
      });
    }

    if (!charity) {
      return res.status(404).json({
        message: "Active charity not found",
      });
    }

    // =====================================================
    // Create pending donation
    // =====================================================
    const { data: donation, error: donationError } = await supabase
      .from("donations")
      .insert({
        user_id: req.user.id,
        charity_id: charityId,
        amount: donationAmount,
        currency: "INR",
        status: "Pending",
      })
      .select("*")
      .single();

    if (donationError) {
      console.error("Create donation error:", donationError);

      return res.status(500).json({
        message: "Failed to create donation",
      });
    }

    try {
      // ===================================================
      // Create Stripe Checkout Session
      // ===================================================
      const session = await stripe.checkout.sessions.create({
        mode: "payment",

        line_items: [
          {
            price_data: {
              currency: "inr",

              product_data: {
                name: `Donation to ${charity.name}`,
              },

              unit_amount: Math.round(donationAmount * 100),
            },

            quantity: 1,
          },
        ],

        metadata: {
          donationId: donation.id,
          userId: req.user.id,
          charityId: charityId,
        },

        success_url:
          `${process.env.FRONTEND_URL}/dashboard?donation=success`,

        cancel_url:
          `${process.env.FRONTEND_URL}/dashboard?donation=cancelled`,
      });

      // ===================================================
      // Save Stripe Checkout Session ID
      // ===================================================
      const { data: updatedDonation, error: updateError } =
        await supabase
          .from("donations")
          .update({
            stripe_checkout_session_id: session.id,
          })
          .eq("id", donation.id)
          .select("*")
          .single();

      if (updateError) {
        console.error(
          "Update donation Stripe session error:",
          updateError
        );

        return res.status(500).json({
          message:
            "Donation created but failed to save Stripe session",
        });
      }

      // ===================================================
      // Return checkout details
      // ===================================================
      return res.json({
        message: "Donation checkout created successfully",

        donation: updatedDonation,

        sessionId: session.id,

        checkoutUrl: session.url,
      });
    } catch (stripeError) {
      console.error("Stripe checkout error:", stripeError);

      // ===================================================
      // Mark donation as failed
      // ===================================================
      await supabase
        .from("donations")
        .update({
          status: "Failed",
        })
        .eq("id", donation.id);

      return res.status(500).json({
        message: "Failed to create Stripe checkout",
      });
    }
  } catch (error) {
    console.error(
      "Create donation checkout error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
});

// =========================================================
// GET - Current user's donations
// =========================================================
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const { data: donations, error } = await supabase
      .from("donations")
      .select(`
        *,
        charities (
          id,
          name,
          image
        )
      `)
      .eq("user_id", req.user.id)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Get donations error:", error);

      return res.status(500).json({
        message: "Failed to fetch donations",
      });
    }

    // =====================================================
    // Format donations
    // =====================================================
    const formattedDonations = (donations || []).map(
      (donation) => ({
        ...donation,

        charity: donation.charities || null,

        charities: undefined,
      })
    );

    return res.json({
      donations: formattedDonations,
    });
  } catch (error) {
    console.error("Get donations error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;