import { useEffect, useState } from "react";
import { apiRequest } from "../../api";
import "./Draws.css";

function Draws() {
  const [draws, setDraws] = useState([]);
  const [latestDraw, setLatestDraw] = useState(null);
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const prizeLevels = [
    {
      id: 1,
      match: "5 Number Match",
      percentage: "40%",
      description:
        "Match all 5 numbers to qualify for the top prize.",
    },
    {
      id: 2,
      match: "4 Number Match",
      percentage: "35%",
      description:
        "Match any 4 numbers to qualify for the second prize.",
    },
    {
      id: 3,
      match: "3 Number Match",
      percentage: "25%",
      description:
        "Match any 3 numbers to qualify for the third prize.",
    },
  ];

  // =========================================================
  // LOAD DATA
  // =========================================================

  useEffect(() => {
    const loadDraws = async () => {
      try {
        setLoading(true);
        setError("");

        const userData =
          await apiRequest("/auth/me");

        setUser(userData.user);

        const drawData =
          await apiRequest("/draws");

        const allDraws =
          drawData.draws || [];

        setDraws(allDraws);

        try {
          const latestData =
            await apiRequest(
              "/draws/latest"
            );

          setLatestDraw(
            latestData.draw || null
          );
        } catch (latestError) {
          console.error(
            "Latest Draw Error:",
            latestError.message
          );

          const publishedDraws =
            allDraws.filter(
              (draw) =>
                draw.status ===
                "Published"
            );

          setLatestDraw(
            publishedDraws.length > 0
              ? publishedDraws[0]
              : null
          );
        }
      } catch (error) {
        console.error(
          "Load Draws Error:",
          error.message
        );

        setError(
          error.message ||
            "Unable to load draws."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDraws();
  }, []);

  // =========================================================
  // HELPERS
  // =========================================================

  const formatDate = (date) => {
    if (!date) return "N/A";

    return new Date(
      date
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return Number(
      amount || 0
    ).toLocaleString("en-IN");
  };

  const getDrawModeLabel = (
    drawMode
  ) => {
    return drawMode === "weighted"
      ? "Weighted Draw"
      : "Standard Lottery";
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="draws-page">
        <div className="draws-loading">
          <div className="draws-spinner"></div>
          <p>Loading monthly draws...</p>
        </div>
      </div>
    );
  }

  const isEligible =
    user?.subscriptionStatus ===
    "Active";

  return (
    <div className="draws-page">

      {/* HEADER */}

      <header className="draws-header">
        <div className="draws-brand">
          <div className="draws-brand-mark">
            DH
          </div>

          <span>Digital Heroes</span>
        </div>

        <a
          href="/dashboard"
          className="draws-back"
        >
          ← Dashboard
        </a>
      </header>

      {/* HERO */}

      <section className="draws-hero">
        <div>
          <span className="draws-label">
            MONTHLY DRAW
          </span>

          <h1>
            Play for a chance
            <br />
            to create impact.
          </h1>

          <p>
            Participate in the Digital
            Heroes monthly draw using
            your latest Stableford scores.
          </p>
        </div>

        <div className="draws-hero-icon">
          ✦
        </div>
      </section>

      <main className="draws-container">

        {/* ERROR */}

        {error && (
          <div className="draws-message">
            {error}
          </div>
        )}

        {/* PARTICIPATION */}

        <section className="participation-card">

          <div className="participation-heading">
            <div>
              <span className="section-label">
                YOUR PARTICIPATION
              </span>

              <h2>
                Draw eligibility
              </h2>
            </div>

            <span
              className={`eligibility-badge ${
                isEligible
                  ? "eligible"
                  : "not-eligible"
              }`}
            >
              {isEligible
                ? "Eligible"
                : "Not Eligible"}
            </span>
          </div>

          {isEligible ? (
            <div className="eligibility-content">

              <div className="eligibility-icon">
                ✓
              </div>

              <div>
                <h3>
                  Your subscription is active
                </h3>

                <p>
                  Your latest Stableford
                  scores will be considered
                  for monthly draw
                  participation.
                </p>

                <div className="eligibility-meta">

                  {user?.subscriptionPlan && (
                    <span>
                      Plan:{" "}
                      <strong>
                        {
                          user.subscriptionPlan
                        }
                      </strong>
                    </span>
                  )}

                  {user?.subscriptionEndDate && (
                    <span>
                      Ends:{" "}
                      <strong>
                        {formatDate(
                          user.subscriptionEndDate
                        )}
                      </strong>
                    </span>
                  )}

                </div>
              </div>

            </div>
          ) : (
            <div className="not-eligible-content">

              <div className="not-eligible-icon">
                !
              </div>

              <div>
                <h3>
                  An active subscription is
                  required
                </h3>

                <p>
                  Subscribe to participate
                  in the Digital Heroes
                  monthly draw.
                </p>

                <a
                  href="/subscription"
                  className="draw-action-btn"
                >
                  View Subscription
                </a>
              </div>

            </div>
          )}

        </section>

        {/* LATEST DRAW */}

        <section className="latest-draw-section">

          <div className="section-heading">
            <span className="section-label">
              LATEST RESULT
            </span>

            <h2>
              Latest Published Draw
            </h2>
          </div>

          {!latestDraw ? (
            <div className="no-draw-card">
              <div className="no-draw-icon">
                ✦
              </div>

              <h3>
                No published draw yet
              </h3>

              <p>
                The latest draw will appear
                here once the administrator
                publishes it.
              </p>
            </div>
          ) : (
            <div className="latest-draw-card">

              <div className="draw-card-top">

                <div>
                  <span>
                    DRAW MONTH
                  </span>

                  <h3>
                    {latestDraw.drawMonth}
                  </h3>
                </div>

                <div className="draw-status">
                  {latestDraw.status}
                </div>

              </div>

              <div className="draw-mode">
                {getDrawModeLabel(
                  latestDraw.drawMode
                )}
              </div>

              {/* NUMBERS */}

              <div className="winning-section">

                <span className="small-label">
                  WINNING NUMBERS
                </span>

                {latestDraw.winningNumbers
                  ?.length > 0 ? (
                  <div className="winning-numbers">
                    {latestDraw.winningNumbers.map(
                      (number) => (
                        <span
                          key={number}
                          className="winning-number"
                        >
                          {number}
                        </span>
                      )
                    )}
                  </div>
                ) : (
                  <p>
                    Winning numbers not
                    available.
                  </p>
                )}

              </div>

              {/* PRIZE */}

              <div className="draw-financials">

                <div className="financial-card highlight">
                  <span>
                    PRIZE POOL
                  </span>

                  <strong>
                    ₹
                    {formatCurrency(
                      latestDraw.prizePool
                    )}
                  </strong>
                </div>

                <div className="financial-card">
                  <span>
                    JACKPOT
                  </span>

                  <strong>
                    ₹
                    {formatCurrency(
                      latestDraw.jackpotAmount
                    )}
                  </strong>
                </div>

              </div>

              {/* ROLLOVER */}

              {latestDraw.jackpotRolledOver && (
                <div className="draw-notice rollover">
                  🔄 Jackpot rolled over to
                  the next draw.
                </div>
              )}

              {latestDraw.jackpotWinner && (
                <div className="draw-notice winner">
                  🎉 A 5-number jackpot
                  winner was recorded.
                </div>
              )}

              {/* WINNERS */}

              <div className="winner-counts">

                <div>
                  <strong>
                    {latestDraw.winners5Match ||
                      0}
                  </strong>

                  <span>
                    5 Matches
                  </span>
                </div>

                <div>
                  <strong>
                    {latestDraw.winners4Match ||
                      0}
                  </strong>

                  <span>
                    4 Matches
                  </span>
                </div>

                <div>
                  <strong>
                    {latestDraw.winners3Match ||
                      0}
                  </strong>

                  <span>
                    3 Matches
                  </span>
                </div>

              </div>

              {latestDraw.publishedAt && (
                <p className="published-date">
                  Published{" "}
                  {formatDate(
                    latestDraw.publishedAt
                  )}
                </p>
              )}

            </div>
          )}

        </section>

        {/* HISTORY */}

        <section className="history-section">

          <div className="section-heading">
            <span className="section-label">
              PAST DRAWS
            </span>

            <h2>
              Draw History
            </h2>
          </div>

          {draws.length === 0 ? (
            <div className="empty-history">
              No draws are available yet.
            </div>
          ) : (
            <div className="history-list">

              {draws.map((draw) => (
                <div
                  key={draw._id}
                  className="history-card"
                >

                  <div className="history-main">

                    <span className="history-month">
                      {draw.drawMonth}
                    </span>

                    <span
                      className={`history-status ${
                        draw.status ===
                        "Published"
                          ? "published"
                          : "simulated"
                      }`}
                    >
                      {draw.status}
                    </span>

                  </div>

                  <div className="history-mode">
                    {getDrawModeLabel(
                      draw.drawMode
                    )}
                  </div>

                  {draw.status ===
                    "Published" && (
                    <>
                      <div className="history-numbers">
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

                      <div className="history-prize">
                        <span>
                          Prize Pool
                        </span>

                        <strong>
                          ₹
                          {formatCurrency(
                            draw.prizePool
                          )}
                        </strong>
                      </div>

                      <div className="history-winners">
                        <span>
                          5:{" "}
                          {draw.winners5Match ||
                            0}
                        </span>

                        <span>
                          4:{" "}
                          {draw.winners4Match ||
                            0}
                        </span>

                        <span>
                          3:{" "}
                          {draw.winners3Match ||
                            0}
                        </span>
                      </div>
                    </>
                  )}

                </div>
              ))}

            </div>
          )}

        </section>

        {/* PRIZE STRUCTURE */}

        <section className="prize-section">

          <div className="section-heading">
            <span className="section-label">
              PRIZE STRUCTURE
            </span>

            <h2>
              How the prize pool is shared
            </h2>

            <p>
              The prize pool is divided
              between the three matching
              levels.
            </p>
          </div>

          <div className="prize-grid">

            {prizeLevels.map(
              (prize) => (
                <div
                  key={prize.id}
                  className="prize-card"
                >

                  <div className="prize-number">
                    0{prize.id}
                  </div>

                  <span className="prize-percentage">
                    {prize.percentage}
                  </span>

                  <h3>
                    {prize.match}
                  </h3>

                  <p>
                    {prize.description}
                  </p>

                </div>
              )
            )}

          </div>

        </section>

        {/* HOW IT WORKS */}

        <section className="how-section">

          <div className="section-heading">
            <span className="section-label">
              THE PROCESS
            </span>

            <h2>
              How the draw works
            </h2>
          </div>

          <div className="steps">

            {[
              "Maintain your latest Stableford golf scores.",
              "Keep an active subscription to participate.",
              "The monthly draw is conducted for eligible participants.",
              "The administrator can conduct a standard or weighted draw.",
              "Five winning numbers are generated between 1 and 45.",
              "Winners are determined by the number of matching scores.",
              "Multiple winners at the same level share that prize equally.",
              "If there is no 5-number winner, the jackpot rolls over.",
            ].map((step, index) => (
              <div
                key={step}
                className="step"
              >
                <span>
                  {String(index + 1).padStart(
                    2,
                    "0"
                  )}
                </span>

                <p>{step}</p>
              </div>
            ))}

          </div>

        </section>

      </main>
    </div>
  );
}

export default Draws;
