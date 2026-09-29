import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../../api";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [scores, setScores] = useState([]);
  const [winnings, setWinnings] = useState([]);
  const [donations, setDonations] = useState([]);
  const [draws, setDraws] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [charity, setCharity] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD DASHBOARD DATA
  // =====================================================

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        // =================================================
        // CURRENT USER
        // =================================================

        const userResponse = await apiRequest("/auth/me");

        // Backend kabhi direct user aur kabhi { user } return
        // kare to dono cases handle honge.
        const currentUser =
          userResponse?.user || userResponse || null;

        setUser(currentUser);

        if (currentUser) {
          localStorage.setItem(
            "digitalHeroesUser",
            JSON.stringify(currentUser)
          );
        }

        // =================================================
        // CHECK SUBSCRIPTION STATUS
        // =================================================
        //
        // IMPORTANT:
        // Non-subscriber ke liye /scores API call nahi karenge.
        // Isse unnecessary 403 console error avoid hoga.
        //

        const subscriptionStatus = String(
          currentUser?.subscriptionStatus ||
            currentUser?.subscription_status ||
            "Not Subscribed"
        )
          .trim()
          .toLowerCase();

        const isSubscriptionActive =
          subscriptionStatus === "active";

        // =================================================
        // CHARITY
        // =================================================

        if (currentUser?.charityId) {
          try {
            const charityData = await apiRequest(
              `/charities/${currentUser.charityId}`
            );

            setCharity(
              charityData?.charity || null
            );
          } catch (charityError) {
            console.error(
              "Charity Fetch Error:",
              charityError.message
            );

            setCharity(null);
          }
        } else if (currentUser?.charity_id) {
          try {
            const charityData = await apiRequest(
              `/charities/${currentUser.charity_id}`
            );

            setCharity(
              charityData?.charity || null
            );
          } catch (charityError) {
            console.error(
              "Charity Fetch Error:",
              charityError.message
            );

            setCharity(null);
          }
        } else {
          setCharity(null);
        }

        // =================================================
        // SCORES
        // =================================================
        //
        // Only active subscribers can access scores.
        // Non-subscriber => simply show 0/5 on dashboard.
        //

        if (isSubscriptionActive) {
          try {
            const scoreData = await apiRequest("/scores");

            setScores(
              Array.isArray(scoreData?.scores)
                ? scoreData.scores
                : []
            );
          } catch (scoreError) {
            console.error(
              "Score Fetch Error:",
              scoreError.message
            );

            setScores([]);
          }
        } else {
          setScores([]);
        }

        // =================================================
        // SUBSCRIPTION
        // =================================================

        try {
          const subscriptionData = await apiRequest(
            "/subscriptions/me"
          );

          setSubscription(
            subscriptionData?.subscription || null
          );
        } catch (subscriptionError) {
          console.error(
            "Subscription Fetch Error:",
            subscriptionError.message
          );

          setSubscription(null);
        }

        // =================================================
        // WINNINGS
        // =================================================

        try {
          const winningsData = await apiRequest(
            "/winners/my"
          );

          setWinnings(
            Array.isArray(
              winningsData?.winnings
            )
              ? winningsData.winnings
              : []
          );
        } catch (winningsError) {
          console.error(
            "Winnings Fetch Error:",
            winningsError.message
          );

          setWinnings([]);
        }

        // =================================================
        // DRAWS
        // =================================================

        try {
          const drawData = await apiRequest("/draws");

          setDraws(
            Array.isArray(drawData?.draws)
              ? drawData.draws
              : []
          );
        } catch (drawError) {
          console.error(
            "Draw Fetch Error:",
            drawError.message
          );

          setDraws([]);
        }

        // =================================================
        // DONATIONS
        // =================================================

        try {
          const donationData = await apiRequest(
            "/donations/me"
          );

          setDonations(
            Array.isArray(
              donationData?.donations
            )
              ? donationData.donations
              : []
          );
        } catch (donationError) {
          console.error(
            "Donation Fetch Error:",
            donationError.message
          );

          setDonations([]);
        }
      } catch (loadError) {
        console.error(
          "Dashboard Load Error:",
          loadError.message
        );

        const responseMessage =
          loadError?.response?.data?.message ||
          "";

        setError(
          responseMessage ||
            loadError.message ||
            "Unable to load dashboard."
        );

        const message =
          responseMessage ||
          loadError.message ||
          "";

        const normalizedMessage =
          String(message).toLowerCase();

        const isAuthError =
          normalizedMessage.includes("token") ||
          normalizedMessage.includes(
            "authentication"
          ) ||
          normalizedMessage.includes(
            "access denied"
          ) ||
          normalizedMessage.includes(
            "invalid or expired"
          ) ||
          normalizedMessage.includes(
            "unauthorized"
          );

        if (isAuthError) {
          localStorage.removeItem(
            "digitalHeroesToken"
          );

          localStorage.removeItem(
            "digitalHeroesUser"
          );

          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [navigate]);

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    localStorage.removeItem(
      "digitalHeroesToken"
    );

    localStorage.removeItem(
      "digitalHeroesUser"
    );

    navigate("/login");
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) {
      return "N/A";
    }

    const parsedDate = new Date(date);

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

  // =====================================================
  // SAFE FIELD HELPERS
  // =====================================================

  const getScoreValue = (score) =>
    score?.score ??
    score?.stablefordScore ??
    score?.stableford_score ??
    score?.value ??
    0;

  const getScoreDate = (score) =>
    score?.date ||
    score?.scoreDate ||
    score?.score_date ||
    score?.playedAt ||
    score?.played_at ||
    score?.createdAt ||
    score?.created_at ||
    null;

  const getDrawDate = (draw) =>
    draw?.drawDate ||
    draw?.draw_date ||
    draw?.date ||
    draw?.scheduledDate ||
    draw?.scheduled_date ||
    draw?.drawMonth ||
    draw?.draw_month ||
    draw?.month ||
    null;

  // =====================================================
  // DRAW START DATE
  // =====================================================

  const getDrawStartDate = (draw) => {
    const rawValue = getDrawDate(draw);

    if (!rawValue) {
      return null;
    }

    const value = String(rawValue).trim();

    // -----------------------------------------------
    // Handle YYYY-MM draw month
    // -----------------------------------------------

    const monthMatch =
      value.match(/^(\d{4})-(\d{2})$/);

    if (monthMatch) {
      const year = Number(
        monthMatch[1]
      );

      const month = Number(
        monthMatch[2]
      );

      return new Date(
        year,
        month - 1,
        1,
        0,
        0,
        0,
        0
      );
    }

    const parsedDate = new Date(value);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return null;
    }

    return parsedDate;
  };

  // =====================================================
  // DRAW END DATE
  // =====================================================

  const getDrawEndDate = (draw) => {
    const rawValue = getDrawDate(draw);

    if (!rawValue) {
      return null;
    }

    const value = String(rawValue).trim();

    // -----------------------------------------------
    // Handle YYYY-MM as complete calendar month
    // -----------------------------------------------

    const monthMatch =
      value.match(/^(\d{4})-(\d{2})$/);

    if (monthMatch) {
      const year = Number(
        monthMatch[1]
      );

      const month = Number(
        monthMatch[2]
      );

      return new Date(
        year,
        month,
        0,
        23,
        59,
        59,
        999
      );
    }

    const parsedDate = new Date(value);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return null;
    }

    return parsedDate;
  };

  // =====================================================
  // DRAW LABEL
  // =====================================================

  const getDrawLabel = (draw) => {
    const rawValue = getDrawDate(draw);

    if (!rawValue) {
      return "Upcoming Draw";
    }

    const value = String(rawValue).trim();

    // -----------------------------------------------
    // Handle YYYY-MM directly
    // -----------------------------------------------

    const monthMatch =
      value.match(/^(\d{4})-(\d{2})$/);

    if (monthMatch) {
      const year = Number(
        monthMatch[1]
      );

      const month = Number(
        monthMatch[2]
      );

      const monthDate = new Date(
        year,
        month - 1,
        1
      );

      return monthDate.toLocaleDateString(
        "en-IN",
        {
          month: "long",
          year: "numeric",
        }
      );
    }

    const parsedDate = new Date(value);

    if (
      !Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return parsedDate.toLocaleDateString(
        "en-IN",
        {
          month: "long",
          year: "numeric",
        }
      );
    }

    return value;
  };

  // =====================================================
  // DRAW PUBLISHED CHECK
  // =====================================================

  const isDrawPublished = (draw) => {
    if (
      typeof draw?.isPublished ===
      "boolean"
    ) {
      return draw.isPublished;
    }

    if (
      typeof draw?.is_published ===
      "boolean"
    ) {
      return draw.is_published;
    }

    if (
      typeof draw?.published ===
      "boolean"
    ) {
      return draw.published;
    }

    const status = String(
      draw?.status || ""
    ).toLowerCase();

    if (
      status === "published" ||
      status === "calculated" ||
      status === "completed"
    ) {
      return true;
    }

    return Boolean(
      draw?.winningNumbers ||
        draw?.winning_numbers
    );
  };

  // =====================================================
  // EXPLICIT PARTICIPATION CHECK
  // =====================================================

  const getExplicitParticipation = (
    draw
  ) => {
    const booleanFields = [
      draw?.isEntered,
      draw?.is_entered,
      draw?.userEntered,
      draw?.user_entered,
      draw?.isParticipating,
      draw?.is_participating,
      draw?.participating,
    ];

    const explicitBoolean =
      booleanFields.find(
        (value) =>
          typeof value === "boolean"
      );

    if (
      typeof explicitBoolean ===
      "boolean"
    ) {
      return explicitBoolean;
    }

    const userId =
      user?.id ||
      user?._id;

    // -----------------------------------------------
    // PARTICIPANTS ARRAY
    // -----------------------------------------------

    if (
      userId &&
      Array.isArray(
        draw?.participants
      )
    ) {
      return draw.participants.some(
        (participant) => {
          const participantId =
            typeof participant ===
            "object"
              ? participant?.id ||
                participant?._id ||
                participant?.userId ||
                participant?.user_id
              : participant;

          return (
            String(participantId) ===
            String(userId)
          );
        }
      );
    }

    // -----------------------------------------------
    // ENTRIES ARRAY
    // -----------------------------------------------

    if (
      userId &&
      Array.isArray(
        draw?.entries
      )
    ) {
      return draw.entries.some(
        (entry) => {
          const entryId =
            typeof entry ===
            "object"
              ? entry?.userId ||
                entry?.user_id ||
                entry?.user?.id ||
                entry?.user?._id
              : entry;

          return (
            String(entryId) ===
            String(userId)
          );
        }
      );
    }

    return null;
  };

  // =====================================================
  // TOTAL DONATIONS
  // =====================================================

  const totalDonations =
    donations.reduce(
      (total, donation) =>
        total +
        Number(
          donation?.amount || 0
        ),
      0
    );

  // =====================================================
  // TOTAL WINNINGS
  // =====================================================

  const totalWinnings =
    winnings.reduce(
      (total, winning) =>
        total +
        Number(
          winning?.prizeAmount ??
            winning?.prize_amount ??
            0
        ),
      0
    );

  // =====================================================
  // PAID WINNINGS
  // =====================================================

  const paidWinnings =
    winnings.filter(
      (winning) =>
        String(
          winning?.paymentStatus ??
            winning?.payment_status ??
            ""
        ).toLowerCase() ===
        "paid"
    );

  const paidWinningsTotal =
    paidWinnings.reduce(
      (total, winning) =>
        total +
        Number(
          winning?.prizeAmount ??
            winning?.prize_amount ??
            0
        ),
      0
    );

  // =====================================================
  // PENDING WINNINGS
  // =====================================================

  const pendingWinnings =
    winnings.filter(
      (winning) => {
        const status =
          String(
            winning?.paymentStatus ??
              winning?.payment_status ??
              "Pending"
          ).toLowerCase();

        return status !== "paid";
      }
    );

  // =====================================================
  // DRAW PARTICIPATION
  // =====================================================

  const now = new Date();

  // -----------------------------------------------
  // SORT DRAWS
  // -----------------------------------------------

  const sortedDraws =
    [...draws]
      .filter((draw) =>
        getDrawStartDate(draw)
      )
      .sort((a, b) => {
        const aDate =
          getDrawStartDate(
            a
          )?.getTime() || 0;

        const bDate =
          getDrawStartDate(
            b
          )?.getTime() || 0;

        return (
          bDate - aDate
        );
      });

  // -----------------------------------------------
  // PAST / CURRENT PUBLISHED DRAWS
  // -----------------------------------------------

  const pastDraws =
    sortedDraws.filter(
      (draw) => {
        const drawStart =
          getDrawStartDate(
            draw
          );

        return (
          drawStart &&
          drawStart <= now &&
          isDrawPublished(draw)
        );
      }
    );

  // -----------------------------------------------
  // UPCOMING DRAWS
  // -----------------------------------------------

  const upcomingDraws =
    sortedDraws.filter(
      (draw) => {
        const drawStart =
          getDrawStartDate(
            draw
          );

        return (
          drawStart &&
          drawStart > now
        );
      }
    );

  // =====================================================
  // SUBSCRIPTION PERIOD
  // =====================================================

  const subscriptionStart =
    subscription?.startDate ||
    subscription?.start_date ||
    subscription?.startedAt ||
    subscription?.started_at ||
    user?.subscriptionStartDate ||
    user?.subscription_start_date ||
    null;

  const subscriptionEnd =
    subscription?.endDate ||
    subscription?.end_date ||
    subscription?.expiresAt ||
    subscription?.expires_at ||
    subscription?.currentPeriodEnd ||
    subscription?.current_period_end ||
    subscription?.currentPeriodEndDate ||
    subscription?.current_period_end_date ||
    user?.subscriptionEndDate ||
    user?.subscription_end_date ||
    null;

  const subscriptionStartDate =
    subscriptionStart
      ? new Date(
          subscriptionStart
        )
      : null;

  const subscriptionEndDate =
    subscriptionEnd
      ? new Date(
          subscriptionEnd
        )
      : null;

  // =====================================================
  // SUBSCRIPTION ACTIVE CHECK
  // =====================================================

  const subscriptionIsActive =
    String(
      user?.subscriptionStatus ||
        user?.subscription_status ||
        subscription?.status ||
        ""
    ).toLowerCase() ===
    "active";

  // =====================================================
  // DRAW ENTERED COUNT
  // =====================================================

  const drawsEntered =
    pastDraws.filter(
      (draw) => {
        // -----------------------------------------------
        // BACKEND EXPLICIT PARTICIPATION
        // -----------------------------------------------

        const explicit =
          getExplicitParticipation(
            draw
          );

        if (
          explicit === true
        ) {
          return true;
        }

        if (
          explicit === false
        ) {
          return false;
        }

        // -----------------------------------------------
        // USER MUST HAVE ACTIVE SUBSCRIPTION
        // -----------------------------------------------

        if (
          !subscriptionIsActive
        ) {
          return false;
        }

        // -----------------------------------------------
        // DRAW MONTH RANGE
        // -----------------------------------------------

        const drawStart =
          getDrawStartDate(draw);

        const drawEnd =
          getDrawEndDate(draw);

        if (
          !drawStart ||
          !drawEnd
        ) {
          return false;
        }

        // -----------------------------------------------
        // VALID SUBSCRIPTION START DATE
        // -----------------------------------------------

        const validSubscriptionStart =
          subscriptionStartDate &&
          !Number.isNaN(
            subscriptionStartDate.getTime()
          );

        // -----------------------------------------------
        // VALID SUBSCRIPTION END DATE
        // -----------------------------------------------

        const validSubscriptionEnd =
          subscriptionEndDate &&
          !Number.isNaN(
            subscriptionEndDate.getTime()
          );

        // -----------------------------------------------
        // CHECK OVERLAP BETWEEN DRAW MONTH
        // AND SUBSCRIPTION PERIOD
        // -----------------------------------------------

        const startsBeforeDrawEnds =
          !validSubscriptionStart ||
          drawEnd >=
            subscriptionStartDate;

        const endsAfterDrawStarts =
          !validSubscriptionEnd ||
          drawStart <=
            subscriptionEndDate;

        return (
          startsBeforeDrawEnds &&
          endsAfterDrawStarts
        );
      }
    ).length;

  // =====================================================
  // NEXT DRAW
  // =====================================================

  const nextDraw =
    upcomingDraws.length > 0
      ? upcomingDraws[
          upcomingDraws.length - 1
        ]
      : null;

  // =====================================================
  // LATEST DRAW
  // =====================================================

  const latestDraw =
    pastDraws.length > 0
      ? pastDraws[0]
      : sortedDraws[
          sortedDraws.length - 1
        ] || null;

  // =====================================================
  // RENEWAL DATE
  // =====================================================

  const renewalDate =
    subscription?.renewalDate ||
    subscription?.renewal_date ||
    subscription?.currentPeriodEnd ||
    subscription?.current_period_end ||
    subscription?.currentPeriodEndDate ||
    subscription?.current_period_end_date ||
    subscription?.endDate ||
    subscription?.end_date ||
    user?.subscriptionEndDate ||
    user?.subscription_end_date ||
    null;

  const hasRenewalDate =
    renewalDate &&
    !Number.isNaN(
      new Date(
        renewalDate
      ).getTime()
    );

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="dashboard-loading">

        <div className="loading-spinner"></div>

        <h2>
          Loading your dashboard...
        </h2>

        <p>
          Please wait a moment.
        </p>

      </div>
    );
  }

  // =====================================================
  // DASHBOARD
  // =====================================================

  return (
    <div className="dashboard-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="dashboard-header">

        <div className="dashboard-brand">

          <div className="brand-mark">
            DH
          </div>

          <div>
            <h1>
              Digital Heroes
            </h1>

            <span>
              Play. Win. Give back.
            </span>
          </div>

        </div>

        <div className="dashboard-user">

          <div className="user-avatar">
            {user?.name
              ? user.name
                  .charAt(0)
                  .toUpperCase()
              : "U"}
          </div>

          <div className="user-info">

            <strong>
              {user?.name || "User"}
            </strong>

            <span>
              {user?.email || ""}
            </span>

          </div>

          <button
            className="logout-btn"
            onClick={
              handleLogout
            }
          >
            Logout
          </button>

        </div>

      </header>

      <main className="dashboard-container">

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="dashboard-error">
            {error}
          </div>
        )}

        {/* =================================================
            HERO
        ================================================= */}

        <section className="dashboard-hero">

          <div>

            <span className="hero-label">
              MEMBER DASHBOARD
            </span>

            <h2>
              Welcome back
              {user?.name
                ? `, ${
                    user.name
                      .split(" ")[0]
                  }`
                : ""}!
            </h2>

            <p>
              Track your scores,
              subscription, draw participation,
              winnings and charity impact all in
              one place.
            </p>

          </div>

          <div className="hero-actions">

            <Link
              to="/draws"
              className="hero-btn primary"
            >
              View Latest Draw
            </Link>

            <Link
              to="/charities"
              className="hero-btn secondary"
            >
              Support a Charity
            </Link>

          </div>

        </section>

        {/* =================================================
            QUICK STATS
        ================================================= */}

        <section className="stats-grid">

          {/* SCORES */}

          <div className="stat-card">

            <div className="stat-icon">
              🏌️
            </div>

            <div>

              <span>
                Scores
              </span>

              <strong>
                {scores.length}/5
              </strong>

            </div>

          </div>

          {/* SUBSCRIPTION */}

          <div className="stat-card">

            <div className="stat-icon">
              🎯
            </div>

            <div>

              <span>
                Subscription
              </span>

              <strong>
                {user?.subscriptionStatus ||
                  user?.subscription_status ||
                  "Not Subscribed"}
              </strong>

            </div>

          </div>

          {/* WINNINGS */}

          <div className="stat-card">

            <div className="stat-icon">
              🏆
            </div>

            <div>

              <span>
                Total Won
              </span>

              <strong>
                ₹
                {totalWinnings.toLocaleString(
                  "en-IN"
                )}
              </strong>

            </div>

          </div>

          {/* DONATIONS */}

          <div className="stat-card">

            <div className="stat-icon">
              ❤️
            </div>

            <div>

              <span>
                Donated
              </span>

              <strong>
                ₹
                {totalDonations.toLocaleString(
                  "en-IN"
                )}
              </strong>

            </div>

          </div>

        </section>

        {/* =================================================
            CONTENT GRID
        ================================================= */}

        <section className="dashboard-grid">

          {/* =================================================
              ACCOUNT
          ================================================= */}

          <div className="dashboard-card">

            <div className="card-heading">

              <div>

                <span className="card-kicker">
                  ACCOUNT
                </span>

                <h3>
                  My Account
                </h3>

              </div>

              <span className="card-icon">
                👤
              </span>

            </div>

            <div className="account-details">

              <div className="detail-row">

                <span>
                  Name
                </span>

                <strong>
                  {user?.name ||
                    "Not available"}
                </strong>

              </div>

              <div className="detail-row">

                <span>
                  Email
                </span>

                <strong>
                  {user?.email ||
                    "Not available"}
                </strong>

              </div>

              <div className="detail-row">

                <span>
                  Role
                </span>

                <strong>
                  {user?.role || "User"}
                </strong>

              </div>

            </div>

          </div>

          {/* =================================================
              SUBSCRIPTION
          ================================================= */}

          <div className="dashboard-card subscription-card">

            <div className="card-heading">

              <div>

                <span className="card-kicker">
                  MEMBERSHIP
                </span>

                <h3>
                  Subscription
                </h3>

              </div>

              <span className="card-icon">
                ⭐
              </span>

            </div>

            <div className="status-row">

              <span>
                Status
              </span>

              <span
                className={`status-badge ${
                  (
                    user?.subscriptionStatus ||
                    user?.subscription_status ||
                    "Not Subscribed"
                  )
                    .toLowerCase()
                    .replace(
                      /\s+/g,
                      "-"
                    )
                }`}
              >
                {user?.subscriptionStatus ||
                  user?.subscription_status ||
                  "Not Subscribed"}
              </span>

            </div>

            {(
              user?.subscriptionPlan ||
              user?.subscription_plan
            ) && (
              <div className="detail-row">

                <span>
                  Plan
                </span>

                <strong>
                  {user?.subscriptionPlan ||
                    user?.subscription_plan}
                </strong>

              </div>
            )}

            {subscription && (
              <>

                <div className="detail-row">

                  <span>
                    Amount
                  </span>

                  <strong>
                    ₹
                    {Number(
                      subscription.amount ||
                        0
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </strong>

                </div>

                <div className="detail-row">

                  <span>
                    Start Date
                  </span>

                  <strong>
                    {formatDate(
                      subscription.startDate ||
                        subscription.start_date ||
                        subscription.startedAt ||
                        subscription.started_at ||
                        subscription.createdAt ||
                        subscription.created_at
                    )}
                  </strong>

                </div>

                <div className="detail-row">

                  <span>
                    Renewal Date
                  </span>

                  <strong>
                    {hasRenewalDate
                      ? formatDate(
                          renewalDate
                        )
                      : "N/A"}
                  </strong>

                </div>

              </>
            )}

            <Link
              to="/subscription"
              className="card-btn"
            >
              View Subscription
            </Link>

          </div>

          {/* =================================================
              GOLF SCORES
          ================================================= */}

          <div className="dashboard-card">

            <div className="card-heading">

              <div>

                <span className="card-kicker">
                  PERFORMANCE
                </span>

                <h3>
                  Golf Scores
                </h3>

              </div>

              <span className="card-icon">
                🏌️
              </span>

            </div>

            <p className="card-description">

              Your latest {scores.length} Stableford
              score
              {scores.length !== 1
                ? "s"
                : ""}.

            </p>

            {scores.length === 0 ? (

              <div className="empty-state">

                <span>
                  📊
                </span>

                <p>
                  {subscriptionIsActive
                    ? "No scores added yet."
                    : "Subscribe to access and manage your scores."}
                </p>

              </div>

            ) : (

              <div className="score-list">

                {scores.map(
                  (
                    score,
                    index
                  ) => (

                    <div
                      className="score-item"
                      key={
                        score?._id ||
                        score?.id ||
                        `score-${index}`
                      }
                    >

                      <div className="score-number">
                        {getScoreValue(
                          score
                        )}
                      </div>

                      <div>

                        <strong>
                          Stableford Score
                        </strong>

                        <span>
                          Score Date:{" "}
                          {formatDate(
                            getScoreDate(
                              score
                            )
                          )}
                        </span>

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

            <Link
              to="/scores"
              className="card-btn"
            >
              {subscriptionIsActive
                ? "Manage Scores"
                : "View Score Access"}
            </Link>

          </div>

          {/* =================================================
              CHARITY
          ================================================= */}

          <div className="dashboard-card charity-card">

            <div className="card-heading">

              <div>

                <span className="card-kicker">
                  YOUR IMPACT
                </span>

                <h3>
                  My Charity
                </h3>

              </div>

              <span className="card-icon">
                ❤️
              </span>

            </div>

            {charity ? (

              <>

                {charity.image && (
                  <img
                    src={
                      charity.image
                    }
                    alt={
                      charity.name ||
                      "Charity"
                    }
                    className="charity-image"
                  />
                )}

                <h4 className="charity-name">
                  {charity.name}
                </h4>

                {charity.description && (
                  <p className="charity-description">
                    {charity.description}
                  </p>
                )}

                <div className="contribution-box">

                  <span>
                    Your contribution
                  </span>

                  <strong>
                    {user?.charityContribution ??
                      user?.charity_contribution ??
                      10}
                    %
                  </strong>

                </div>

              </>

            ) : (

              <div className="empty-state charity-empty">

                <span>
                  ❤️
                </span>

                <p>
                  You have not selected
                  a charity yet.
                </p>

              </div>

            )}

            <Link
              to="/charities"
              className="card-btn"
            >
              {charity
                ? "Change Charity"
                : "Choose Charity"}
            </Link>

          </div>

          {/* =================================================
              DONATIONS
          ================================================= */}

          <div className="dashboard-card">

            <div className="card-heading">

              <div>

                <span className="card-kicker">
                  CHARITY GIVING
                </span>

                <h3>
                  My Donations
                </h3>

              </div>

              <span className="card-icon">
                💝
              </span>

            </div>

            {donations.length === 0 ? (

              <div className="empty-state">

                <span>
                  💝
                </span>

                <p>
                  You have not made any
                  one-time donations yet.
                </p>

              </div>

            ) : (

              <>

                <div className="donation-total">

                  <span>
                    Total Donations
                  </span>

                  <strong>
                    ₹
                    {totalDonations.toLocaleString(
                      "en-IN"
                    )}
                  </strong>

                </div>

                <div className="donation-count">

                  {donations.length} donation
                  {donations.length !== 1
                    ? "s"
                    : ""}{" "}
                  recorded

                </div>

                <div className="donation-list">

                  {donations
                    .slice(
                      0,
                      3
                    )
                    .map(
                      (
                        donation,
                        index
                      ) => (

                        <div
                          className="donation-item"
                          key={
                            donation?._id ||
                            donation?.id ||
                            `donation-${index}`
                          }
                        >

                          <div>

                            <strong>
                              {donation?.charity
                                ?.name ||
                                donation?.charityName ||
                                "Unknown Charity"}
                            </strong>

                            <span>
                              {formatDate(
                                donation?.createdAt ||
                                  donation?.created_at ||
                                  donation?.date
                              )}
                            </span>

                          </div>

                          <div className="donation-right">

                            <strong>
                              ₹
                              {Number(
                                donation?.amount ||
                                  0
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </strong>

                            <span
                              className={`donation-status ${(
                                donation?.status ||
                                "Pending"
                              )
                                .toLowerCase()
                                .replace(
                                  /\s+/g,
                                  "-"
                                )}`}
                            >
                              {donation?.status ||
                                "Pending"}
                            </span>

                          </div>

                        </div>

                      )
                    )}

                </div>

              </>

            )}

            <Link
              to="/charities"
              className="card-btn"
            >
              View Charities
            </Link>

          </div>

          {/* =================================================
              MONTHLY DRAW + PARTICIPATION
          ================================================= */}

          <div className="dashboard-card draw-card">

            <div className="card-heading">

              <div>

                <span className="card-kicker">
                  MONTHLY
                </span>

                <h3>
                  Draw & Participation
                </h3>

              </div>

              <span className="card-icon">
                🎯
              </span>

            </div>

            <div className="draw-content">

              <div className="draw-number">
                5
              </div>

              <div>

                <strong>
                  Numbers. One monthly draw.
                </strong>

                <p>
                  Your draw participation and
                  upcoming draw schedule.
                </p>

              </div>

            </div>

            <div className="account-details">

              <div className="detail-row">

                <span>
                  Latest Draw
                </span>

                <strong>
                  {latestDraw
                    ? getDrawLabel(
                        latestDraw
                      )
                    : "No draw available"}
                </strong>

              </div>

              <div className="detail-row">

                <span>
                  Draws Entered
                </span>

                <strong>
                  {drawsEntered}
                </strong>

              </div>

              <div className="detail-row">

                <span>
                  Upcoming Draws
                </span>

                <strong>
                  {upcomingDraws.length}
                </strong>

              </div>

              <div className="detail-row">

                <span>
                  Next Draw
                </span>

                <strong>
                  {nextDraw
                    ? getDrawLabel(
                        nextDraw
                      )
                    : "No upcoming draw"}
                </strong>

              </div>

            </div>

            <Link
              to="/draws"
              className="card-btn"
            >
              View Draws
            </Link>

          </div>

          {/* =================================================
              WINNINGS
          ================================================= */}

          <div className="dashboard-card">

            <div className="card-heading">

              <div>

                <span className="card-kicker">
                  REWARDS
                </span>

                <h3>
                  My Winnings
                </h3>

              </div>

              <span className="card-icon">
                🏆
              </span>

            </div>

            {winnings.length === 0 ? (

              <div className="empty-state">

                <span>
                  🏆
                </span>

                <p>
                  No winnings yet.
                </p>

              </div>

            ) : (

              <>

                <div className="winning-summary">

                  <span>
                    Total Won
                  </span>

                  <strong>
                    ₹
                    {totalWinnings.toLocaleString(
                      "en-IN"
                    )}
                  </strong>

                </div>

                <div className="account-details">

                  <div className="detail-row">

                    <span>
                      Winning Records
                    </span>

                    <strong>
                      {winnings.length}
                    </strong>

                  </div>

                  <div className="detail-row">

                    <span>
                      Paid
                    </span>

                    <strong>
                      {paidWinnings.length}
                      {" • "}
                      ₹
                      {paidWinningsTotal.toLocaleString(
                        "en-IN"
                      )}
                    </strong>

                  </div>

                  <div className="detail-row">

                    <span>
                      Current Payment Status
                    </span>

                    <strong>
                      {winnings.length ===
                      0
                        ? "No winnings"
                        : pendingWinnings.length ===
                          0
                        ? "All winnings paid"
                        : `${pendingWinnings.length} pending`}
                    </strong>

                  </div>

                </div>

                <div className="winning-list">

                  {winnings
                    .slice(
                      0,
                      3
                    )
                    .map(
                      (
                        winning,
                        index
                      ) => (

                        <div
                          className="winning-item"
                          key={
                            winning?._id ||
                            winning?.id ||
                            `winning-${index}`
                          }
                        >

                          <div>

                            <strong>
                              {winning?.draw
                                ?.drawMonth ||
                                winning?.drawMonth ||
                                winning?.draw_month ||
                                "N/A"}
                            </strong>

                            <span>
                              {winning?.prizeCategory ||
                                winning?.prize_category ||
                                "Prize"}
                            </span>

                          </div>

                          <div className="winning-right">

                            <strong>
                              ₹
                              {Number(
                                winning?.prizeAmount ??
                                  winning?.prize_amount ??
                                  0
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </strong>

                            <span
                              className={`payment-status ${(
                                winning?.paymentStatus ??
                                winning?.payment_status ??
                                "Pending"
                              )
                                .toLowerCase()
                                .replace(
                                  /\s+/g,
                                  "-"
                                )}`}
                            >
                              {winning?.paymentStatus ??
                                winning?.payment_status ??
                                "Pending"}
                            </span>

                          </div>

                        </div>

                      )
                    )}

                </div>

              </>

            )}

            <Link
              to="/winnings"
              className="card-btn"
            >
              View All Winnings
            </Link>

          </div>

        </section>

      </main>

    </div>
  );
}

export default Dashboard;