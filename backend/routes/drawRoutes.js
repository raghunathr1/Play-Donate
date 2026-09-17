const express = require("express");

const Draw = require("../models/Draw");
const DrawResult = require("../models/DrawResult");
const Score = require("../models/Score");
const User = require("../models/User");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

/* =========================================================
   GENERATE STANDARD RANDOM WINNING NUMBERS
========================================================= */

const generateWinningNumbers = () => {
  const numbers = [];

  while (numbers.length < 5) {
    const number =
      Math.floor(Math.random() * 45) + 1;

    if (!numbers.includes(number)) {
      numbers.push(number);
    }
  }

  return numbers.sort((a, b) => a - b);
};

/* =========================================================
   GENERATE WEIGHTED WINNING NUMBERS
   Based on frequency of users' latest 5 scores
========================================================= */

const generateWeightedWinningNumbers =
  async () => {
    const users = await User.find({
      subscriptionStatus: "Active",
    }).select("_id");

    const userIds = users.map(
      (user) => user._id
    );

    const scores = await Score.find({
      user: {
        $in: userIds,
      },
    }).sort({
      date: -1,
    });

    const latestScores = new Map();

    for (const score of scores) {
      const userId =
        score.user.toString();

      if (!latestScores.has(userId)) {
        latestScores.set(userId, []);
      }

      const userScores =
        latestScores.get(userId);

      if (userScores.length < 5) {
        userScores.push(score);
      }
    }

    /* -------------------------------------------------------
       Count score frequency
    ------------------------------------------------------- */

    const frequency = {};

    for (
      let number = 1;
      number <= 45;
      number++
    ) {
      frequency[number] = 0;
    }

    for (const userScores of latestScores.values()) {
      for (const score of userScores) {
        const number = Number(
          score.score
        );

        if (
          Number.isInteger(number) &&
          number >= 1 &&
          number <= 45
        ) {
          frequency[number]++;
        }
      }
    }

    /* -------------------------------------------------------
       Weighted selection

       +1 ensures numbers with zero frequency
       can still be selected.
    ------------------------------------------------------- */

    const selectedNumbers = [];

    while (selectedNumbers.length < 5) {
      let totalWeight = 0;

      for (
        let number = 1;
        number <= 45;
        number++
      ) {
        if (
          !selectedNumbers.includes(
            number
          )
        ) {
          totalWeight +=
            frequency[number] + 1;
        }
      }

      let randomValue =
        Math.random() * totalWeight;

      for (
        let number = 1;
        number <= 45;
        number++
      ) {
        if (
          selectedNumbers.includes(
            number
          )
        ) {
          continue;
        }

        const weight =
          frequency[number] + 1;

        randomValue -= weight;

        if (randomValue <= 0) {
          selectedNumbers.push(number);
          break;
        }
      }
    }

    return selectedNumbers.sort(
      (a, b) => a - b
    );
  };

/* =========================================================
   GET ALL DRAWS
========================================================= */

router.get("/", async (req, res) => {
  try {
    const draws = await Draw.find().sort({
      drawMonth: -1,
    });

    res.status(200).json({
      draws,
    });
  } catch (error) {
    console.error(
      "Get Draws Error:",
      error.message
    );

    res.status(500).json({
      message: "Server error",
    });
  }
});

/* =========================================================
   GET LATEST DRAW
========================================================= */

router.get("/latest", async (req, res) => {
  try {
    const draw = await Draw.findOne().sort({
      drawMonth: -1,
    });

    if (!draw) {
      return res.status(404).json({
        message: "No draw found",
      });
    }

    res.status(200).json({
      draw,
    });
  } catch (error) {
    console.error(
      "Get Latest Draw Error:",
      error.message
    );

    res.status(500).json({
      message: "Server error",
    });
  }
});

/* =========================================================
   ADMIN - SIMULATE DRAW
========================================================= */

