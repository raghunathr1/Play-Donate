const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const supabase = require("../config/supabase");

// =====================================================
// CONFIG
// =====================================================

const DRAW_POOL_PERCENTAGE =
  Number(
    process.env.DRAW_POOL_PERCENTAGE
  ) || 100;

const MONTHLY_DRAW_AMOUNT = 500;

const YEARLY_DRAW_AMOUNT = 5500;

const FIVE_MATCH_PERCENTAGE = 0.40;

const FOUR_MATCH_PERCENTAGE = 0.35;

const THREE_MATCH_PERCENTAGE = 0.25;

// =====================================================
// HELPERS
// =====================================================

// -----------------------------------------------------
// Generate 5 random unique numbers
// -----------------------------------------------------

const generateRandomNumbers =
  () => {
    const numbers =
      new Set();

    while (
      numbers.size < 5
    ) {
      numbers.add(
        Math.floor(
          Math.random() * 45
        ) + 1
      );
    }

    return Array.from(
      numbers
    ).sort(
      (a, b) => a - b
    );
  };

// -----------------------------------------------------
// Weighted random number selection
// -----------------------------------------------------

const generateWeightedNumbers =
  (scores) => {
    const frequency = {};

    // -----------------------------------------------
    // Base weight
    // -----------------------------------------------

    for (
      let number = 1;
      number <= 45;
      number++
    ) {
      frequency[number] = 1;
    }

    // -----------------------------------------------
    // Increase weight from scores
    // -----------------------------------------------

    for (
      const score of
        scores || []
    ) {
      const number =
        Number(
          score.score
        );

      if (
        Number.isInteger(
          number
        ) &&
        number >= 1 &&
        number <= 45
      ) {
        frequency[number] += 5;
      }
    }

    const selected =
      new Set();

    // -----------------------------------------------
    // Select 5 numbers
    // -----------------------------------------------

    while (
      selected.size < 5
    ) {
      let totalWeight = 0;

      for (
        let number = 1;
        number <= 45;
        number++
      ) {
        totalWeight +=
          frequency[number];
      }

      let randomValue =
        Math.random() *
        totalWeight;

      let selectedNumber =
        null;

      for (
        let number = 1;
        number <= 45;
        number++
      ) {
        randomValue -=
          frequency[number];

        if (
          randomValue <= 0
        ) {
          selectedNumber =
            number;

          break;
        }
      }

      if (
        selectedNumber !==
          null
      ) {
        selected.add(
          selectedNumber
        );
      }
    }

    return Array.from(
      selected
    ).sort(
      (a, b) => a - b
    );
  };

// =====================================================
// VALIDATE DRAW MONTH
// =====================================================

const validateDrawMonth =
  (drawMonth) => {
    if (
      typeof drawMonth !==
        "string" ||
      !/^\d{4}-\d{2}$/.test(
        drawMonth
      )
    ) {
      return false;
    }

    const [
      year,
      month,
    ] =
      drawMonth
        .split("-")
        .map(Number);

    return (
      year >= 2000 &&
      year <= 9999 &&
      month >= 1 &&
      month <= 12
    );
  };

// =====================================================
// VALIDATE WINNING NUMBERS
// =====================================================

const validateWinningNumbers =
  (numbers) => {
    if (
      !Array.isArray(
        numbers
      ) ||
      numbers.length !== 5
    ) {
      return false;
    }

    const convertedNumbers =
      numbers.map(Number);

    const uniqueNumbers =
      new Set(
        convertedNumbers
      );

    if (
      uniqueNumbers.size !==
      5
    ) {
      return false;
    }

    return convertedNumbers.every(
      (number) =>
        Number.isInteger(
          number
        ) &&
        number >= 1 &&
        number <= 45
    );
  };

// =====================================================
// ROUND MONEY
// =====================================================

const roundMoney =
  (amount) => {
    return Math.round(
      (
        Number(amount) +
        Number.EPSILON
      ) * 100
    ) / 100;
  };

// =====================================================
// GET - ALL DRAWS
// GET /api/draws
// =====================================================

