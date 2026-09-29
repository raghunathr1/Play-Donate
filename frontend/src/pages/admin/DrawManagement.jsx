import {
  useEffect,
  useState,
} from "react";

import { apiRequest } from "../../api";

import "./DrawManagement.css";

function DrawManagement() {
  const [draws, setDraws] =
    useState([]);

  const [drawMonth, setDrawMonth] =
    useState("");

  const [drawMode, setDrawMode] =
    useState("standard");

  const [customNumbers, setCustomNumbers] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // =====================================================
  // HELPERS
  // =====================================================

  const normalizeStatus = (
    status
  ) => {
    return String(status || "")
      .trim()
      .toLowerCase();
  };

  const isSimulated = (
    status
  ) => {
    return (
      normalizeStatus(status) ===
      "simulated"
    );
  };

  const isPublished = (
    status
  ) => {
    return (
      normalizeStatus(status) ===
      "published"
    );
  };

  const isCalculated = (
    draw
  ) => {
    return (
      draw?.results_calculated ===
        true ||
      draw?.resultsCalculated ===
        true
    );
  };

  const getDrawMonth = (
    draw
  ) => {
    return (
      draw?.draw_month ||
      draw?.drawMonth ||
      "N/A"
    );
  };

  const getDrawMode = (
    draw
  ) => {
    return (
      draw?.draw_mode ||
      draw?.drawMode ||
      "standard"
    );
  };

  const getWinningNumbers = (
    draw
  ) => {
    const numbers =
      draw?.winning_numbers ??
      draw?.winningNumbers;

    return Array.isArray(numbers)
      ? numbers
      : [];
  };

  const getPrizePool = (
    draw
  ) => {
    return Number(
      draw?.prize_pool ??
        draw?.prizePool ??
        0
    );
  };

  const getJackpotAmount = (
    draw
  ) => {
    return Number(
      draw?.jackpot_amount ??
        draw?.jackpotAmount ??
        0
    );
  };

  const getWinners5 = (
    draw
  ) => {
    return Number(
      draw?.winners_5_match ??
        draw?.winners5Match ??
        0
    );
  };

  const getWinners4 = (
    draw
  ) => {
    return Number(
      draw?.winners_4_match ??
        draw?.winners4Match ??
        0
    );
  };

  const getWinners3 = (
    draw
  ) => {
    return Number(
      draw?.winners_3_match ??
        draw?.winners3Match ??
        0
    );
  };

  const isJackpotRolledOver = (
    draw
  ) => {
    return Boolean(
      draw?.jackpot_rolled_over ??
        draw?.jackpotRolledOver ??
        false
    );
  };

  const formatCurrency = (
    amount
  ) => {
    return Number(
      amount || 0
    ).toLocaleString(
      "en-IN"
    );
  };

  const getDrawModeLabel = (
    mode
  ) => {
    return String(mode || "")
      .toLowerCase() ===
      "weighted"
      ? "Weighted Draw"
      : "Standard Lottery";
  };

  // =====================================================
  // LOAD DRAWS
  // =====================================================

  const loadDraws =
    async () => {
      try {
        setLoading(true);
        setError("");

        // IMPORTANT:
        // Explicit GET prevents accidental POST.

        const data =
          await apiRequest(
            "/draws",
            {
              method: "GET",
            }
          );

        const drawList =
          Array.isArray(
            data?.draws
          )
            ? data.draws
            : [];

        setDraws(
          drawList
        );
      } catch (
        loadError
      ) {
        console.error(
          "Load Draws Error:",
          loadError
        );

        const message =
          loadError
            ?.response
            ?.data
            ?.message ||
          loadError?.message ||
          "Unable to load draws.";

        setError(
          message
        );
      } finally {
        setLoading(false);
      }
    };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadDraws();
  }, []);

  // =====================================================
  // SIMULATE DRAW
  // =====================================================

  const handleSimulateDraw =
    async () => {
      try {
        setActionLoading(true);
        setError("");
        setSuccess("");

        // -----------------------------------------------
        // MONTH VALIDATION
        // -----------------------------------------------

        if (!drawMonth) {
          setError(
            "Please select a draw month."
          );

          return;
        }

        // -----------------------------------------------
        // PREVENT DUPLICATE MONTH FROM FRONTEND
        // -----------------------------------------------

        const existingDraw =
          draws.find(
            (draw) =>
              getDrawMonth(
                draw
              ) ===
              drawMonth
          );

        if (existingDraw) {
          setError(
            `A draw already exists for ${drawMonth}. Please choose another month.`
          );

          return;
        }

        // -----------------------------------------------
        // CUSTOM NUMBERS
        // -----------------------------------------------

        let numbers;

        if (
          customNumbers.trim()
        ) {
          numbers =
            customNumbers
              .split(",")
              .map(
                (number) =>
                  Number(
                    number.trim()
                  )
              );

          if (
            numbers.length !== 5
          ) {
            setError(
              "Please enter exactly 5 numbers."
            );

            return;
          }

          if (
            numbers.some(
              (number) =>
                !Number.isInteger(
                  number
                ) ||
                number < 1 ||
                number > 45
            )
          ) {
            setError(
              "Each custom number must be between 1 and 45."
            );

            return;
          }

          if (
            new Set(
              numbers
            ).size !== 5
          ) {
            setError(
              "Custom winning numbers must be unique."
            );

            return;
          }
        }

        // -----------------------------------------------
        // REQUEST BODY
        // -----------------------------------------------

        const requestBody = {
          drawMonth:
            drawMonth,

          drawMode:
            drawMode,
        };

        if (numbers) {
          requestBody.customNumbers =
            numbers;
        }

        // -----------------------------------------------
        // SIMULATE
        // -----------------------------------------------

        const data =
          await apiRequest(
            "/draws/simulate",
            {
              method: "POST",

              body:
                JSON.stringify(
                  requestBody
                ),
            }
          );

        setSuccess(
          data?.message ||
            "Draw simulated successfully."
        );

        // -----------------------------------------------
        // RESET FORM
        // -----------------------------------------------

        setDrawMonth("");

        setDrawMode(
          "standard"
        );

        setCustomNumbers("");

        // -----------------------------------------------
        // RELOAD
        // -----------------------------------------------

        await loadDraws();
      } catch (
        simulateError
      ) {
        console.error(
          "Simulate Draw Error:",
          simulateError
        );

        const message =
          simulateError
            ?.response
            ?.data
            ?.message ||
          simulateError?.message ||
          "Unable to simulate draw.";

        setError(
          message
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  // =====================================================
  // PUBLISH DRAW
  // =====================================================

  const handlePublishDraw =
    async (drawId) => {
      const confirmPublish =
        window.confirm(
          "Are you sure you want to publish this draw?"
        );

      if (!confirmPublish) {
        return;
      }

      try {
        setActionLoading(
          true
        );

        setError("");
        setSuccess("");

        const data =
          await apiRequest(
            `/draws/${drawId}/publish`,
            {
              method: "PUT",
            }
          );

        setSuccess(
          data?.message ||
            "Draw published successfully."
        );

        await loadDraws();
      } catch (
        publishError
      ) {
        console.error(
          "Publish Draw Error:",
          publishError
        );

        const message =
          publishError
            ?.response
            ?.data
            ?.message ||
          publishError?.message ||
          "Unable to publish draw.";

        setError(
          message
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  // =====================================================
  // CALCULATE RESULTS
  // =====================================================

  const handleCalculateResults =
    async (drawId) => {
      const confirmCalculate =
        window.confirm(
          "Calculate winners for this published draw?"
        );

      if (!confirmCalculate) {
        return;
      }

      try {
        setActionLoading(
          true
        );

        setError("");
        setSuccess("");

        const data =
          await apiRequest(
            `/draws/${drawId}/calculate`,
            {
              method: "POST",
            }
          );

        setSuccess(
          data?.message ||
            "Draw results calculated successfully."
        );

        await loadDraws();
      } catch (
        calculateError
      ) {
        console.error(
          "Calculate Results Error:",
          calculateError
        );

        const message =
          calculateError
            ?.response
            ?.data
            ?.message ||
          calculateError?.message ||
          "Unable to calculate results.";

        setError(
          message
        );
      } finally {
        setActionLoading(
          false
        );
      }
    };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="draw-admin-page">
        <div className="draw-admin-loading">

          <div className="draw-spinner"></div>

          <h1>
            Draw Management
          </h1>

          <p>
            Loading draws...
          </p>

        </div>
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="draw-admin-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="draw-admin-header">

        <div className="draw-admin-brand">

          <div className="draw-admin-brand-mark">
            DH
          </div>

          <div>
            <h1>
              Draw Management
            </h1>

            <p>
              Digital Heroes administration
            </p>
          </div>

        </div>

      </header>

      <main className="draw-admin-main">

        {/* =================================================
            HERO
        ================================================= */}

        <section className="draw-admin-hero">

          <div>

            <span className="draw-eyebrow">
              DRAW CONTROL CENTER
            </span>

            <h2>
              Manage Monthly Draws
            </h2>

            <p>
              Simulate, publish and calculate
              monthly Digital Heroes prize
              draws from one place.
            </p>

          </div>

          <div className="draw-count-box">

            <strong>
              {draws.length}
            </strong>

            <span>
              Total Draws
            </span>

          </div>

        </section>

        {/* =================================================
            MESSAGES
        ================================================= */}

        {error && (
          <div className="draw-message error">

            <strong>
              Error
            </strong>

            <span>
              {error}
            </span>

          </div>
        )}

        {success && (
          <div className="draw-message success">

            <strong>
              Success
            </strong>

            <span>
              {success}
            </span>

          </div>
        )}

        {/* =================================================
            SIMULATION
        ================================================= */}

        <section className="draw-simulation-card">

          <div className="draw-section-heading">

            <span>
              CREATE DRAW
            </span>

            <h2>
              Draw Simulation
            </h2>

            <p>
              Create a new monthly draw with
              five unique numbers between
              1 and 45.
            </p>

          </div>

          <div className="draw-form-grid">

            {/* MONTH */}

            <div className="draw-form-group">

              <label>
                Draw Month
              </label>

              <input
                type="month"
                value={drawMonth}
                onChange={(event) =>
                  setDrawMonth(
                    event.target.value
                  )
                }
              />

            </div>

            {/* MODE */}

            <div className="draw-form-group">

              <label>
                Draw Mode
              </label>

              <select
                value={drawMode}
                onChange={(event) =>
                  setDrawMode(
                    event.target.value
                  )
                }
              >

                <option value="standard">
                  Standard Lottery
                </option>

                <option value="weighted">
                  Weighted by Score Frequency
                </option>

              </select>

            </div>

          </div>

          {/* CUSTOM NUMBERS */}

          <div className="draw-form-group">

            <label>
              Custom Winning Numbers

              <span>
                Optional
              </span>
            </label>

            <input
              type="text"
              value={customNumbers}
              onChange={(event) =>
                setCustomNumbers(
                  event.target.value
                )
              }
              placeholder="Example: 5, 12, 18, 27, 41"
            />

            <small>
              Leave empty to automatically
              generate winning numbers.
            </small>

          </div>

          {/* SIMULATE BUTTON */}

          <button
            className="draw-primary-btn"
            onClick={
              handleSimulateDraw
            }
            disabled={
              actionLoading
            }
          >
            {actionLoading
              ? "Processing..."
              : "Simulate Draw"}
          </button>

        </section>

        {/* =================================================
            PRIZE DISTRIBUTION
        ================================================= */}

        <section className="draw-prize-section">

          <div className="draw-section-heading">

            <span>
              PRIZE STRUCTURE
            </span>

            <h2>
              Prize Pool Distribution
            </h2>

          </div>

          <div className="draw-prize-grid">

            {/* 5 MATCH */}

            <div className="draw-prize-card jackpot">

              <span className="draw-prize-number">
                5
              </span>

              <div>

                <h3>
                  5 Number Match
                </h3>

                <strong>
                  40%
                </strong>

                <p>
                  Jackpot prize pool
                </p>

              </div>

            </div>

            {/* 4 MATCH */}

            <div className="draw-prize-card">

              <span className="draw-prize-number">
                4
              </span>

              <div>

                <h3>
                  4 Number Match
                </h3>

                <strong>
                  35%
                </strong>

                <p>
                  Prize pool allocation
                </p>

              </div>

            </div>

            {/* 3 MATCH */}

            <div className="draw-prize-card">

              <span className="draw-prize-number">
                3
              </span>

              <div>

                <h3>
                  3 Number Match
                </h3>

                <strong>
                  25%
                </strong>

                <p>
                  Prize pool allocation
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            HISTORY
        ================================================= */}

        <section className="draw-history-section">

          <div className="draw-section-heading">

            <span>
              HISTORY
            </span>

            <h2>
              Draw History
            </h2>

            <p>
              Review all simulated and
              published monthly draws.
            </p>

          </div>

          {draws.length === 0 ? (

            <div className="draw-empty">

              <div>
                🎯
              </div>

              <h3>
                No draws found
              </h3>

              <p>
                Create your first monthly
                draw above.
              </p>

            </div>

          ) : (

            <div className="draw-history-grid">

              {draws.map(
                (
                  draw,
                  drawIndex
                ) => {

                  const drawKey =
                    draw?.id ||
                    draw?._id ||
                    `draw-${drawIndex}`;

                  const status =
                    draw?.status ||
                    "N/A";

                  const winningNumbers =
                    getWinningNumbers(
                      draw
                    );

                  const calculated =
                    isCalculated(
                      draw
                    );

                  return (
                    <article
                      className="draw-history-card"
                      key={drawKey}
                    >

                      {/* CARD TOP */}

                      <div className="draw-card-top">

                        <div>

                          <span>
                            DRAW MONTH
                          </span>

                          <h3>
                            {getDrawMonth(
                              draw
                            )}
                          </h3>

                        </div>

                        <span
                          className={
                            isPublished(
                              status
                            )
                              ? "draw-status published"
                              : "draw-status simulated"
                          }
                        >
                          {status}
                        </span>

                      </div>

                      {/* DRAW MODE */}

                      <div className="draw-mode-row">

                        <span>
                          Draw Mode
                        </span>

                        <strong>
                          {getDrawModeLabel(
                            getDrawMode(
                              draw
                            )
                          )}
                        </strong>

                      </div>

                      {/* WINNING NUMBERS */}

                      <div className="winning-numbers-section">

                        <span>
                          WINNING NUMBERS
                        </span>

                        <div className="winning-number-list">

                          {winningNumbers.length >
                          0 ? (
                            winningNumbers.map(
                              (
                                number,
                                numberIndex
                              ) => (

                                <span
                                  key={`${drawKey}-number-${number}-${numberIndex}`}
                                >
                                  {number}
                                </span>

                              )
                            )
                          ) : (
                            <span>
                              No numbers
                            </span>
                          )}

                        </div>

                      </div>

                      {/* FINANCIAL */}

                      <div className="draw-financial-grid">

                        <div>

                          <span>
                            Prize Pool
                          </span>

                          <strong>
                            ₹
                            {formatCurrency(
                              getPrizePool(
                                draw
                              )
                            )}
                          </strong>

                        </div>

                        <div>

                          <span>
                            Jackpot
                          </span>

                          <strong>
                            ₹
                            {formatCurrency(
                              getJackpotAmount(
                                draw
                              )
                            )}
                          </strong>

                        </div>

                      </div>

                      {/* WINNER STATS */}

                      <div className="draw-winner-stats">

                        <div>

                          <span>
                            5 Match
                          </span>

                          <strong>
                            {getWinners5(
                              draw
                            )}
                          </strong>

                        </div>

                        <div>

                          <span>
                            4 Match
                          </span>

                          <strong>
                            {getWinners4(
                              draw
                            )}
                          </strong>

                        </div>

                        <div>

                          <span>
                            3 Match
                          </span>

                          <strong>
                            {getWinners3(
                              draw
                            )}
                          </strong>

                        </div>

                      </div>

                      {/* ROLLOVER */}

                      <div className="draw-rollover">

                        <span>
                          Jackpot Rolled Over
                        </span>

                        <strong>
                          {isJackpotRolledOver(
                            draw
                          )
                            ? "Yes"
                            : "No"}
                        </strong>

                      </div>

                      {/* ACTIONS */}

                      <div className="draw-actions">

                        {/* SIMULATED */}

                        {isSimulated(
                          status
                        ) && (

                          <button
                            className="draw-publish-btn"
                            onClick={() =>
                              handlePublishDraw(
                                drawKey
                              )
                            }
                            disabled={
                              actionLoading
                            }
                          >
                            {actionLoading
                              ? "Processing..."
                              : "Publish Draw"}
                          </button>

                        )}

                        {/* PUBLISHED BUT NOT CALCULATED */}

                        {isPublished(
                          status
                        ) &&
                          !calculated && (

                            <button
                              className="draw-calculate-btn"
                              onClick={() =>
                                handleCalculateResults(
                                  drawKey
                                )
                              }
                              disabled={
                                actionLoading
                              }
                            >
                              {actionLoading
                                ? "Calculating..."
                                : "Calculate Results"}
                            </button>

                          )}

                        {/* ALREADY CALCULATED */}

                        {isPublished(
                          status
                        ) &&
                          calculated && (

                            <div className="draw-published-note">

                              ✓ Results calculated

                            </div>

                          )}

                      </div>

                      {/* PUBLISHED NOTE */}

                      {isPublished(
                        status
                      ) &&
                        !calculated && (

                          <div className="draw-published-note">

                            ✓ Draw has been published.
                            Ready to calculate results.

                          </div>

                        )}

                    </article>
                  );
                }
              )}

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

export default DrawManagement;