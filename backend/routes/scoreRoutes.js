const express = require("express");

const Score = require("../models/Score");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// GET ALL SCORES OF LOGGED-IN USER
// ==========================================

router.get("/", authMiddleware, async (req, res) => {
  try {
    const scores = await Score.find({
      user: req.user._id,
    }).sort({
      date: -1,
    });

    res.status(200).json({
      scores,
    });
  } catch (error) {
    console.error("Get Scores Error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
});


// ==========================================
// ADD NEW SCORE
// ==========================================

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { score, date } = req.body;

    // Validate fields
    if (score === undefined || !date) {
      return res.status(400).json({
        message: "Score and date are required",
      });
    }

    // Validate score range
    if (score < 1 || score > 45) {
      return res.status(400).json({
        message: "Score must be between 1 and 45",
      });
    }

    // Check duplicate date
    const existingScore = await Score.findOne({
      user: req.user._id,
      date: new Date(date),
    });

    if (existingScore) {
      return res.status(400).json({
        message: "A score already exists for this date",
      });
    }

    // Create score
    const newScore = await Score.create({
      user: req.user._id,
      score,
      date: new Date(date),
    });

    // Get user's scores
    const allScores = await Score.find({
      user: req.user._id,
    }).sort({
      date: -1,
    });

    // Keep only latest 5
    if (allScores.length > 5) {
      const scoresToDelete = allScores.slice(5);

      const idsToDelete = scoresToDelete.map(
        (item) => item._id
      );

      await Score.deleteMany({
        _id: {
          $in: idsToDelete,
        },
      });
    }

    res.status(201).json({
      message: "Score added successfully",
      score: newScore,
    });
  } catch (error) {
    console.error("Add Score Error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
});


// ==========================================
// UPDATE SCORE
// ==========================================

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { score, date } = req.body;

    // Validate fields
    if (score === undefined || !date) {
      return res.status(400).json({
        message: "Score and date are required",
      });
    }

    // Validate score range
    if (score < 1 || score > 45) {
      return res.status(400).json({
        message: "Score must be between 1 and 45",
      });
    }

    // Find score belonging to current user
    const existingScore = await Score.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!existingScore) {
      return res.status(404).json({
        message: "Score not found",
      });
    }

    // Check duplicate date
    const duplicateDate = await Score.findOne({
      _id: {
        $ne: req.params.id,
      },
      user: req.user._id,
      date: new Date(date),
    });

    if (duplicateDate) {
      return res.status(400).json({
        message: "A score already exists for this date",
      });
    }

    existingScore.score = score;
    existingScore.date = new Date(date);

    await existingScore.save();

    res.status(200).json({
      message: "Score updated successfully",
      score: existingScore,
    });
  } catch (error) {
    console.error("Update Score Error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
});


// ==========================================
// DELETE SCORE
// ==========================================

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deletedScore = await Score.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!deletedScore) {
      return res.status(404).json({
        message: "Score not found",
      });
    }

    res.status(200).json({
      message: "Score deleted successfully",
    });
  } catch (error) {
    console.error("Delete Score Error:", error.message);

    res.status(500).json({
      message: "Server error",
    });
  }
});


module.exports = router;