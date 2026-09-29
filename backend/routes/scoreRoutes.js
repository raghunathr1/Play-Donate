const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const supabase = require("../config/supabase");

// =====================================================
// HELPER - CHECK ACTIVE SUBSCRIPTION
// =====================================================

const requireActiveSubscription = async (req, res) => {
  try {
    const {
      data: user,
      error,
    } = await supabase
      .from("users")
      .select("subscription_status")
      .eq("id", req.user.id)
      .maybeSingle();

    if (error) {
      console.error(
        "Check subscription status error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to verify subscription status",
      });
    }

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const status = String(
      user.subscription_status || ""
    )
      .trim()
      .toLowerCase();

    if (status !== "active") {
      return res.status(403).json({
        message:
          "An active subscription is required to access golf scores",
      });
    }

    return true;
  } catch (error) {
    console.error(
      "Subscription verification error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to verify subscription",
    });
  }
};

// =====================================================
// GET - CURRENT USER'S SCORES
// GET /api/scores
// =====================================================

router.get(
  "/",
  authMiddleware,
  async (req, res) => {
    try {
      // -------------------------------------------------
      // ACTIVE SUBSCRIPTION REQUIRED
      // -------------------------------------------------

      const subscriptionAllowed =
        await requireActiveSubscription(
          req,
          res
        );

      if (subscriptionAllowed !== true) {
        return;
      }

      // -------------------------------------------------
      // GET SCORES
      // -------------------------------------------------

      const {
        data: scores,
        error,
      } = await supabase
        .from("scores")
        .select("*")
        .eq(
          "user_id",
          req.user.id
        )
        .order(
          "score_date",
          {
            ascending: false,
          }
        );

      if (error) {
        console.error(
          "Get scores error:",
          error
        );

        return res.status(500).json({
          message:
            "Failed to fetch scores",
        });
      }

      return res.json({
        scores: scores || [],
      });
    } catch (error) {
      console.error(
        "Get scores error:",
        error
      );

      return res.status(500).json({
        message:
          "Server error",
      });
    }
  }
);

// =====================================================
// POST - ADD SCORE
// POST /api/scores
// =====================================================