router.get(
  "/",
  async (req, res) => {
    try {
      const {
        data: draws,
        error,
      } =
        await supabase
          .from("draws")
          .select("*")
          .order(
            "draw_month",
            {
              ascending: false,
            }
          );

      if (error) {
        console.error(
          "Get draws error:",
          error
        );

        return res.status(
          500
        ).json({
          message:
            "Failed to fetch draws",

          error:
            process.env.NODE_ENV ===
            "development"
              ? error.message
              : undefined,
        });
      }

      return res.json({
        draws:
          draws || [],
      });
    } catch (error) {
      console.error(
        "Get draws server error:",
        error
      );

      return res.status(
        500
      ).json({
        message:
          "Server error",
      });
    }
  }
);

// =====================================================
// GET - LATEST DRAW
// GET /api/draws/latest
// =====================================================

router.get(
  "/latest",
  async (req, res) => {
    try {
      const {
        data: draw,
        error,
      } =
        await supabase
          .from("draws")
          .select("*")
          .order(
            "draw_month",
            {
              ascending: false,
            }
          )
          .limit(1)
          .maybeSingle();

      if (error) {
        console.error(
          "Get latest draw error:",
          error
        );

        return res.status(
          500
        ).json({
          message:
            "Failed to fetch latest draw",
        });
      }

      return res.json({
        draw:
          draw || null,
      });
    } catch (error) {
      console.error(
        "Get latest draw server error:",
        error
      );

      return res.status(
        500
      ).json({
        message:
          "Server error",
      });
    }
  }
);

