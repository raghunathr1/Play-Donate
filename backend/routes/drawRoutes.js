const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const supabase = require("../config/supabase");

const DRAW_POOL_PERCENTAGE =
  Number(process.env.DRAW_POOL_PERCENTAGE) || 100;

const generateRandomNumbers = () => {
  const numbers = new Set();

  while (numbers.size < 5) {
    numbers.add(Math.floor(Math.random() * 45) + 1);
  }

  return Array.from(numbers).sort((a, b) => a - b);
};

const generateWeightedNumbers = (scores) => {
  const frequency = {};

  for (let number = 1; number <= 45; number++) {
    frequency[number] = 1;
  }

  for (const score of scores || []) {
    const number = Number(score.score);

    if (number >= 1 && number <= 45) {
      frequency[number] += 5;
    }
  }

  const selected = new Set();

  while (selected.size < 5) {
    const weightedPool = [];

    for (let number = 1; number <= 45; number++) {
      for (let i = 0; i < frequency[number]; i++) {
        weightedPool.push(number);
      }
    }

    const randomIndex = Math.floor(
      Math.random() * weightedPool.length
    );

    selected.add(weightedPool[randomIndex]);
  }

  return Array.from(selected).sort((a, b) => a - b);
};

const validateWinningNumbers = (numbers) => {
  if (!Array.isArray(numbers) || numbers.length !== 5) {
    return false;
  }

  const uniqueNumbers = new Set(numbers);

  if (uniqueNumbers.size !== 5) {
    return false;
  }

  return numbers.every(
    (number) =>
      Number.isInteger(Number(number)) &&
      Number(number) >= 1 &&
      Number(number) <= 45
  );
};

