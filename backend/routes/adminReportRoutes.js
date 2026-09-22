const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const supabase = require("../config/supabase");

// GET - Admin reports
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      // -----------------------------
      // USERS
      // -----------------------------

      const { data: users, error: usersError } = await supabase
        .from("users")
        .select(
          "id, role, subscription_status, subscription_plan"
        );

      if (usersError) {
        console.error("Users report error:", usersError);

        return res.status(500).json({
          message: "Failed to fetch user report",
        });
      }

      const allUsers = users || [];

      const totalUsers = allUsers.length;

      const activeSubscriptions = allUsers.filter(
        (user) => user.subscription_status === "Active"
      ).length;

      const monthlyPlans = allUsers.filter(
        (user) =>
          user.subscription_status === "Active" &&
          user.subscription_plan === "Monthly"
      ).length;

      const yearlyPlans = allUsers.filter(
        (user) =>
          user.subscription_status === "Active" &&
          user.subscription_plan === "Yearly"
      ).length;

      // -----------------------------
      // CHARITIES
      // -----------------------------

      const { data: charities, error: charitiesError } =
        await supabase
          .from("charities")
          .select("id, active, featured");

      if (charitiesError) {
        console.error(
          "Charities report error:",
          charitiesError
        );

        return res.status(500).json({
          message: "Failed to fetch charity report",
        });
      }

      const allCharities = charities || [];

      const totalCharities = allCharities.length;

      const activeCharities = allCharities.filter(
        (charity) => charity.active === true
      ).length;

      const featuredCharities = allCharities.filter(
        (charity) => charity.featured === true
      ).length;

      // -----------------------------
      // DRAWS
      // -----------------------------

      const { data: draws, error: drawsError } = await supabase
        .from("draws")
        .select(
          "id, status, prize_pool, draw_month"
        );

      if (drawsError) {
        console.error("Draws report error:", drawsError);

        return res.status(500).json({
          message: "Failed to fetch draw report",
        });
      }

      const allDraws = draws || [];

      const totalDraws = allDraws.length;

      const publishedDraws = allDraws.filter(
        (draw) => draw.status === "Published"
      ).length;

      // -----------------------------
      // WINNERS
      // -----------------------------

      const { data: winners, error: winnersError } =
        await supabase
          .from("draw_results")
          .select(
            "id, prize_amount, verification_status, payment_status, matched_numbers"
          );

      if (winnersError) {
        console.error(
          "Winners report error:",
          winnersError
        );

        return res.status(500).json({
          message: "Failed to fetch winner report",
        });
      }

      const allWinners = winners || [];

      const totalWinners = allWinners.length;

      const pendingVerification = allWinners.filter(
        (winner) =>
          winner.verification_status === "Pending"
      ).length;

      const approvedWinners = allWinners.filter(
        (winner) =>
          winner.verification_status === "Approved"
      ).length;

      const paidWinners = allWinners.filter(
        (winner) =>
          winner.payment_status === "Paid"
      ).length;

      const totalPrizeAmount = allWinners.reduce(
        (total, winner) =>
          total + Number(winner.prize_amount || 0),
        0
      );

      // -----------------------------
      // DONATIONS
      // -----------------------------

      const { data: donations, error: donationsError } =
        await supabase
          .from("donations")
          .select(
            "id, user_id, charity_id, amount, status, created_at, charities(id, name)"
          );

      if (donationsError) {
        console.error(
          "Donations report error:",
          donationsError
        );

        return res.status(500).json({
          message: "Failed to fetch donation report",
        });
      }

      const allDonations = donations || [];

      const totalDonations = allDonations.length;

      const paidDonations = allDonations.filter(
        (donation) => donation.status === "Paid"
      );

      const pendingDonations = allDonations.filter(
        (donation) => donation.status === "Pending"
      );

      const failedDonations = allDonations.filter(
        (donation) => donation.status === "Failed"
      );

      const totalDonated = paidDonations.reduce(
        (total, donation) =>
          total + Number(donation.amount || 0),
        0
      );

      const uniqueDonorIds = new Set(
        paidDonations
          .map((donation) => donation.user_id)
          .filter(Boolean)
      );

      const totalDonors = uniqueDonorIds.size;

      // -----------------------------
      // CHARITY-WISE DONATIONS
      // -----------------------------

      const charityDonationMap = {};

      for (const donation of paidDonations) {
        const charityId = donation.charity_id;

        const charityName =
          donation.charities?.name || "Unknown Charity";

        if (!charityDonationMap[charityId]) {
          charityDonationMap[charityId] = {
            charityId,
            charityName,
            donations: 0,
            amount: 0,
          };
        }

        charityDonationMap[charityId].donations += 1;

        charityDonationMap[charityId].amount += Number(
          donation.amount || 0
        );
      }

      const charityWiseDonations = Object.values(
        charityDonationMap
      ).sort((a, b) => b.amount - a.amount);

      // -----------------------------
      // RESPONSE
      // -----------------------------

      return res.json({
        users: {
          total: totalUsers,
          activeSubscriptions,
          monthlyPlans,
          yearlyPlans,
        },

        charities: {
          total: totalCharities,
          active: activeCharities,
          featured: featuredCharities,
        },

        draws: {
          total: totalDraws,
          published: publishedDraws,
        },

        winners: {
          total: totalWinners,
          pendingVerification,
          approved: approvedWinners,
          paid: paidWinners,
        },

        prizes: {
          totalPrizeAmount,
        },

        donations: {
          total: totalDonations,
          paid: paidDonations.length,
          pending: pendingDonations.length,
          failed: failedDonations.length,
          totalDonors,
          totalDonated,
          charityWise: charityWiseDonations,
        },
      });
    } catch (error) {
      console.error("Admin reports error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

module.exports = router;