// =====================================================
// POST - SIMULATE DRAW
// POST /api/draws/simulate
// =====================================================

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
        winningNumbers,
      } = req.body || {};

      // -------------------------------------------------
      // SUPPORT BOTH CUSTOM NUMBER FIELD NAMES
      // -------------------------------------------------

      const numbersToUse =
        customNumbers !==
        undefined
          ? customNumbers
          : winningNumbers;

      // -------------------------------------------------
      // VALIDATE MONTH
      // -------------------------------------------------

      if (
        !validateDrawMonth(
          drawMonth
        )
      ) {
        return res.status(
          400
        ).json({
          message:
            "Draw month must be a valid YYYY-MM format",
        });
      }

      // -------------------------------------------------
      // VALIDATE MODE
      // -------------------------------------------------

      if (
        ![
          "standard",
          "weighted",
        ].includes(
          drawMode
        )
      ) {
        return res.status(
          400
        ).json({
          message:
            "Draw mode must be standard or weighted",
        });
      }

      // -------------------------------------------------
      // CHECK EXISTING DRAW
      // -------------------------------------------------

      const {
        data: existingDraw,
        error: existingError,
      } =
        await supabase
          .from("draws")
          .select(
            "id, draw_month, status, results_calculated"
          )
          .eq(
            "draw_month",
            drawMonth
          )
          .maybeSingle();

      if (existingError) {
        console.error(
          "Check existing draw error:",
          existingError
        );

        return res.status(
          500
        ).json({
          message:
            "Failed to check existing draw",
        });
      }

      // -------------------------------------------------
      // BLOCK DUPLICATE DRAW
      // -------------------------------------------------

      if (existingDraw) {
        return res.status(
          400
        ).json({
          message:
            `A draw already exists for ${drawMonth}. Please choose another month.`,
        });
      }

      // -------------------------------------------------
      // GENERATE WINNING NUMBERS
      // -------------------------------------------------

      let winningNumbersFinal;

      // -------------------------------------------------
      // CUSTOM NUMBERS
      // -------------------------------------------------

      if (
        numbersToUse !==
        undefined
      ) {
        if (
          !validateWinningNumbers(
            numbersToUse
          )
        ) {
          return res.status(
            400
          ).json({
            message:
              "Custom numbers must contain exactly 5 unique numbers between 1 and 45",
          });
        }

        winningNumbersFinal =
          numbersToUse
            .map(Number)
            .sort(
              (a, b) =>
                a - b
            );
      }

      // -------------------------------------------------
      // WEIGHTED NUMBERS
      // -------------------------------------------------

      else if (
        drawMode ===
        "weighted"
      ) {
        // -----------------------------------------------
        // ACTIVE USERS
        // -----------------------------------------------

        const {
          data: users,
          error: usersError,
        } =
          await supabase
            .from("users")
            .select("id")
            .eq(
              "subscription_status",
              "Active"
            )
            .neq(
              "role",
              "Admin"
            );

        if (usersError) {
          console.error(
            "Get active users error:",
            usersError
          );

          return res.status(
            500
          ).json({
            message:
              "Failed to fetch active users",
          });
        }

        const userIds =
          (users || [])
            .map(
              (user) =>
                user.id
            );

        let latestScores =
          [];

        // -----------------------------------------------
        // SCORES
        // -----------------------------------------------

        if (
          userIds.length >
          0
        ) {
          const {
            data: scores,
            error: scoresError,
          } =
            await supabase
              .from("scores")
              .select(
                `
                  user_id,
                  score,
                  score_date
                `
              )
              .in(
                "user_id",
                userIds
              )
              .order(
                "score_date",
                {
                  ascending: false,
                }
              );

          if (
            scoresError
          ) {
            console.error(
              "Get scores error:",
              scoresError
            );

            return res.status(
              500
            ).json({
              message:
                "Failed to fetch scores",
            });
          }

          // ---------------------------------------------
          // LATEST 5 SCORES PER USER
          // ---------------------------------------------

          const scoreMap =
            {};

          for (
            const score of
              scores || []
          ) {
            if (
              !scoreMap[
                score.user_id
              ]
            ) {
              scoreMap[
                score.user_id
              ] = [];
            }

            if (
              scoreMap[
                score.user_id
              ].length < 5
            ) {
              scoreMap[
                score.user_id
              ].push(
                score
              );
            }
          }

          latestScores =
            Object.values(
              scoreMap
            ).flat();
        }

        winningNumbersFinal =
          generateWeightedNumbers(
            latestScores
          );
      }

      // -------------------------------------------------
      // STANDARD RANDOM DRAW
      // -------------------------------------------------

      else {
        winningNumbersFinal =
          generateRandomNumbers();
      }

      // -------------------------------------------------
      // CREATE DRAW
      // -------------------------------------------------

      const {
        data: draw,
        error: insertError,
      } =
        await supabase
          .from("draws")
          .insert({
            draw_month:
              drawMonth,

            draw_mode:
              drawMode,

            winning_numbers:
              winningNumbersFinal,

            status:
              "Simulated",

            results_calculated:
              false,

            jackpot_amount:
              0,

            prize_pool:
              0,

            jackpot_rolled_over:
              false,

            winners_5_match:
              0,

            winners_4_match:
              0,

            winners_3_match:
              0,

            jackpot_winner:
              false,
          })
          .select("*")
          .single();

      if (insertError) {
        console.error(
          "Create draw error:",
          insertError
        );

        return res.status(
          500
        ).json({
          message:
            "Failed to create draw",
        });
      }

      return res.status(
        201
      ).json({
        message:
          "Draw simulated successfully",

        draw,
      });
    } catch (error) {
      console.error(
        "Simulate draw error:",
        error
      );

      return res.status(
        500
      ).json({
        message:
          "Server error",
      });
    }
  }
);

// =====================================================
// PUT - PUBLISH DRAW
// PUT /api/draws/:id/publish
// =====================================================