router.post(
  "/simulate",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const {
        drawMonth,
        winningNumbers:
          customWinningNumbers,
        drawMode = "standard",
      } = req.body;

      /* ---------------------------------------------------
         Validate draw month
      --------------------------------------------------- */

      if (
        !drawMonth ||
        !/^\d{4}-\d{2}$/.test(
          drawMonth
        )
      ) {
        return res.status(400).json({
          message:
            "drawMonth must be in YYYY-MM format",
        });
      }

      /* ---------------------------------------------------
         Validate draw mode
      --------------------------------------------------- */

      if (
        !["standard", "weighted"].includes(
          drawMode
        )
      ) {
        return res.status(400).json({
          message:
            "drawMode must be standard or weighted",
        });
      }

      /* ---------------------------------------------------
         Check duplicate draw
      --------------------------------------------------- */

      const existingDraw =
        await Draw.findOne({
          drawMonth,
        });

      if (existingDraw) {
        return res.status(400).json({
          message:
            "Draw for this month already exists",
        });
      }

      let winningNumbers;

      /* ---------------------------------------------------
         CUSTOM NUMBERS
      --------------------------------------------------- */

      if (
        customWinningNumbers !==
        undefined
      ) {
        if (
          !Array.isArray(
            customWinningNumbers
          ) ||
          customWinningNumbers.length !== 5
        ) {
          return res.status(400).json({
            message:
              "Winning numbers must contain exactly 5 numbers",
          });
        }

        const validNumbers =
          customWinningNumbers.every(
            (number) =>
              Number.isInteger(number) &&
              number >= 1 &&
              number <= 45
          );

        if (!validNumbers) {
          return res.status(400).json({
            message:
              "Winning numbers must be between 1 and 45",
          });
        }

        if (
          new Set(
            customWinningNumbers
          ).size !== 5
        ) {
          return res.status(400).json({
            message:
              "Winning numbers must be unique",
          });
        }

        winningNumbers =
          customWinningNumbers.sort(
            (a, b) => a - b
          );
      }

      /* ---------------------------------------------------
         STANDARD / WEIGHTED NUMBERS
      --------------------------------------------------- */

      else if (
        drawMode === "weighted"
      ) {
        winningNumbers =
          await generateWeightedWinningNumbers();
      } else {
        winningNumbers =
          generateWinningNumbers();
      }

      /* ---------------------------------------------------
         CREATE DRAW
      --------------------------------------------------- */

      const draw = await Draw.create({
        drawMonth,

        drawMode,

        winningNumbers,

        status: "Simulated",

        resultsCalculated: false,
      });

      res.status(201).json({
        message:
          "Draw simulated successfully",

        draw,
      });
    } catch (error) {
      console.error(
        "Simulate Draw Error:",
        error.message
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

/* =========================================================
   ADMIN - PUBLISH DRAW
========================================================= */

router.put(
  "/:id/publish",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const draw =
        await Draw.findById(
          req.params.id
        );

      if (!draw) {
        return res.status(404).json({
          message: "Draw not found",
        });
      }

      if (
        draw.status === "Published"
      ) {
        return res.status(400).json({
          message:
            "Draw is already published",
        });
      }

      draw.status = "Published";

      draw.publishedAt =
        new Date();

      await draw.save();

      res.status(200).json({
        message:
          "Draw published successfully",

        draw,
      });
    } catch (error) {
      console.error(
        "Publish Draw Error:",
        error.message
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

/* =========================================================
   ADMIN - CALCULATE DRAW RESULTS
========================================================= */

router.post(
  "/:id/calculate",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const draw =
        await Draw.findById(
          req.params.id
        );

      if (!draw) {
        return res.status(404).json({
          message: "Draw not found",
        });
      }

      /* ---------------------------------------------------
         Draw must be published
      --------------------------------------------------- */

      if (
        draw.status !== "Published"
      ) {
        return res.status(400).json({
          message:
            "Only published draws can be calculated",
        });
      }

      /* ---------------------------------------------------
         PREVENT DUPLICATE CALCULATION
      --------------------------------------------------- */

      if (draw.resultsCalculated) {
        return res.status(400).json({
          message:
            "Draw results have already been calculated",
        });
      }

      /* ---------------------------------------------------
         Get active subscribers
      --------------------------------------------------- */

      const activeUsers =
        await User.find({
          subscriptionStatus: "Active",
        });

      /* ---------------------------------------------------
         Calculate current subscription pool
      --------------------------------------------------- */

      let totalSubscriptionAmount = 0;

      for (const user of activeUsers) {
        if (
          user.subscriptionPlan ===
          "Yearly"
        ) {
          totalSubscriptionAmount +=
            5500;
        } else {
          totalSubscriptionAmount +=
            500;
        }
      }

      const poolPercentage =
        Number(
          process.env
            .DRAW_POOL_PERCENTAGE || 100
        );

      const currentPool =
        totalSubscriptionAmount *
        (poolPercentage / 100);

      /* ---------------------------------------------------
         Previous jackpot
      --------------------------------------------------- */

      const previousDraw =
        await Draw.findOne({
          status: "Published",

          drawMonth: {
            $lt: draw.drawMonth,
          },
        }).sort({
          drawMonth: -1,
        });

      const previousJackpot =
        previousDraw?.jackpotAmount || 0;

      const totalPrizePool =
        currentPool +
        previousJackpot;

      /* ---------------------------------------------------
         Get latest 5 scores of every user
      --------------------------------------------------- */

      const winners5 = [];
      const winners4 = [];
      const winners3 = [];

      for (const user of activeUsers) {
        const scores =
          await Score.find({
            user: user._id,
          })
            .sort({
              date: -1,
            })
            .limit(5);

        const userNumbers =
          scores.map((score) =>
            Number(score.score)
          );

        const matchedNumbers =
          userNumbers.filter(
            (number) =>
              draw.winningNumbers.includes(
                number
              )
          );

        const matchCount =
          new Set(
            matchedNumbers
          ).size;

        if (matchCount === 5) {
          winners5.push(user);
        } else if (
          matchCount === 4
        ) {
          winners4.push(user);
        } else if (
          matchCount === 3
        ) {
          winners3.push(user);
        }
      }

      /* ---------------------------------------------------
         PRIZE POOL

         5 Match = 40%
         4 Match = 35%
         3 Match = 25%
      --------------------------------------------------- */

      const prize5 =
        totalPrizePool * 0.4;

      const prize4 =
        totalPrizePool * 0.35;

      const prize3 =
        totalPrizePool * 0.25;

      const winnerResults = [];

      /* ---------------------------------------------------
         5 MATCH WINNERS
      --------------------------------------------------- */

      if (winners5.length > 0) {
        const amountPerWinner =
          prize5 /
          winners5.length;

        for (const user of winners5) {
          winnerResults.push({
            draw: draw._id,

            user: user._id,

            matchedNumbers: 5,

            prizeCategory:
              "5 Match",

            prizeAmount:
              amountPerWinner,

            paymentStatus:
              "Pending",

            verificationStatus:
              "Pending",
          });
        }
      }

      /* ---------------------------------------------------
         4 MATCH WINNERS
      --------------------------------------------------- */

      if (winners4.length > 0) {
        const amountPerWinner =
          prize4 /
          winners4.length;

        for (const user of winners4) {
          winnerResults.push({
            draw: draw._id,

            user: user._id,

            matchedNumbers: 4,

            prizeCategory:
              "4 Match",

            prizeAmount:
              amountPerWinner,

            paymentStatus:
              "Pending",

            verificationStatus:
              "Pending",
          });
        }
      }

      /* ---------------------------------------------------
         3 MATCH WINNERS
      --------------------------------------------------- */

      if (winners3.length > 0) {
        const amountPerWinner =
          prize3 /
          winners3.length;

        for (const user of winners3) {
          winnerResults.push({
            draw: draw._id,

            user: user._id,

            matchedNumbers: 3,

            prizeCategory:
              "3 Match",

            prizeAmount:
              amountPerWinner,

            paymentStatus:
              "Pending",

            verificationStatus:
              "Pending",
          });
        }
      }

      /* ---------------------------------------------------
         CREATE DRAW RESULTS
      --------------------------------------------------- */

      if (
        winnerResults.length > 0
      ) {
        await DrawResult.insertMany(
          winnerResults
        );
      }

      /* ---------------------------------------------------
         JACKPOT LOGIC

         If NO 5-match winner:
         jackpot rolls over.

         If there IS a 5-match winner:
         jackpot becomes 0.
      --------------------------------------------------- */

      const jackpotRolledOver =
        winners5.length === 0;

      if (
        winners5.length === 0
      ) {
        draw.jackpotAmount =
          totalPrizePool;
      } else {
        draw.jackpotAmount = 0;
      }

      draw.prizePool =
        totalPrizePool;

      draw.jackpotRolledOver =
        jackpotRolledOver;

      draw.winners5Match =
        winners5.length;

      draw.winners4Match =
        winners4.length;

      draw.winners3Match =
        winners3.length;

      draw.jackpotWinner =
        winners5.length > 0;

      /* ---------------------------------------------------
         IMPORTANT:
         Mark calculation as completed.

         This happens even when there are
         zero winners, so the same draw
         cannot be calculated again.
      --------------------------------------------------- */

      draw.resultsCalculated =
        true;

      await draw.save();

      res.status(200).json({
        message:
          "Draw results calculated successfully",

        drawId: draw._id,

        winningNumbers:
          draw.winningNumbers,

        currentPool,

        previousJackpot,

        totalPrizePool,

        resultsCalculated:
          draw.resultsCalculated,

        winners: {
          fiveMatch:
            winners5.length,

          fourMatch:
            winners4.length,

          threeMatch:
            winners3.length,
        },

        prizes: {
          fiveMatch:
            winners5.length > 0
              ? prize5 /
                winners5.length
              : 0,

          fourMatch:
            winners4.length > 0
              ? prize4 /
                winners4.length
              : 0,

          threeMatch:
            winners3.length > 0
              ? prize3 /
                winners3.length
              : 0,
        },

        jackpotRolledOver,

        winnerResults,
      });
    } catch (error) {
      console.error(
        "Calculate Draw Error:",
        error.message
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

module.exports = router;
