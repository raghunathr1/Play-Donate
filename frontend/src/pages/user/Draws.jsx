import { useEffect, useState } from "react";
import { apiRequest } from "../../api";
import "./Draws.css";

function Draws() {
  const [draws, setDraws] = useState([]);
  const [latestDraw, setLatestDraw] = useState(null);
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // PRIZE LEVELS
  // =========================================================

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

        // =====================================================
        // CURRENT USER
        // =====================================================

        const userData =
          await apiRequest("/auth/me");

        console.log(
          "Draws - User Data:",
          userData
        );

        const currentUser =
          userData?.user ||
          userData ||
          null;

        setUser(currentUser);

        // =====================================================
        // ALL DRAWS
        // =====================================================

        const drawData =
          await apiRequest("/draws");

        const allDraws =
          Array.isArray(drawData?.draws)
            ? drawData.draws
            : [];

        setDraws(allDraws);

        // =====================================================
        // LATEST PUBLISHED DRAW
        // =====================================================

        try {
          const latestData =
            await apiRequest(
              "/draws/latest"
            );

          setLatestDraw(
            latestData?.draw ||
              null
          );
        } catch (latestError) {
          console.error(
            "Latest Draw Error:",
            latestError.message
          );

          const publishedDraws =
            allDraws.filter(
              (draw) =>
                String(
                  draw?.status || ""
                ).toLowerCase() ===
                "published"
            );

          setLatestDraw(
            publishedDraws.length > 0
              ? publishedDraws[0]
              : null
          );
        }
      } catch (loadError) {
        console.error(
          "Load Draws Error:",
          loadError.message
        );

        setError(
          loadError.message ||
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
    if (!date) {
      return "N/A";
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "N/A";
    }

    return parsedDate.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const formatCurrency = (amount) => {
    const value =
      Number(amount || 0);

    return value.toLocaleString(
      "en-IN"
    );
  };

  const getDrawModeLabel = (
    drawMode
  ) => {
    return (
      String(
        drawMode || ""
      ).toLowerCase() ===
      "weighted"
        ? "Weighted Draw"
        : "Standard Lottery"
    );
  };

  const getStatusClass = (status) => {
    return String(
      status || ""
    )
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
  };

  // =========================================================
  // SUBSCRIPTION DATA
  // =========================================================

  const subscriptionStatus =
    user?.subscriptionStatus ??
    user?.subscription_status ??
    "";

  const subscriptionPlan =
    user?.subscriptionPlan ??
    user?.subscription_plan ??
    "";

  const subscriptionStartDate =
    user?.subscriptionStartDate ??
    user?.subscription_start_date ??
    user?.subscriptionStartedAt ??
    user?.subscription_started_at ??
    user?.subscription?.startDate ??
    user?.subscription?.startedAt ??
    user?.subscription?.createdAt ??
    null;

  const subscriptionEndDate =
    user?.subscriptionEndDate ??
    user?.subscription_end_date ??
    user?.subscription?.endDate ??
    user?.subscription?.expiresAt ??
    null;

  // =========================================================
  // SUBSCRIPTION ELIGIBILITY
  // =========================================================

  const normalizedSubscriptionStatus =
    String(
      subscriptionStatus
    )
      .trim()
      .toLowerCase();

  const isEligible =
    normalizedSubscriptionStatus ===
    "active";

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="draws-page">

        <div className="draws-loading">

          <div className="draws-spinner"></div>

          <p>
            Loading monthly draws...
          </p>

        </div>

      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="draws-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="draws-header">

        <div className="draws-brand">

          <div className="draws-brand-mark">
            DH
          </div>

          <span>
            Digital Heroes
          </span>

        </div>

        <a
          href="/dashboard"
          className="draws-back"
        >
          ← Dashboard
        </a>

      </header>

      {/* =====================================================
          HERO
      ===================================================== */}

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

        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (
          <div className="draws-message">
            {error}
          </div>
        )}

        {/* =====================================================
            PARTICIPATION
        ===================================================== */}

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

          {/* =================================================
              ELIGIBLE
          ================================================= */}

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

                  {subscriptionPlan && (
                    <span>
                      Plan:{" "}
                      <strong>
                        {subscriptionPlan}
                      </strong>
                    </span>
                  )}

                  {subscriptionStartDate && (
                    <span>
                      Started:{" "}
                      <strong>
                        {formatDate(
                          subscriptionStartDate
                        )}
                      </strong>
                    </span>
                  )}

                  {subscriptionEndDate && (
                    <span>
                      Ends:{" "}
                      <strong>
                        {formatDate(
                          subscriptionEndDate
                        )}
                      </strong>
                    </span>
                  )}

                </div>

              </div>

            </div>

          ) : (

            /* =================================================
               NOT ELIGIBLE
            ================================================= */

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

        {/* =====================================================
            LATEST DRAW
        ===================================================== */}

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
                    {latestDraw.drawMonth ||
                      "N/A"}
                  </h3>

                </div>

                <div className="draw-status">
                  {latestDraw.status ||
                    "N/A"}
                </div>

              </div>

              <div className="draw-mode">

                {getDrawModeLabel(
                  latestDraw.drawMode
                )}

              </div>

              <div className="winning-section">

                <span className="small-label">
                  WINNING NUMBERS
                </span>

                {Array.isArray(
                  latestDraw.winningNumbers
                ) &&
                latestDraw.winningNumbers.length >
                  0 ? (

                  <div className="winning-numbers">

                    {latestDraw.winningNumbers.map(
                      (number, index) => (

                        <span
                          key={`latest-${number}-${index}`}
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

        {/* =====================================================
            DRAW HISTORY
        ===================================================== */}

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

              {draws.map(
                (draw, drawIndex) => (

                  <div
                    key={
                      draw?._id ||
                      draw?.id ||
                      `draw-${drawIndex}`
                    }
                    className="history-card"
                  >

                    <div className="history-main">

                      <span className="history-month">
                        {draw?.drawMonth ||
                          "N/A"}
                      </span>

                      <span
                        className={`history-status ${
                          String(
                            draw?.status || ""
                          ).toLowerCase() ===
                          "published"
                            ? "published"
                            : "simulated"
                        }`}
                      >
                        {draw?.status ||
                          "N/A"}
                      </span>

                    </div>

                    <div className="history-mode">

                      {getDrawModeLabel(
                        draw?.drawMode
                      )}

                    </div>

                    {String(
                      draw?.status || ""
                    ).toLowerCase() ===
                      "published" && (

                      <>

                        <div className="history-numbers">

                          {Array.isArray(
                            draw?.winningNumbers
                          ) &&
                            draw.winningNumbers.map(
                              (
                                number,
                                numberIndex
                              ) => (

                                <span
                                  key={`history-${draw?._id || drawIndex}-${number}-${numberIndex}`}
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
                              draw?.prizePool
                            )}
                          </strong>

                        </div>

                        <div className="history-winners">

                          <span>
                            5:{" "}
                            {draw?.winners5Match ||
                              0}
                          </span>

                          <span>
                            4:{" "}
                            {draw?.winners4Match ||
                              0}
                          </span>

                          <span>
                            3:{" "}
                            {draw?.winners3Match ||
                              0}
                          </span>

                        </div>

                      </>

                    )}

                  </div>

                )
              )}

            </div>

          )}

        </section>

        {/* =====================================================
            PRIZE STRUCTURE
        ===================================================== */}

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

        {/* =====================================================
            HOW IT WORKS
        ===================================================== */}

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
            ].map(
              (step, index) => (

                <div
                  key={`step-${index}`}
                  className="step"
                >

                  <span>
                    {String(
                      index + 1
                    ).padStart(2, "0")}
                  </span>

                  <p>
                    {step}
                  </p>

                </div>

              )
            )}

          </div>

        </section>

      </main>

    </div>
  );
}

export default Draws;