router.put(
  "/:id/publish",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } =
        req.params;

      // -------------------------------------------------
      // GET DRAW
      // -------------------------------------------------

      const {
        data: draw,
        error: findError,
      } =
        await supabase
          .from("draws")
          .select("*")
          .eq(
            "id",
            id
          )
          .maybeSingle();

      if (findError) {
        console.error(
          "Find draw error:",
          findError
        );

        return res.status(
          500
        ).json({
          message:
            "Failed to find draw",
        });
      }

      if (!draw) {
        return res.status(
          404
        ).json({
          message:
            "Draw not found",
        });
      }

      // -------------------------------------------------
      // ONLY SIMULATED DRAW
      // -------------------------------------------------

      if (
        normalizeStatus(
          draw.status
        ) !==
        "simulated"
      ) {
        return res.status(
          400
        ).json({
          message:
            "Only a simulated draw can be published",
        });
      }

      // -------------------------------------------------
      // PREVENT PUBLISH AFTER CALCULATION
      // -------------------------------------------------

      if (
        draw.results_calculated ===
        true
      ) {
        return res.status(
          400
        ).json({
          message:
            "Calculated draw cannot be published again",
        });
      }

      // -------------------------------------------------
      // PUBLISH
      // -------------------------------------------------

      const {
        data: publishedDraw,
        error: updateError,
      } =
        await supabase
          .from("draws")
          .update({
            status:
              "Published",

            published_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            id
          )
          .select("*")
          .single();

      if (updateError) {
        console.error(
          "Publish draw error:",
          updateError
        );

        return res.status(
          500
        ).json({
          message:
            "Failed to publish draw",
        });
      }

      return res.json({
        message:
          "Draw published successfully",

        draw:
          publishedDraw,
      });
    } catch (error) {
      console.error(
        "Publish draw server error:",
        error
      );

      return res.status(
        500
      ).json({
        message:
          "Server error",
      });
    }
  }
);

// =====================================================
// POST - CALCULATE DRAW RESULTS
// POST /api/draws/:id/calculate
// =====================================================

