const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const supabase = require("../config/supabase");

// GET - All winners
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { data: winners, error } = await supabase
        .from("draw_results")
        .select(`
          *,
          users (
            id,
            name,
            email
          ),
          draws (
            id,
            draw_month,
            winning_numbers,
            status
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Get winners error:", error);

        return res.status(500).json({
          message: "Failed to fetch winners",
        });
      }

      const formattedWinners = (winners || []).map((winner) => ({
        ...winner,
        user: winner.users || null,
        draw: winner.draws || null,
        users: undefined,
        draws: undefined,
      }));

      return res.json({
        winners: formattedWinners,
      });
    } catch (error) {
      console.error("Get winners error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// PUT - Approve winner
router.put(
  "/:id/approve",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      const { data: winner, error: findError } =
        await supabase
          .from("draw_results")
          .select("*")
          .eq("id", id)
          .maybeSingle();

      if (findError) {
        console.error("Find winner error:", findError);

        return res.status(500).json({
          message: "Failed to find winner",
        });
      }

      if (!winner) {
        return res.status(404).json({
          message: "Winner not found",
        });
      }

      if (winner.verification_status === "Approved") {
        return res.status(400).json({
          message: "Winner is already approved",
        });
      }

      const { data: updatedWinner, error: updateError } =
        await supabase
          .from("draw_results")
          .update({
            verification_status: "Approved",
            payment_status: "Pending",
          })
          .eq("id", id)
          .select(`
            *,
            users (
              id,
              name,
              email
            ),
            draws (
              id,
              draw_month,
              winning_numbers,
              status
            )
          `)
          .single();

      if (updateError) {
        console.error("Approve winner error:", updateError);

        return res.status(500).json({
          message: "Failed to approve winner",
        });
      }

      return res.json({
        message: "Winner approved successfully",
        winner: {
          ...updatedWinner,
          user: updatedWinner.users || null,
          draw: updatedWinner.draws || null,
          users: undefined,
          draws: undefined,
        },
      });
    } catch (error) {
      console.error("Approve winner error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// PUT - Reject winner
router.put(
  "/:id/reject",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      const { data: winner, error: findError } =
        await supabase
          .from("draw_results")
          .select("*")
          .eq("id", id)
          .maybeSingle();

      if (findError) {
        console.error("Find winner error:", findError);

        return res.status(500).json({
          message: "Failed to find winner",
        });
      }

      if (!winner) {
        return res.status(404).json({
          message: "Winner not found",
        });
      }

      const { data: updatedWinner, error: updateError } =
        await supabase
          .from("draw_results")
          .update({
            verification_status: "Rejected",
            payment_status: "Pending",
          })
          .eq("id", id)
          .select(`
            *,
            users (
              id,
              name,
              email
            ),
            draws (
              id,
              draw_month,
              winning_numbers,
              status
            )
          `)
          .single();

      if (updateError) {
        console.error("Reject winner error:", updateError);

        return res.status(500).json({
          message: "Failed to reject winner",
        });
      }

      return res.json({
        message: "Winner rejected successfully",
        winner: {
          ...updatedWinner,
          user: updatedWinner.users || null,
          draw: updatedWinner.draws || null,
          users: undefined,
          draws: undefined,
        },
      });
    } catch (error) {
      console.error("Reject winner error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// PUT - Mark winner as paid
router.put(
  "/:id/mark-paid",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      const { data: winner, error: findError } =
        await supabase
          .from("draw_results")
          .select("*")
          .eq("id", id)
          .maybeSingle();

      if (findError) {
        console.error("Find winner error:", findError);

        return res.status(500).json({
          message: "Failed to find winner",
        });
      }

      if (!winner) {
        return res.status(404).json({
          message: "Winner not found",
        });
      }

      if (winner.verification_status !== "Approved") {
        return res.status(400).json({
          message: "Winner must be approved before marking as paid",
        });
      }

      if (winner.payment_status === "Paid") {
        return res.status(400).json({
          message: "Winner is already marked as paid",
        });
      }

      const { data: updatedWinner, error: updateError } =
        await supabase
          .from("draw_results")
          .update({
            payment_status: "Paid",
          })
          .eq("id", id)
          .select(`
            *,
            users (
              id,
              name,
              email
            ),
            draws (
              id,
              draw_month,
              winning_numbers,
              status
            )
          `)
          .single();

      if (updateError) {
        console.error("Mark winner paid error:", updateError);

        return res.status(500).json({
          message: "Failed to mark winner as paid",
        });
      }

      return res.json({
        message: "Winner marked as paid successfully",
        winner: {
          ...updatedWinner,
          user: updatedWinner.users || null,
          draw: updatedWinner.draws || null,
          users: undefined,
          draws: undefined,
        },
      });
    } catch (error) {
      console.error("Mark winner paid error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

module.exports = router;