const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const cloudinary = require("../config/cloudinary");
const supabase = require("../config/supabase");

// GET - Current user's winnings
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const { data: winnings, error } = await supabase
      .from("draw_results")
      .select(`
        *,
        draws (
          id,
          draw_month,
          winning_numbers,
          status,
          prize_pool,
          jackpot_amount,
          jackpot_rolled_over
        )
      `)
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get my winnings error:", error);

      return res.status(500).json({
        message: "Failed to fetch winnings",
      });
    }

    const formattedWinnings = (winnings || []).map(
      (winning) => ({
        ...winning,
        draw: winning.draws || null,
        draws: undefined,
      })
    );

    return res.json({
      winnings: formattedWinnings,
    });
  } catch (error) {
    console.error("Get my winnings error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

// GET - Single winning result
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: winning, error } = await supabase
      .from("draw_results")
      .select(`
        *,
        draws (
          id,
          draw_month,
          winning_numbers,
          status,
          prize_pool,
          jackpot_amount,
          jackpot_rolled_over
        )
      `)
      .eq("id", id)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (error) {
      console.error("Get winning error:", error);

      return res.status(500).json({
        message: "Failed to fetch winning",
      });
    }

    if (!winning) {
      return res.status(404).json({
        message: "Winning result not found",
      });
    }

    return res.json({
      winning: {
        ...winning,
        draw: winning.draws || null,
        draws: undefined,
      },
    });
  } catch (error) {
    console.error("Get winning error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

// PUT - Upload winner proof
router.put(
  "/:id/proof",
  authMiddleware,
  upload.single("proof"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!req.file) {
        return res.status(400).json({
          message: "Proof image is required",
        });
      }

      const { data: winning, error: findError } =
        await supabase
          .from("draw_results")
          .select("*")
          .eq("id", id)
          .eq("user_id", req.user.id)
          .maybeSingle();

      if (findError) {
        console.error("Find winning error:", findError);

        return res.status(500).json({
          message: "Failed to find winning result",
        });
      }

      if (!winning) {
        return res.status(404).json({
          message: "Winning result not found",
        });
      }

      if (winning.payment_status === "Paid") {
        return res.status(400).json({
          message: "This winning has already been paid",
        });
      }

      const uploadResult = await new Promise(
        (resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "digital-heroes/winner-proofs",
              resource_type: "image",
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );

          stream.end(req.file.buffer);
        }
      );

      const proofUrl = uploadResult.secure_url;

      const { data: updatedWinning, error: updateError } =
        await supabase
          .from("draw_results")
          .update({
            proof_screenshot: proofUrl,
            verification_status: "Pending",
            payment_status: "Pending",
          })
          .eq("id", id)
          .eq("user_id", req.user.id)
          .select(`
            *,
            draws (
              id,
              draw_month,
              winning_numbers,
              status,
              prize_pool,
              jackpot_amount,
              jackpot_rolled_over
            )
          `)
          .single();

      if (updateError) {
        console.error(
          "Update winner proof error:",
          updateError
        );

        return res.status(500).json({
          message: "Failed to save proof",
        });
      }

      return res.json({
        message: "Proof uploaded successfully",
        winning: {
          ...updatedWinning,
          draw: updatedWinning.draws || null,
          draws: undefined,
        },
      });
    } catch (error) {
      console.error("Upload winner proof error:", error);

      return res.status(500).json({
        message: "Failed to upload proof",
      });
    }
  }
);

module.exports = router;