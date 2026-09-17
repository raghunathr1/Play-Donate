import { useEffect, useState } from "react";
import { apiRequest } from "../../api";
import "./DrawManagement.css";

function DrawManagement() {
  const [draws, setDraws] = useState([]);

  const [drawMonth, setDrawMonth] = useState("");
  const [drawMode, setDrawMode] = useState("standard");
  const [customNumbers, setCustomNumbers] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDraws = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest("/draws");

      setDraws(data.draws || []);
    } catch (error) {
      console.error(
        "Load Draws Error:",
        error.message
      );

      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDraws();
  }, []);

  // =========================
  // SIMULATE DRAW
  // =========================

  const handleSimulateDraw = async () => {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      if (!drawMonth) {
        setError("Please select a draw month.");
        return;
      }

      let numbers = undefined;

      if (customNumbers.trim()) {
        numbers = customNumbers
          .split(",")
          .map((number) =>
            Number(number.trim())
          );

        if (numbers.length !== 5) {
          setError(
            "Please enter exactly 5 numbers."
          );
          return;
        }

        if (
          numbers.some(
            (number) =>
              !Number.isInteger(number) ||
              number < 1 ||
              number > 45
          )
        ) {
          setError(
            "Each custom number must be between 1 and 45."
          );
          return;
        }

        if (new Set(numbers).size !== 5) {
          setError(
            "Custom winning numbers must be unique."
          );
          return;
        }
      }

      const requestBody = {
        drawMonth,
        drawMode,
      };

      if (numbers) {
        requestBody.winningNumbers = numbers;
      }

      const data = await apiRequest(
        "/draws/simulate",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
        }
      );

      setSuccess(
        data.message ||
          "Draw simulated successfully."
      );

      setDrawMonth("");
      setDrawMode("standard");
      setCustomNumbers("");

      await loadDraws();
    } catch (error) {
      console.error(
        "Simulate Draw Error:",
        error.message
      );

      setError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // =========================
  // PUBLISH DRAW
  // =========================

  const handlePublishDraw = async (
    drawId
  ) => {
    const confirmPublish =
      window.confirm(
        "Are you sure you want to publish this draw?"
      );

    if (!confirmPublish) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const data = await apiRequest(
        `/draws/${drawId}/publish`,
        {
          method: "PUT",
        }
      );

      setSuccess(
        data.message ||
          "Draw published successfully."
      );

      await loadDraws();
    } catch (error) {
      console.error(
        "Publish Draw Error:",
        error.message
      );

      setError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // =========================
  // CALCULATE RESULTS
  // =========================

  const handleCalculateResults = async (
    drawId
  ) => {
    const confirmCalculate =
      window.confirm(
        "Calculate winners for this published draw?"
      );

    if (!confirmCalculate) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const data = await apiRequest(
        `/draws/${drawId}/calculate`,
        {
          method: "POST",
        }
      );

      setSuccess(
        data.message ||
          "Draw results calculated successfully."
      );

      await loadDraws();
    } catch (error) {
      console.error(
        "Calculate Results Error:",
        error.message
      );

      setError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div className="draw-admin-page">
        <div className="draw-admin-loading">
          <div className="draw-spinner"></div>

          <h1>Draw Management</h1>

          <p>Loading draws...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="draw-admin-page">

      {/* HEADER */}

      <header className="draw-admin-header">
        <div className="draw-admin-brand">

          <div className="draw-admin-brand-mark">
            DH
          </div>

          <div>
            <h1>Draw Management</h1>

            <p>
              Digital Heroes administration
            </p>
          </div>

        </div>
      </header>

      <main className="draw-admin-main">

        {/* HERO */}

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

        {/* MESSAGES */}

        {error && (
          <div className="draw-message error">
            <strong>Error</strong>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="draw-message success">
            <strong>Success</strong>
            <span>{success}</span>
          </div>
        )}

        {/* SIMULATION */}

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

            <div className="draw-form-group">
              <label>
                Draw Month
              </label>

              <input
                type="month"
                value={drawMonth}
                onChange={(e) =>
                  setDrawMonth(
                    e.target.value
                  )
                }
              />
            </div>

            <div className="draw-form-group">
              <label>
                Draw Mode
              </label>

              <select
                value={drawMode}
                onChange={(e) =>
                  setDrawMode(
                    e.target.value
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

          <div className="draw-form-group">
            <label>
              Custom Winning Numbers
              <span>Optional</span>
            </label>

            <input
              type="text"
              value={customNumbers}
              onChange={(e) =>
                setCustomNumbers(
                  e.target.value
                )
              }
              placeholder="Example: 5, 12, 18, 27, 41"
            />

            <small>
              Leave empty to automatically
              generate winning numbers.
            </small>
          </div>

          <button
            className="draw-primary-btn"
            onClick={handleSimulateDraw}
            disabled={actionLoading}
          >
            {actionLoading
              ? "Processing..."
              : "Simulate Draw"}
          </button>

        </section>

        {/* PRIZE DISTRIBUTION */}

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

            <div className="draw-prize-card jackpot">
              <span className="draw-prize-number">
                5
              </span>

              <div>
                <h3>
                  5 Number Match
                </h3>

                <strong>40%</strong>

                <p>
                  Jackpot prize pool
                </p>
              </div>
            </div>

            <div className="draw-prize-card">
              <span className="draw-prize-number">
                4
              </span>

              <div>
                <h3>
                  4 Number Match
                </h3>

                <strong>35%</strong>

                <p>
                  Prize pool allocation
                </p>
              </div>
            </div>

            <div className="draw-prize-card">
              <span className="draw-prize-number">
                3
              </span>

              <div>
                <h3>
                  3 Number Match
                </h3>

                <strong>25%</strong>

                <p>
                  Prize pool allocation
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* HISTORY */}

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
              <div>🎯</div>

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

              {draws.map((draw) => (

                <article
                  className="draw-history-card"
                  key={draw._id}
                >

                  <div className="draw-card-top">

                    <div>
                      <span>
                        DRAW MONTH
                      </span>

                      <h3>
                        {draw.drawMonth}
                      </h3>
                    </div>

                    <span
                      className={
                        draw.status ===
                        "Published"
                          ? "draw-status published"
                          : "draw-status simulated"
                      }
                    >
                      {draw.status}
                    </span>

                  </div>

                  <div className="draw-mode-row">
                    <span>Draw Mode</span>

                    <strong>
                      {draw.drawMode ===
                      "weighted"
                        ? "Weighted Draw"
                        : "Standard Lottery"}
                    </strong>
                  </div>

                  <div className="winning-numbers-section">

                    <span>
                      WINNING NUMBERS
                    </span>

                    <div className="winning-number-list">

                      {draw.winningNumbers?.map(
                        (number) => (
                          <span
                            key={number}
                          >
                            {number}
                          </span>
                        )
                      )}

                    </div>

                  </div>

                  <div className="draw-financial-grid">

                    <div>
                      <span>
                        Prize Pool
                      </span>

                      <strong>
                        ₹
                        {Number(
                          draw.prizePool || 0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Jackpot
                      </span>

                      <strong>
                        ₹
                        {Number(
                          draw.jackpotAmount ||
                            0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>
                    </div>

                  </div>

                  <div className="draw-winner-stats">

                    <div>
                      <span>5 Match</span>
                      <strong>
                        {draw.winners5Match ||
                          0}
                      </strong>
                    </div>

                    <div>
                      <span>4 Match</span>
                      <strong>
                        {draw.winners4Match ||
                          0}
                      </strong>
                    </div>

                    <div>
                      <span>3 Match</span>
                      <strong>
                        {draw.winners3Match ||
                          0}
                      </strong>
                    </div>

                  </div>

                  <div className="draw-rollover">
                    <span>
                      Jackpot Rolled Over
                    </span>

                    <strong>
                      {draw.jackpotRolledOver
                        ? "Yes"
                        : "No"}
                    </strong>
                  </div>

                  <div className="draw-actions">

                    {draw.status ===
                      "Simulated" && (
                      <button
                        className="draw-publish-btn"
                        onClick={() =>
                          handlePublishDraw(
                            draw._id
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

                    {draw.status ===
                      "Published" && (
                      <button
                        className="draw-calculate-btn"
                        onClick={() =>
                          handleCalculateResults(
                            draw._id
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

                  </div>

                  {draw.status ===
                    "Published" && (
                    <div className="draw-published-note">
                      ✓ Draw has been published.
                    </div>
                  )}

                </article>

              ))}

            </div>
          )}

        </section>

      </main>
    </div>
  );
}

export default DrawManagement;
