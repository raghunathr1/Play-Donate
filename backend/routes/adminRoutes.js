const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const supabase = require("../config/supabase");

// =====================================================
// ADMIN REPORTS
// POST /api/admin/reports
// =====================================================

router.post(
  "/reports",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      // =================================================
      // TOTAL USERS
      // =================================================

      const {
        count: totalUsers,
        error: usersError,
      } = await supabase
        .from("users")
        .select("id", {
          count: "exact",
          head: true,
        });

      if (usersError) {
        console.error(
          "Admin reports - users error:",
          usersError
        );

        return res.status(500).json({
          success: false,
          message: "Failed to fetch users report",
        });
      }

      // =================================================
      // TOTAL DRAWS
      // =================================================

      const {
        count: totalDraws,
        error: drawsError,
      } = await supabase
        .from("draws")
        .select("id", {
          count: "exact",
          head: true,
        });

      if (drawsError) {
        console.error(
          "Admin reports - draws error:",
          drawsError
        );

        return res.status(500).json({
          success: false,
          message: "Failed to fetch draws report",
        });
      }

      // =================================================
      // GET DRAW RESULTS
      // =================================================

      const {
        data: winnerRecords,
        error: winnersError,
      } = await supabase
        .from("draw_results")
        .select(
          `
            id,
            draw_id,
            user_id,
            matched_numbers,
            prize_category,
            prize_amount,
            verification_status,
            payment_status
          `
        )
        .order("id", {
          ascending: false,
        });

      if (winnersError) {
        console.error(
          "Admin reports - winners error:",
          winnersError
        );

        return res.status(500).json({
          success: false,
          message:
            "Failed to fetch winner report",
        });
      }

      const winners =
        winnerRecords || [];

      // =================================================
      // WINNER STATISTICS
      // =================================================

      const totalWinners =
        winners.length;

      const pendingVerification =
        winners.filter(
          (winner) =>
            String(
              winner.verification_status || ""
            ).toLowerCase() === "pending"
        ).length;

      const approvedWinners =
        winners.filter(
          (winner) => {
            const status =
              String(
                winner.verification_status ||
                  ""
              ).toLowerCase();

            return (
              status === "approved" ||
              status === "verified"
            );
          }
        ).length;

      const paidWinners =
        winners.filter(
          (winner) =>
            String(
              winner.payment_status || ""
            ).toLowerCase() === "paid"
        ).length;

      // =================================================
      // PRIZE AMOUNTS
      // =================================================

      const totalPrizeAmount =
        winners.reduce(
          (total, winner) => {
            return (
              total +
              Number(
                winner.prize_amount || 0
              )
            );
          },
          0
        );

      const paidPrizeAmount =
        winners
          .filter(
            (winner) =>
              String(
                winner.payment_status || ""
              ).toLowerCase() === "paid"
          )
          .reduce(
            (total, winner) => {
              return (
                total +
                Number(
                  winner.prize_amount || 0
                )
              );
            },
            0
          );

      // =================================================
      // PENDING PAYMENT
      // =================================================

      const pendingPayment =
        winners.filter(
          (winner) =>
            String(
              winner.payment_status || ""
            ).toLowerCase() === "pending"
        ).length;

      // =================================================
      // RESPONSE
      // =================================================

      return res.json({
        success: true,

        message:
          "Admin reports fetched successfully",

        reports: {
          totalUsers:
            totalUsers || 0,

          totalDraws:
            totalDraws || 0,

          totalWinners,

          pendingVerification,

          approvedWinners,

          paidWinners,

          pendingPayment,

          totalPrizeAmount,

          paidPrizeAmount,
        },

        // =================================================
        // DIRECT VALUES
        // =================================================
        // These are also returned directly so the
        // frontend can use either:
        //
        // data.reports.totalUsers
        //
        // OR
        //
        // data.totalUsers
        // =================================================

        totalUsers:
          totalUsers || 0,

        totalDraws:
          totalDraws || 0,

        totalWinners,

        pendingVerification,

        approvedWinners,

        paidWinners,

        pendingPayment,

        totalPrizeAmount,

        paidPrizeAmount,
      });
    } catch (error) {
      console.error(
        "Admin reports server error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load admin reports",
      });
    }
  }
);

// =====================================================
// EXPORT
// =====================================================

module.exports = router;