// GET - All draws
router.get("/", async (req, res) => {
  try {
    const { data: draws, error } = await supabase
      .from("draws")
      .select("*")
      .order("draw_month", { ascending: false });

    if (error) {
      console.error("Get draws error:", error);

      return res.status(500).json({
        message: "Failed to fetch draws",
      });
    }

    return res.json({
      draws: draws || [],
    });
  } catch (error) {
    console.error("Get draws error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

// GET - Latest draw
router.get("/latest", async (req, res) => {
  try {
    const { data: draw, error } = await supabase
      .from("draws")
      .select("*")
      .order("draw_month", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Get latest draw error:", error);

      return res.status(500).json({
        message: "Failed to fetch latest draw",
      });
    }

    return res.json({
      draw: draw || null,
    });
  } catch (error) {
    console.error("Get latest draw error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

// POST - Simulate draw
router.post(
  "/simulate",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const {
        drawMonth,
        drawMode = "standard",
        customNumbers,
      } = req.body;

      if (!drawMonth || !/^\d{4}-\d{2}$/.test(drawMonth)) {
        return res.status(400).json({
          message: "Draw month must be in YYYY-MM format",
        });
      }

      if (!["standard", "weighted"].includes(drawMode)) {
        return res.status(400).json({
          message: "Draw mode must be standard or weighted",
        });
      }

      const { data: existingDraw, error: existingError } =
        await supabase
          .from("draws")
          .select("id")
          .eq("draw_month", drawMonth)
          .maybeSingle();

      if (existingError) {
        console.error("Check existing draw error:", existingError);

        return res.status(500).json({
          message: "Failed to check existing draw",
        });
      }

      if (existingDraw) {
        return res.status(400).json({
          message: "A draw already exists for this month",
        });
      }

      let winningNumbers;

      if (customNumbers !== undefined) {
        if (!validateWinningNumbers(customNumbers)) {
          return res.status(400).json({
            message:
              "Custom numbers must contain exactly 5 unique numbers between 1 and 45",
          });
        }

        winningNumbers = customNumbers
          .map(Number)
          .sort((a, b) => a - b);
      } else if (drawMode === "weighted") {
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id")
          .eq("subscription_status", "Active")
          .neq("role", "Admin");

        if (usersError) {
          console.error("Get active users error:", usersError);

          return res.status(500).json({
            message: "Failed to fetch active users",
          });
        }

        const userIds = (users || []).map((user) => user.id);

        let latestScores = [];

        if (userIds.length > 0) {
          const { data: scores, error: scoresError } = await supabase
            .from("scores")
            .select("user_id, score, score_date")
            .in("user_id", userIds)
            .order("score_date", { ascending: false });

          if (scoresError) {
            console.error("Get scores error:", scoresError);

            return res.status(500).json({
              message: "Failed to fetch scores",
            });
          }

          const scoreMap = {};

          for (const score of scores || []) {
            if (!scoreMap[score.user_id]) {
              scoreMap[score.user_id] = [];
            }

            if (scoreMap[score.user_id].length < 5) {
              scoreMap[score.user_id].push(score);
            }
          }

          latestScores = Object.values(scoreMap).flat();
        }

        winningNumbers = generateWeightedNumbers(latestScores);
      } else {
        winningNumbers = generateRandomNumbers();
      }

      const { data: draw, error: insertError } = await supabase
        .from("draws")
        .insert({
          draw_month: drawMonth,
          draw_mode: drawMode,
          winning_numbers: winningNumbers,
          status: "Simulated",
          results_calculated: false,
          jackpot_amount: 0,
          prize_pool: 0,
          jackpot_rolled_over: false,
          winners_5_match: 0,
          winners_4_match: 0,
          winners_3_match: 0,
          jackpot_winner: false,
        })
        .select("*")
        .single();

      if (insertError) {
        console.error("Create draw error:", insertError);

        return res.status(500).json({
          message: "Failed to create draw",
        });
      }

      return res.status(201).json({
        message: "Draw simulated successfully",
        draw,
      });
    } catch (error) {
      console.error("Simulate draw error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// PUT - Publish draw
router.put(
  "/:id/publish",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      const { data: draw, error: findError } = await supabase
        .from("draws")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (findError) {
        console.error("Find draw error:", findError);

        return res.status(500).json({
          message: "Failed to find draw",
        });
      }

      if (!draw) {
        return res.status(404).json({
          message: "Draw not found",
        });
      }

      if (draw.status === "Published") {
        return res.status(400).json({
          message: "Draw is already published",
        });
      }

      const { data: publishedDraw, error: updateError } =
        await supabase
          .from("draws")
          .update({
            status: "Published",
            published_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select("*")
          .single();

      if (updateError) {
        console.error("Publish draw error:", updateError);

        return res.status(500).json({
          message: "Failed to publish draw",
        });
      }

      return res.json({
        message: "Draw published successfully",
        draw: publishedDraw,
      });
    } catch (error) {
      console.error("Publish draw error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// POST - Calculate draw results
router.post(
  "/:id/calculate",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      const { data: draw, error: drawError } = await supabase
        .from("draws")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (drawError) {
        console.error("Get draw error:", drawError);

        return res.status(500).json({
          message: "Failed to fetch draw",
        });
      }

      if (!draw) {
        return res.status(404).json({
          message: "Draw not found",
        });
      }

      if (draw.status !== "Published") {
        return res.status(400).json({
          message: "Draw must be published before calculating results",
        });
      }

      if (draw.results_calculated) {
        return res.status(400).json({
          message: "Draw results have already been calculated",
        });
      }

      const { data: activeUsers, error: usersError } = await supabase
        .from("users")
        .select(
          "id, subscription_plan, subscription_status"
        )
        .eq("subscription_status", "Active")
        .neq("role", "Admin");

      if (usersError) {
        console.error("Get active users error:", usersError);

        return res.status(500).json({
          message: "Failed to fetch active subscribers",
        });
      }

      if (!activeUsers || activeUsers.length === 0) {
        return res.status(400).json({
          message: "No active subscribers available for draw",
        });
      }

      let prizePool = 0;

      for (const user of activeUsers) {
        if (user.subscription_plan === "Yearly") {
          prizePool += 5500;
        } else {
          prizePool += 500;
        }
      }

      prizePool =
        (prizePool * DRAW_POOL_PERCENTAGE) / 100;

      // Get previous published draw for jackpot rollover
      const { data: previousDraw, error: previousDrawError } =
        await supabase
          .from("draws")
          .select("*")
          .eq("status", "Published")
          .neq("id", id)
          .lt("draw_month", draw.draw_month)
          .order("draw_month", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (previousDrawError) {
        console.error(
          "Previous draw lookup error:",
          previousDrawError
        );

        return res.status(500).json({
          message: "Failed to fetch previous draw",
        });
      }

      const previousJackpot =
        previousDraw?.jackpot_amount || 0;

      const { data: scores, error: scoresError } =
        await supabase
          .from("scores")
          .select(
            "id, user_id, score, score_date"
          )
          .in(
            "user_id",
            activeUsers.map((user) => user.id)
          )
          .order("score_date", { ascending: false });

      if (scoresError) {
        console.error("Get scores error:", scoresError);

        return res.status(500).json({
          message: "Failed to fetch subscriber scores",
        });
      }

      const latestScoresMap = {};

      for (const score of scores || []) {
        if (!latestScoresMap[score.user_id]) {
          latestScoresMap[score.user_id] = [];
        }

        if (latestScoresMap[score.user_id].length < 5) {
          latestScoresMap[score.user_id].push(score);
        }
      }

      const winningNumbers = draw.winning_numbers || [];

      const results = [];

      for (const user of activeUsers) {
        const userScores =
          latestScoresMap[user.id] || [];

        const matchedNumbers = userScores.filter(
          (score) =>
            winningNumbers.includes(Number(score.score))
        );

        const matchedCount = matchedNumbers.length;

        if (matchedCount >= 3) {
          let prizeCategory = null;

          if (matchedCount >= 5) {
            prizeCategory = "5 Match";
          } else if (matchedCount === 4) {
            prizeCategory = "4 Match";
          } else if (matchedCount === 3) {
            prizeCategory = "3 Match";
          }

          results.push({
            draw_id: id,
            user_id: user.id,
            matched_numbers: matchedCount,
            prize_category: prizeCategory,
            prize_amount: 0,
            payment_status: "Pending",
            verification_status: "Pending",
          });
        }
      }

      const winners5 = results.filter(
        (result) => result.matched_numbers >= 5
      );

      const winners4 = results.filter(
        (result) => result.matched_numbers === 4
      );

      const winners3 = results.filter(
        (result) => result.matched_numbers === 3
      );

      let jackpotAmount = 0;
      let jackpotRolledOver = false;
      let jackpotWinner = false;

      const fiveMatchPool = prizePool * 0.40;
      const fourMatchPool = prizePool * 0.35;
      const threeMatchPool = prizePool * 0.25;

      if (winners5.length > 0) {
        const amountPerWinner =
          fiveMatchPool / winners5.length;

        for (const winner of winners5) {
          winner.prize_amount = amountPerWinner;
        }

        jackpotWinner = true;
        jackpotAmount = 0;
      } else {
        jackpotAmount =
          previousJackpot + fiveMatchPool;

        jackpotRolledOver = true;
      }

      if (winners4.length > 0) {
        const amountPerWinner =
          fourMatchPool / winners4.length;

        for (const winner of winners4) {
          winner.prize_amount = amountPerWinner;
        }
      }

      if (winners3.length > 0) {
        const amountPerWinner =
          threeMatchPool / winners3.length;

        for (const winner of winners3) {
          winner.prize_amount = amountPerWinner;
        }
      }

      if (results.length > 0) {
        const { error: resultsError } = await supabase
          .from("draw_results")
          .insert(results);

        if (resultsError) {
          console.error(
            "Insert draw results error:",
            resultsError
          );

          return res.status(500).json({
            message: "Failed to save draw results",
          });
        }
      }

      const { data: calculatedDraw, error: updateError } =
        await supabase
          .from("draws")
          .update({
            results_calculated: true,
            prize_pool: prizePool,
            jackpot_amount: jackpotAmount,
            jackpot_rolled_over: jackpotRolledOver,
            winners_5_match: winners5.length,
            winners_4_match: winners4.length,
            winners_3_match: winners3.length,
            jackpot_winner: jackpotWinner,
          })
          .eq("id", id)
          .select("*")
          .single();

      if (updateError) {
        console.error(
          "Update calculated draw error:",
          updateError
        );

        return res.status(500).json({
          message: "Results calculated but draw update failed",
        });
      }

      return res.json({
        message: "Draw results calculated successfully",
        draw: calculatedDraw,
        resultsCount: results.length,
      });
    } catch (error) {
      console.error("Calculate draw error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

module.exports = router;