const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const supabase = require("../config/supabase");

// GET - Current user's scores
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { data: scores, error } = await supabase
      .from("scores")
      .select("*")
      .eq("user_id", req.user.id)
      .order("score_date", { ascending: false });

    if (error) {
      console.error("Get scores error:", error);
      return res.status(500).json({
        message: "Failed to fetch scores",
      });
    }

    return res.json({
      scores: scores || [],
    });
  } catch (error) {
    console.error("Get scores error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

// POST - Add score
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { score, scoreDate } = req.body;

    // Validate score
    if (
      score === undefined ||
      score === null ||
      Number(score) < 1 ||
      Number(score) > 45
    ) {
      return res.status(400).json({
        message: "Score must be between 1 and 45",
      });
    }

    // Validate date
    if (!scoreDate) {
      return res.status(400).json({
        message: "Score date is required",
      });
    }

    // Check duplicate date
    const { data: existingScore, error: existingError } =
      await supabase
        .from("scores")
        .select("id")
        .eq("user_id", req.user.id)
        .eq("score_date", scoreDate)
        .maybeSingle();

    if (existingError) {
      console.error(
        "Check existing score error:",
        existingError
      );

      return res.status(500).json({
        message: "Failed to check existing score",
      });
    }

    if (existingScore) {
      return res.status(400).json({
        message: "A score already exists for this date",
      });
    }

    // Insert new score
    const { data: newScore, error: insertError } =
      await supabase
        .from("scores")
        .insert({
          user_id: req.user.id,
          score: Number(score),
          score_date: scoreDate,
        })
        .select()
        .single();

    if (insertError) {
      console.error(
        "Insert score error:",
        insertError
      );

      return res.status(500).json({
        message: "Failed to add score",
      });
    }

    // Get all user's scores, newest first
    const { data: allScores, error: fetchError } =
      await supabase
        .from("scores")
        .select("*")
        .eq("user_id", req.user.id)
        .order("score_date", {
          ascending: false,
        });

    if (fetchError) {
      console.error(
        "Fetch scores error:",
        fetchError
      );

      return res.status(500).json({
        message: "Score added but failed to fetch scores",
      });
    }

    // Keep only latest 5 scores
    if (allScores.length > 5) {
      const scoresToDelete = allScores.slice(5);

      const idsToDelete = scoresToDelete.map(
        (item) => item.id
      );

      const { error: deleteError } =
        await supabase
          .from("scores")
          .delete()
          .eq("user_id", req.user.id)
          .in("id", idsToDelete);

      if (deleteError) {
        console.error(
          "Delete old scores error:",
          deleteError
        );

        return res.status(500).json({
          message:
            "Score added but failed to remove old scores",
        });
      }
    }

    // Fetch final latest 5 scores
    const { data: finalScores, error: finalError } =
      await supabase
        .from("scores")
        .select("*")
        .eq("user_id", req.user.id)
        .order("score_date", {
          ascending: false,
        })
        .limit(5);

    if (finalError) {
      console.error(
        "Fetch final scores error:",
        finalError
      );

      return res.status(500).json({
        message: "Score added successfully",
        score: newScore,
      });
    }

    return res.status(201).json({
      message: "Score added successfully",
      score: newScore,
      scores: finalScores,
    });
  } catch (error) {
    console.error("Add score error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});
// PUT - Update score
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { score, scoreDate } = req.body;

    if (score === undefined || !scoreDate) {
      return res.status(400).json({
        message: "Score and score date are required",
      });
    }

    const numericScore = Number(score);

    if (
      !Number.isInteger(numericScore) ||
      numericScore < 1 ||
      numericScore > 45
    ) {
      return res.status(400).json({
        message: "Score must be between 1 and 45",
      });
    }

    const { data: existingScore, error: findError } = await supabase
      .from("scores")
      .select("*")
      .eq("id", id)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (findError) {
      console.error("Find score error:", findError);

      return res.status(500).json({
        message: "Failed to find score",
      });
    }

    if (!existingScore) {
      return res.status(404).json({
        message: "Score not found",
      });
    }

    const { data: duplicateScore, error: duplicateError } = await supabase
      .from("scores")
      .select("id")
      .eq("user_id", req.user.id)
      .eq("score_date", scoreDate)
      .neq("id", id)
      .maybeSingle();

    if (duplicateError) {
      console.error("Duplicate date check error:", duplicateError);

      return res.status(500).json({
        message: "Failed to check duplicate date",
      });
    }

    if (duplicateScore) {
      return res.status(400).json({
        message: "A score already exists for this date",
      });
    }

    const { data: updatedScore, error: updateError } = await supabase
      .from("scores")
      .update({
        score: numericScore,
        score_date: scoreDate,
      })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Update score error:", updateError);

      return res.status(500).json({
        message: "Failed to update score",
      });
    }

    return res.json({
      message: "Score updated successfully",
      score: updatedScore,
    });
  } catch (error) {
    console.error("Update score error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

// DELETE - Delete score
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existingScore, error: findError } = await supabase
      .from("scores")
      .select("id")
      .eq("id", id)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (findError) {
      console.error("Find score error:", findError);

      return res.status(500).json({
        message: "Failed to find score",
      });
    }

    if (!existingScore) {
      return res.status(404).json({
        message: "Score not found",
      });
    }

    const { error: deleteError } = await supabase
      .from("scores")
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (deleteError) {
      console.error("Delete score error:", deleteError);

      return res.status(500).json({
        message: "Failed to delete score",
      });
    }

    return res.json({
      message: "Score deleted successfully",
    });
  } catch (error) {
    console.error("Delete score error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;