router.post(
  "/:id/calculate",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } =
        req.params;

      // -------------------------------------------------
      // GET DRAW
      // -------------------------------------------------

      const {
        data: draw,
        error: drawError,
      } =
        await supabase
          .from("draws")
          .select("*")
          .eq(
            "id",
            id
          )
          .maybeSingle();

      if (drawError) {
        console.error(
          "Get draw error:",
          drawError
        );

        return res.status(
          500
        ).json({
          message:
            "Failed to fetch draw",
        });
      }

      if (!draw) {
        return res.status(
          404
        ).json({
          message:
            "Draw not found",
        });
      }

      // -------------------------------------------------
      // MUST BE PUBLISHED
      // -------------------------------------------------

      if (
        String(
          draw.status || ""
        )
          .trim()
          .toLowerCase() !==
        "published"
      ) {
        return res.status(
          400
        ).json({
          message:
            "Draw must be published before calculating results",
        });
      }

      // -------------------------------------------------
      // PREVENT DUPLICATE CALCULATION
      // -------------------------------------------------

      if (
        draw.results_calculated ===
        true
      ) {
        return res.status(
          400
        ).json({
          message:
            "Draw results have already been calculated",
        });
      }

      // -------------------------------------------------
      // GET ACTIVE SUBSCRIBERS
      // -------------------------------------------------

      const {
        data: activeUsers,
        error: usersError,
      } =
        await supabase
          .from("users")
          .select(
            `
              id,
              subscription_plan,
              subscription_status
            `
          )
          .eq(
            "subscription_status",
            "Active"
          )
          .neq(
            "role",
            "Admin"
          );

      if (usersError) {
        console.error(
          "Get active users error:",
          usersError
        );

        return res.status(
          500
        ).json({
          message:
            "Failed to fetch active subscribers",
        });
      }

      if (
        !activeUsers ||
        activeUsers.length === 0
      ) {
        return res.status(
          400
        ).json({
          message:
            "No active subscribers available for draw",
        });
      }

      // -------------------------------------------------
      // CALCULATE PRIZE POOL
      // -------------------------------------------------

      let prizePool =
        0;

      for (
        const user of
          activeUsers
      ) {
        if (
          String(
            user.subscription_plan ||
              ""
          )
            .trim()
            .toLowerCase() ===
          "yearly"
        ) {
          prizePool +=
            YEARLY_DRAW_AMOUNT;
        } else {
          prizePool +=
            MONTHLY_DRAW_AMOUNT;
        }
      }

      prizePool =
        (
          prizePool *
          DRAW_POOL_PERCENTAGE
        ) / 100;

      prizePool =
        roundMoney(
          prizePool
        );

      // -------------------------------------------------
      // GET PREVIOUS JACKPOT
      // -------------------------------------------------

      const {
        data: previousDraw,
        error:
          previousDrawError,
      } =
        await supabase
          .from("draws")
          .select(
            `
              id,
              draw_month,
              jackpot_amount
            `
          )
          .eq(
            "status",
            "Published"
          )
          .neq(
            "id",
            id
          )
          .lt(
            "draw_month",
            draw.draw_month
          )
          .order(
            "draw_month",
            {
              ascending:
                false,
            }
          )
          .limit(1)
          .maybeSingle();

      if (
        previousDrawError
      ) {
        console.error(
          "Previous draw lookup error:",
          previousDrawError
        );

        return res.status(
          500
        ).json({
          message:
            "Failed to fetch previous draw",
        });
      }

      const previousJackpot =
        roundMoney(
          previousDraw?.jackpot_amount ||
            0
        );

      // -------------------------------------------------
      // GET SCORES
      // -------------------------------------------------

      const activeUserIds =
        activeUsers.map(
          (user) =>
            user.id
        );

      const {
        data: scores,
        error: scoresError,
      } =
        await supabase
          .from("scores")
          .select(
            `
              id,
              user_id,
              score,
              score_date
            `
          )
          .in(
            "user_id",
            activeUserIds
          )
          .order(
            "score_date",
            {
              ascending:
                false,
            }
          );

      if (scoresError) {
        console.error(
          "Get scores error:",
          scoresError
        );

        return res.status(
          500
        ).json({
          message:
            "Failed to fetch subscriber scores",
        });
      }

      // -------------------------------------------------
      // LATEST 5 UNIQUE SCORES PER USER
      // -------------------------------------------------

      const latestScoresMap =
        {};

      for (
        const score of
          scores || []
      ) {
        if (
          !latestScoresMap[
            score.user_id
          ]
        ) {
          latestScoresMap[
            score.user_id
          ] = [];
        }

        const existingNumbers =
          latestScoresMap[
            score.user_id
          ].map(
            (item) =>
              Number(
                item.score
              )
          );

        const currentNumber =
          Number(
            score.score
          );

        if (
          existingNumbers.includes(
            currentNumber
          )
        ) {
          continue;
        }

        if (
          latestScoresMap[
            score.user_id
          ].length < 5
        ) {
          latestScoresMap[
            score.user_id
          ].push(
            score
          );
        }
      }

      // -------------------------------------------------
      // WINNING NUMBERS
      // -------------------------------------------------

      const winningNumbers =
        (
          draw.winning_numbers ||
          []
        ).map(Number);

      if (
        !validateWinningNumbers(
          winningNumbers
        )
      ) {
        return res.status(
          500
        ).json({
          message:
            "Draw contains invalid winning numbers",
        });
      }

      const results =
        [];

      // -------------------------------------------------
      // CHECK EVERY ACTIVE USER
      // -------------------------------------------------

      for (
        const user of
          activeUsers
      ) {
        const userScores =
          latestScoresMap[
            user.id
          ] || [];

        const userNumbers =
          userScores.map(
            (score) =>
              Number(
                score.score
              )
          );

        const matchedNumbers =
          [
            ...new Set(
              userNumbers.filter(
                (number) =>
                  winningNumbers.includes(
                    number
                  )
              )
            ),
          ];

        const matchedCount =
          matchedNumbers.length;

        // -----------------------------------------------
        // ONLY 3+ MATCH IS WINNER
        // -----------------------------------------------

        if (
          matchedCount >= 3
        ) {
          let prizeCategory;

          if (
            matchedCount >= 5
          ) {
            prizeCategory =
              "5 Match";
          } else if (
            matchedCount === 4
          ) {
            prizeCategory =
              "4 Match";
          } else {
            prizeCategory =
              "3 Match";
          }

          results.push({
            draw_id:
              id,

            user_id:
              user.id,

            matched_numbers:
              matchedCount,

            prize_category:
              prizeCategory,

            prize_amount:
              0,

            payment_status:
              "Pending",

            verification_status:
              "Pending",
          });
        }
      }

      // -------------------------------------------------
      // WINNER GROUPS
      // -------------------------------------------------

      const winners5 =
        results.filter(
          (result) =>
            result.matched_numbers >=
            5
        );

      const winners4 =
        results.filter(
          (result) =>
            result.matched_numbers ===
            4
        );

      const winners3 =
        results.filter(
          (result) =>
            result.matched_numbers ===
            3
        );

      // -------------------------------------------------
      // PRIZE POOLS
      // -------------------------------------------------

      const fiveMatchPool =
        roundMoney(
          prizePool *
            FIVE_MATCH_PERCENTAGE
        );

      const fourMatchPool =
        roundMoney(
          prizePool *
            FOUR_MATCH_PERCENTAGE
        );

      const threeMatchPool =
        roundMoney(
          prizePool *
            THREE_MATCH_PERCENTAGE
        );

      // -------------------------------------------------
      // JACKPOT
      // -------------------------------------------------

      let jackpotAmount =
        0;

      let jackpotRolledOver =
        false;

      let jackpotWinner =
        false;

      if (
        winners5.length > 0
      ) {
        const amountPerWinner =
          roundMoney(
            fiveMatchPool /
              winners5.length
          );

        for (
          const winner of
            winners5
        ) {
          winner.prize_amount =
            amountPerWinner;
        }

        jackpotWinner =
          true;

        jackpotAmount =
          0;
      } else {
        jackpotAmount =
          roundMoney(
            previousJackpot +
              fiveMatchPool
          );

        jackpotRolledOver =
          true;
      }

      // -------------------------------------------------
      // 4 MATCH PRIZES
      // -------------------------------------------------

      if (
        winners4.length > 0
      ) {
        const amountPerWinner =
          roundMoney(
            fourMatchPool /
              winners4.length
          );

        for (
          const winner of
            winners4
        ) {
          winner.prize_amount =
            amountPerWinner;
        }
      }

      // -------------------------------------------------
      // 3 MATCH PRIZES
      // -------------------------------------------------

      if (
        winners3.length > 0
      ) {
        const amountPerWinner =
          roundMoney(
            threeMatchPool /
              winners3.length
          );

        for (
          const winner of
            winners3
        ) {
          winner.prize_amount =
            amountPerWinner;
        }
      }

      // -------------------------------------------------
      // SAVE WINNERS
      // -------------------------------------------------

      if (
        results.length > 0
      ) {
        const {
          error:
            resultsError,
        } =
          await supabase
            .from(
              "draw_results"
            )
            .insert(
              results
            );

        if (
          resultsError
        ) {
          console.error(
            "Insert draw results error:",
            resultsError
          );

          return res.status(
            500
          ).json({
            message:
              "Failed to save draw results",
          });
        }
      }

      // -------------------------------------------------
      // UPDATE DRAW
      // -------------------------------------------------

      const {
        data: calculatedDraw,
        error: updateError,
      } =
        await supabase
          .from("draws")
          .update({
            results_calculated:
              true,

            prize_pool:
              prizePool,

            jackpot_amount:
              jackpotAmount,

            jackpot_rolled_over:
              jackpotRolledOver,

            winners_5_match:
              winners5.length,

            winners_4_match:
              winners4.length,

            winners_3_match:
              winners3.length,

            jackpot_winner:
              jackpotWinner,
          })
          .eq(
            "id",
            id
          )
          .select("*")
          .single();

      if (updateError) {
        console.error(
          "Update calculated draw error:",
          updateError
        );

        return res.status(
          500
        ).json({
          message:
            "Results calculated but draw update failed",
        });
      }

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      return res.json({
        message:
          "Draw results calculated successfully",

        draw:
          calculatedDraw,

        resultsCount:
          results.length,

        winners: {
          fiveMatch:
            winners5.length,

          fourMatch:
            winners4.length,

          threeMatch:
            winners3.length,
        },

        prizePool: {
          total:
            prizePool,

          fiveMatch:
            fiveMatchPool,

          fourMatch:
            fourMatchPool,

          threeMatch:
            threeMatchPool,
        },

        jackpot: {
          previous:
            previousJackpot,

          current:
            jackpotAmount,

          rolledOver:
            jackpotRolledOver,

          winner:
            jackpotWinner,
        },
      });
    } catch (error) {
      console.error(
        "Calculate draw error:",
        error
      );

      return res.status(
        500
      ).json({
        message:
          "Server error",
      });
    }
  }
);

// =====================================================
// INTERNAL STATUS HELPER
// =====================================================

function normalizeStatus(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}

// =====================================================
// EXPORT
// =====================================================

module.exports = router;