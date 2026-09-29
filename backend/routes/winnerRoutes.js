const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const supabase = require("../config/supabase");

// =====================================================
// HELPERS
// =====================================================

const normalizeVerificationStatus = (value) => {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  if (
    status === "approved" ||
    status === "verified"
  ) {
    return "Approved";
  }

  return "Pending";
};

const normalizePaymentStatus = (value) => {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  if (status === "paid") {
    return "Paid";
  }

  return "Pending";
};

// =====================================================
// GET - MY WINNINGS
// IMPORTANT:
// This route MUST come before GET "/:id"
// because "/my" otherwise gets treated as an id.
// =====================================================

router.get(
  "/my",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = req.user.id;

      // -------------------------------------------------
      // GET CURRENT USER'S WINNING RECORDS
      // -------------------------------------------------

      const {
        data: winners,
        error: winnersError,
      } = await supabase
        .from("draw_results")
        .select(`
          id,
          draw_id,
          user_id,
          matched_numbers,
          prize_category,
          prize_amount,
          verification_status,
          payment_status
        `)
        .eq("user_id", userId)
        .order("id", {
          ascending: false,
        });

      if (winnersError) {
        console.error(
          "Get my winnings error:",
          winnersError
        );

        return res.status(500).json({
          message:
            "Failed to fetch your winnings",
        });
      }

      // -------------------------------------------------
      // GET DRAW DETAILS
      // -------------------------------------------------

      const drawIds = [
        ...new Set(
          (winners || [])
            .map(
              (winner) => winner.draw_id
            )
            .filter(Boolean)
        ),
      ];

      let draws = [];

      if (drawIds.length > 0) {
        const {
          data: drawData,
          error: drawsError,
        } = await supabase
          .from("draws")
          .select(`
            id,
            draw_month
          `)
          .in("id", drawIds);

        if (drawsError) {
          console.error(
            "Get my winning draws error:",
            drawsError
          );
        } else {
          draws = drawData || [];
        }
      }

      // -------------------------------------------------
      // DRAW MAP
      // -------------------------------------------------

      const drawMap = {};

      for (const draw of draws) {
        drawMap[draw.id] = draw;
      }

      // -------------------------------------------------
      // FINAL USER WINNINGS RESPONSE
      // -------------------------------------------------

      const finalWinnings =
        (winners || []).map(
          (winner) => {
            const draw =
              drawMap[
                winner.draw_id
              ];

            const verificationStatus =
              normalizeVerificationStatus(
                winner.verification_status
              );

            const paymentStatus =
              normalizePaymentStatus(
                winner.payment_status
              );

            const prizeAmount =
              Number(
                winner.prize_amount || 0
              );

            const matchedNumbers =
              Number(
                winner.matched_numbers || 0
              );

            return {
              // Original Supabase fields
              ...winner,

              // Normalized fields for frontend
              _id: winner.id,

              drawMonth:
                draw?.draw_month || null,

              prizeCategory:
                winner.prize_category ||
                "Prize",

              prizeAmount,

              matchedNumbers,

              verificationStatus,

              paymentStatus,

              // Keep snake_case too for compatibility
              verification_status:
                verificationStatus,

              payment_status:
                paymentStatus,

              prize_amount:
                prizeAmount,

              matched_numbers:
                matchedNumbers,

              // Additional useful aliases
              draw: draw
                ? {
                    id: draw.id,
                    drawMonth:
                      draw.draw_month,
                  }
                : null,
            };
          }
        );

      // -------------------------------------------------
      // TOTAL WON
      // -------------------------------------------------

      const totalWon =
        finalWinnings.reduce(
          (total, winning) =>
            total +
            Number(
              winning.prizeAmount || 0
            ),
          0
        );

      const paidWinnings =
        finalWinnings.filter(
          (winning) =>
            winning.paymentStatus ===
            "Paid"
        );

      const pendingWinnings =
        finalWinnings.filter(
          (winning) =>
            winning.paymentStatus !==
            "Paid"
        );

      // -------------------------------------------------
      // RESPONSE
      // -------------------------------------------------

      return res.json({
        winnings: finalWinnings,

        summary: {
          totalRecords:
            finalWinnings.length,

          totalWon,

          paidCount:
            paidWinnings.length,

          pendingCount:
            pendingWinnings.length,
        },
      });
    } catch (error) {
      console.error(
        "Get my winnings server error:",
        error
      );

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// GET - ALL WINNERS
// ADMIN ONLY
// =====================================================

router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const {
        data: winners,
        error,
      } = await supabase
        .from("draw_results")
        .select(`
          id,
          draw_id,
          user_id,
          matched_numbers,
          prize_category,
          prize_amount,
          verification_status,
          payment_status
        `)
        .order("id", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Get winners error:",
          error
        );

        return res.status(500).json({
          message:
            "Failed to fetch winners",
        });
      }

      // -------------------------------------------------
      // GET USER DETAILS
      // -------------------------------------------------

      const userIds = [
        ...new Set(
          (winners || [])
            .map(
              (winner) => winner.user_id
            )
            .filter(Boolean)
        ),
      ];

      let users = [];

      if (userIds.length > 0) {
        const {
          data: userData,
          error: usersError,
        } = await supabase
          .from("users")
          .select(
            "id, name, email"
          )
          .in(
            "id",
            userIds
          );

        if (usersError) {
          console.error(
            "Get winner users error:",
            usersError
          );
        } else {
          users = userData || [];
        }
      }

      const userMap = {};

      for (const user of users) {
        userMap[user.id] = user;
      }

      // -------------------------------------------------
      // FINAL WINNER RESPONSE
      // -------------------------------------------------

      const finalWinners =
        (winners || []).map(
          (winner) => {
            const user =
              userMap[
                winner.user_id
              ];

            return {
              ...winner,

              verification_status:
                normalizeVerificationStatus(
                  winner.verification_status
                ),

              payment_status:
                normalizePaymentStatus(
                  winner.payment_status
                ),

              prize_amount:
                Number(
                  winner.prize_amount || 0
                ),

              matched_numbers:
                Number(
                  winner.matched_numbers || 0
                ),

              user_name:
                user?.name || "",

              user_email:
                user?.email || "",
            };
          }
        );

      return res.json({
        winners: finalWinners,
      });
    } catch (error) {
      console.error(
        "Get winners server error:",
        error
      );

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// GET - SINGLE WINNER
// ADMIN ONLY
// =====================================================

router.get(
  "/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const {
        data: winner,
        error,
      } = await supabase
        .from("draw_results")
        .select(`
          id,
          draw_id,
          user_id,
          matched_numbers,
          prize_category,
          prize_amount,
          verification_status,
          payment_status
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error(
          "Get winner error:",
          error
        );

        return res.status(500).json({
          message:
            "Failed to fetch winner",
        });
      }

      if (!winner) {
        return res.status(404).json({
          message:
            "Winner not found",
        });
      }

      // -------------------------------------------------
      // USER DETAILS
      // -------------------------------------------------

      let user = null;

      if (winner.user_id) {
        const {
          data: userData,
          error: userError,
        } = await supabase
          .from("users")
          .select(
            "id, name, email"
          )
          .eq(
            "id",
            winner.user_id
          )
          .maybeSingle();

        if (userError) {
          console.error(
            "Get winner user error:",
            userError
          );
        }

        user = userData;
      }

      return res.json({
        winner: {
          ...winner,

          verification_status:
            normalizeVerificationStatus(
              winner.verification_status
            ),

          payment_status:
            normalizePaymentStatus(
              winner.payment_status
            ),

          prize_amount:
            Number(
              winner.prize_amount || 0
            ),

          matched_numbers:
            Number(
              winner.matched_numbers || 0
            ),

          user_name:
            user?.name || "",

          user_email:
            user?.email || "",
        },
      });
    } catch (error) {
      console.error(
        "Get single winner server error:",
        error
      );

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// PUT - VERIFY WINNER
// ADMIN ONLY
// =====================================================

router.put(
  "/:id/verify",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } =
        req.params;

      // -------------------------------------------------
      // FIND WINNER
      // -------------------------------------------------

      const {
        data: winner,
        error: findError,
      } = await supabase
        .from("draw_results")
        .select(`
          id,
          draw_id,
          user_id,
          matched_numbers,
          prize_category,
          prize_amount,
          verification_status,
          payment_status
        `)
        .eq("id", id)
        .maybeSingle();

      if (findError) {
        console.error(
          "Find winner error:",
          findError
        );

        return res.status(500).json({
          message:
            "Failed to find winner",
        });
      }

      if (!winner) {
        return res.status(404).json({
          message:
            "Winner not found",
        });
      }

      // -------------------------------------------------
      // CHECK CURRENT STATUS
      // -------------------------------------------------

      const currentStatus =
        normalizeVerificationStatus(
          winner.verification_status
        );

      if (
        currentStatus ===
        "Approved"
      ) {
        return res.status(400).json({
          message:
            "Winner is already approved",
        });
      }

      // -------------------------------------------------
      // APPROVE WINNER
      // -------------------------------------------------

      const {
        data: updatedWinner,
        error: updateError,
      } = await supabase
        .from("draw_results")
        .update({
          verification_status:
            "Approved",
        })
        .eq("id", id)
        .select(`
          id,
          draw_id,
          user_id,
          matched_numbers,
          prize_category,
          prize_amount,
          verification_status,
          payment_status
        `)
        .single();

      if (updateError) {
        console.error(
          "Verify winner update error:",
          updateError
        );

        return res.status(500).json({
          message:
            "Failed to verify winner",
        });
      }

      return res.json({
        message:
          "Winner verified successfully",

        winner: {
          ...updatedWinner,

          verification_status:
            "Approved",

          payment_status:
            normalizePaymentStatus(
              updatedWinner.payment_status
            ),

          prize_amount:
            Number(
              updatedWinner.prize_amount || 0
            ),
        },
      });
    } catch (error) {
      console.error(
        "Verify winner server error:",
        error
      );

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// PUT - MARK WINNER AS PAID
// ADMIN ONLY
// =====================================================

router.put(
  "/:id/payment",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } =
        req.params;

      // -------------------------------------------------
      // FIND WINNER
      // -------------------------------------------------

      const {
        data: winner,
        error: findError,
      } = await supabase
        .from("draw_results")
        .select(`
          id,
          draw_id,
          user_id,
          matched_numbers,
          prize_category,
          prize_amount,
          verification_status,
          payment_status
        `)
        .eq("id", id)
        .maybeSingle();

      if (findError) {
        console.error(
          "Find winner for payment error:",
          findError
        );

        return res.status(500).json({
          message:
            "Failed to find winner",
        });
      }

      if (!winner) {
        return res.status(404).json({
          message:
            "Winner not found",
        });
      }

      // -------------------------------------------------
      // MUST BE APPROVED
      // -------------------------------------------------

      const verificationStatus =
        normalizeVerificationStatus(
          winner.verification_status
        );

      if (
        verificationStatus !==
        "Approved"
      ) {
        return res.status(400).json({
          message:
            "Winner must be approved before payment",
        });
      }

      // -------------------------------------------------
      // ALREADY PAID
      // -------------------------------------------------

      const paymentStatus =
        normalizePaymentStatus(
          winner.payment_status
        );

      if (
        paymentStatus ===
        "Paid"
      ) {
        return res.status(400).json({
          message:
            "Winner payment is already completed",
        });
      }

      // -------------------------------------------------
      // MARK PAID
      // -------------------------------------------------

      const {
        data: updatedWinner,
        error: updateError,
      } = await supabase
        .from("draw_results")
        .update({
          payment_status:
            "Paid",
        })
        .eq("id", id)
        .select(`
          id,
          draw_id,
          user_id,
          matched_numbers,
          prize_category,
          prize_amount,
          verification_status,
          payment_status
        `)
        .single();

      if (updateError) {
        console.error(
          "Winner payment update error:",
          updateError
        );

        return res.status(500).json({
          message:
            "Failed to update payment status",
        });
      }

      return res.json({
        message:
          "Winner payment marked as paid",

        winner: {
          ...updatedWinner,

          verification_status:
            "Approved",

          payment_status:
            "Paid",

          prize_amount:
            Number(
              updatedWinner.prize_amount ||
                0
            ),
        },
      });
    } catch (error) {
      console.error(
        "Winner payment server error:",
        error
      );

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// EXPORT
// =====================================================

module.exports = router;