router.post(
  "/",
  authMiddleware,
  async (req, res) => {
    try {
      // -------------------------------------------------
      // ACTIVE SUBSCRIPTION REQUIRED
      // -------------------------------------------------

      const subscriptionAllowed =
        await requireActiveSubscription(
          req,
          res
        );

      if (subscriptionAllowed !== true) {
        return;
      }

      const {
        score,
        scoreDate,
      } = req.body;

      // -------------------------------------------------
      // VALIDATE SCORE
      // -------------------------------------------------

      const numericScore =
        Number(score);

      if (
        score === undefined ||
        score === null ||
        !Number.isInteger(
          numericScore
        ) ||
        numericScore < 1 ||
        numericScore > 45
      ) {
        return res.status(400).json({
          message:
            "Score must be an integer between 1 and 45",
        });
      }

      // -------------------------------------------------
      // VALIDATE DATE
      // -------------------------------------------------

      if (!scoreDate) {
        return res.status(400).json({
          message:
            "Score date is required",
        });
      }

      // -------------------------------------------------
      // CHECK DUPLICATE DATE
      // -------------------------------------------------

      const {
        data: existingScore,
        error: existingError,
      } = await supabase
        .from("scores")
        .select("id")
        .eq(
          "user_id",
          req.user.id
        )
        .eq(
          "score_date",
          scoreDate
        )
        .maybeSingle();

      if (existingError) {
        console.error(
          "Check existing score error:",
          existingError
        );

        return res.status(500).json({
          message:
            "Failed to check existing score",
        });
      }

      if (existingScore) {
        return res.status(400).json({
          message:
            "A score already exists for this date",
        });
      }

      // -------------------------------------------------
      // INSERT NEW SCORE
      // -------------------------------------------------

      const {
        data: newScore,
        error: insertError,
      } = await supabase
        .from("scores")
        .insert({
          user_id:
            req.user.id,

          score:
            numericScore,

          score_date:
            scoreDate,
        })
        .select()
        .single();

      if (insertError) {
        console.error(
          "Insert score error:",
          insertError
        );

        return res.status(500).json({
          message:
            "Failed to add score",
        });
      }

      // -------------------------------------------------
      // GET ALL USER SCORES
      // NEWEST FIRST
      // -------------------------------------------------

      const {
        data: allScores,
        error: fetchError,
      } = await supabase
        .from("scores")
        .select("*")
        .eq(
          "user_id",
          req.user.id
        )
        .order(
          "score_date",
          {
            ascending: false,
          }
        );

      if (fetchError) {
        console.error(
          "Fetch scores error:",
          fetchError
        );

        return res.status(500).json({
          message:
            "Score added but failed to fetch scores",
        });
      }

      // -------------------------------------------------
      // KEEP ONLY LATEST 5 SCORES
      // -------------------------------------------------

      if (
        allScores &&
        allScores.length > 5
      ) {
        const scoresToDelete =
          allScores.slice(5);

        const idsToDelete =
          scoresToDelete.map(
            (item) =>
              item.id
          );

        const {
          error: deleteError,
        } = await supabase
          .from("scores")
          .delete()
          .eq(
            "user_id",
            req.user.id
          )
          .in(
            "id",
            idsToDelete
          );

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

      // -------------------------------------------------
      // FETCH FINAL LATEST 5 SCORES
      // -------------------------------------------------

      const {
        data: finalScores,
        error: finalError,
      } = await supabase
        .from("scores")
        .select("*")
        .eq(
          "user_id",
          req.user.id
        )
        .order(
          "score_date",
          {
            ascending: false,
          }
        )
        .limit(5);

      if (finalError) {
        console.error(
          "Fetch final scores error:",
          finalError
        );

        return res.status(500).json({
          message:
            "Score added successfully",
          score:
            newScore,
        });
      }

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      return res.status(201).json({
        message:
          "Score added successfully",

        score:
          newScore,

        scores:
          finalScores || [],
      });
    } catch (error) {
      console.error(
        "Add score error:",
        error
      );

      return res.status(500).json({
        message:
          "Server error",
      });
    }
  }
);

// =====================================================
// PUT - UPDATE SCORE
// PUT /api/scores/:id
// =====================================================

router.put(
  "/:id",
  authMiddleware,
  async (req, res) => {
    try {
      // -------------------------------------------------
      // ACTIVE SUBSCRIPTION REQUIRED
      // -------------------------------------------------

      const subscriptionAllowed =
        await requireActiveSubscription(
          req,
          res
        );

      if (subscriptionAllowed !== true) {
        return;
      }

      const {
        id,
      } = req.params;

      const {
        score,
        scoreDate,
      } = req.body;

      // -------------------------------------------------
      // REQUIRED FIELDS
      // -------------------------------------------------

      if (
        score === undefined ||
        score === null ||
        !scoreDate
      ) {
        return res.status(400).json({
          message:
            "Score and score date are required",
        });
      }

      // -------------------------------------------------
      // VALIDATE SCORE
      // -------------------------------------------------

      const numericScore =
        Number(score);

      if (
        !Number.isInteger(
          numericScore
        ) ||
        numericScore < 1 ||
        numericScore > 45
      ) {
        return res.status(400).json({
          message:
            "Score must be an integer between 1 and 45",
        });
      }

      // -------------------------------------------------
      // FIND EXISTING SCORE
      // -------------------------------------------------

      const {
        data: existingScore,
        error: findError,
      } = await supabase
        .from("scores")
        .select("*")
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          req.user.id
        )
        .maybeSingle();

      if (findError) {
        console.error(
          "Find score error:",
          findError
        );

        return res.status(500).json({
          message:
            "Failed to find score",
        });
      }

      if (!existingScore) {
        return res.status(404).json({
          message:
            "Score not found",
        });
      }

      // -------------------------------------------------
      // CHECK DUPLICATE DATE
      // -------------------------------------------------

      const {
        data: duplicateScore,
        error: duplicateError,
      } = await supabase
        .from("scores")
        .select("id")
        .eq(
          "user_id",
          req.user.id
        )
        .eq(
          "score_date",
          scoreDate
        )
        .neq(
          "id",
          id
        )
        .maybeSingle();

      if (duplicateError) {
        console.error(
          "Duplicate date check error:",
          duplicateError
        );

        return res.status(500).json({
          message:
            "Failed to check duplicate date",
        });
      }

      if (duplicateScore) {
        return res.status(400).json({
          message:
            "A score already exists for this date",
        });
      }

      // -------------------------------------------------
      // UPDATE SCORE
      // -------------------------------------------------

      const {
        data: updatedScore,
        error: updateError,
      } = await supabase
        .from("scores")
        .update({
          score:
            numericScore,

          score_date:
            scoreDate,
        })
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          req.user.id
        )
        .select("*")
        .single();

      if (updateError) {
        console.error(
          "Update score error:",
          updateError
        );

        return res.status(500).json({
          message:
            "Failed to update score",
        });
      }

      return res.json({
        message:
          "Score updated successfully",

        score:
          updatedScore,
      });
    } catch (error) {
      console.error(
        "Update score error:",
        error
      );

      return res.status(500).json({
        message:
          "Server error",
      });
    }
  }
);

// =====================================================
// DELETE - DELETE SCORE
// DELETE /api/scores/:id
// =====================================================

router.delete(
  "/:id",
  authMiddleware,
  async (req, res) => {
    try {
      // -------------------------------------------------
      // ACTIVE SUBSCRIPTION REQUIRED
      // -------------------------------------------------

      const subscriptionAllowed =
        await requireActiveSubscription(
          req,
          res
        );

      if (subscriptionAllowed !== true) {
        return;
      }

      const {
        id,
      } = req.params;

      // -------------------------------------------------
      // FIND EXISTING SCORE
      // -------------------------------------------------

      const {
        data: existingScore,
        error: findError,
      } = await supabase
        .from("scores")
        .select("id")
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          req.user.id
        )
        .maybeSingle();

      if (findError) {
        console.error(
          "Find score error:",
          findError
        );

        return res.status(500).json({
          message:
            "Failed to find score",
        });
      }

      if (!existingScore) {
        return res.status(404).json({
          message:
            "Score not found",
        });
      }

      // -------------------------------------------------
      // DELETE SCORE
      // -------------------------------------------------

      const {
        error: deleteError,
      } = await supabase
        .from("scores")
        .delete()
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          req.user.id
        );

      if (deleteError) {
        console.error(
          "Delete score error:",
          deleteError
        );

        return res.status(500).json({
          message:
            "Failed to delete score",
        });
      }

      return res.json({
        message:
          "Score deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete score error:",
        error
      );

      return res.status(500).json({
        message:
          "Server error",
      });
    }
  }
);

// =====================================================
// EXPORT
// =====================================================

module.exports = router;