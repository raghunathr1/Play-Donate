const express = require("express");

const User = require("../models/User");
const Charity = require("../models/Charity");
const Draw = require("../models/Draw");
const DrawResult = require("../models/DrawResult");
const Donation = require("../models/Donation");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

// GET ADMIN REPORTS
// GET /api/admin/reports
// ADMIN ONLY

router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      // ==================================================
      // USER STATISTICS
      // ==================================================

      const totalUsers =
        await User.countDocuments();

      const activeSubscriptions =
        await User.countDocuments({
          subscriptionStatus: "Active",
        });

      const monthlySubscriptions =
        await User.countDocuments({
          subscriptionStatus: "Active",
          subscriptionPlan: "Monthly",
        });

      const yearlySubscriptions =
        await User.countDocuments({
          subscriptionStatus: "Active",
          subscriptionPlan: "Yearly",
        });

      // ==================================================
      // CHARITY STATISTICS
      // ==================================================

      const totalCharities =
        await Charity.countDocuments();

      const activeCharities =
        await Charity.countDocuments({
          isActive: true,
        });

      const featuredCharities =
        await Charity.countDocuments({
          isFeatured: true,
          isActive: true,
        });

      // ==================================================
      // DRAW STATISTICS
      // ==================================================

      const totalDraws =
        await Draw.countDocuments();

      const publishedDraws =
        await Draw.countDocuments({
          status: "Published",
        });

      // ==================================================
      // WINNER STATISTICS
      // ==================================================

      const totalWinners =
        await DrawResult.countDocuments();

      const pendingVerification =
        await DrawResult.countDocuments({
          verificationStatus: "Pending",
        });

      const approvedWinners =
        await DrawResult.countDocuments({
          verificationStatus: "Approved",
        });

      const paidWinners =
        await DrawResult.countDocuments({
          paymentStatus: "Paid",
        });

      // ==================================================
      // PRIZE STATISTICS
      // ==================================================

      const prizeResult =
        await DrawResult.aggregate([
          {
            $group: {
              _id: null,

              totalPrize: {
                $sum: "$prizeAmount",
              },
            },
          },
        ]);

      const totalPrizeAmount =
        prizeResult.length > 0
          ? prizeResult[0].totalPrize
          : 0;

      // ==================================================
      // DONATION STATISTICS
      // ==================================================

      const totalDonations =
        await Donation.countDocuments();

      const paidDonations =
        await Donation.countDocuments({
          status: "Paid",
        });

      const pendingDonations =
        await Donation.countDocuments({
          status: "Pending",
        });

      const failedDonations =
        await Donation.countDocuments({
          status: "Failed",
        });

      // ==================================================
      // UNIQUE DONORS
      // ==================================================

      const donorResult =
        await Donation.aggregate([
          {
            $group: {
              _id: "$user",
            },
          },
          {
            $count: "totalDonors",
          },
        ]);

      const totalDonors =
        donorResult.length > 0
          ? donorResult[0].totalDonors
          : 0;

      // ==================================================
      // TOTAL DONATION AMOUNT
      // Only PAID donations are counted as actual impact.
      // ==================================================

      const donationAmountResult =
        await Donation.aggregate([
          {
            $match: {
              status: "Paid",
            },
          },
          {
            $group: {
              _id: null,

              totalAmount: {
                $sum: "$amount",
              },
            },
          },
        ]);

      const totalDonationAmount =
        donationAmountResult.length > 0
          ? donationAmountResult[0]
              .totalAmount
          : 0;

      // ==================================================
      // CHARITY-WISE DONATION REPORT
      // ==================================================

      const charityDonationResult =
        await Donation.aggregate([
          {
            $match: {
              status: "Paid",
            },
          },

          {
            $group: {
              _id: "$charity",

              totalAmount: {
                $sum: "$amount",
              },

              donationCount: {
                $sum: 1,
              },
            },
          },

          {
            $lookup: {
              from: "charities",

              localField: "_id",

              foreignField: "_id",

              as: "charity",
            },
          },

          {
            $unwind: {
              path: "$charity",
              preserveNullAndEmptyArrays: true,
            },
          },

          {
            $project: {
              _id: 1,

              charityName: {
                $ifNull: [
                  "$charity.name",
                  "Unknown Charity",
                ],
              },

              totalAmount: 1,

              donationCount: 1,
            },
          },

          {
            $sort: {
              totalAmount: -1,
            },
          },
        ]);

      // ==================================================
      // RESPONSE
      // ==================================================

      res.status(200).json({
        reports: {
          // ==================================================
          // USERS
          // ==================================================

          users: {
            totalUsers,
            activeSubscriptions,
            monthlySubscriptions,
            yearlySubscriptions,
          },

          // ==================================================
          // CHARITIES
          // ==================================================

          charities: {
            totalCharities,
            activeCharities,
            featuredCharities,
          },

          // ==================================================
          // DRAWS
          // ==================================================

          draws: {
            totalDraws,
            publishedDraws,
          },

          // ==================================================
          // WINNERS
          // ==================================================

          winners: {
            totalWinners,
            pendingVerification,
            approvedWinners,
            paidWinners,
          },

          // ==================================================
          // PRIZES
          // ==================================================

          prizes: {
            totalPrizeAmount,
          },

          // ==================================================
          // DONATIONS
          // ==================================================

          donations: {
            totalDonations,
            paidDonations,
            pendingDonations,
            failedDonations,
            totalDonors,
            totalDonationAmount,
            charityWise: charityDonationResult,
          },
        },
      });
    } catch (error) {
      console.error(
        "Admin Reports Error:",
        error.message
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

module.exports = router;
