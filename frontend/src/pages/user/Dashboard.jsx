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
        // /auth/me directly user object return karta hai
        // =================================================

        const currentUser =
          await apiRequest("/auth/me");

        setUser(currentUser);

        localStorage.setItem(
          "digitalHeroesUser",
          JSON.stringify(currentUser)
        );

        // =================================================
        // CHARITY
        // =================================================

        if (currentUser?.charityId) {
          try {
            const charityData =
              await apiRequest(
                `/charities/${currentUser.charityId}`
              );

            setCharity(
              charityData.charity || null
            );
          } catch (error) {
            console.error(
              "Charity Fetch Error:",
              error.message
            );

            setCharity(null);
          }
        } else {
          setCharity(null);
        }

        // =================================================
        // SCORES
        // =================================================

        try {
          const scoreData =
            await apiRequest("/scores");

          setScores(
            scoreData.scores || []
          );
        } catch (error) {
          console.error(
            "Score Fetch Error:",
            error.message
          );

          setScores([]);
        }

        // =================================================
        // SUBSCRIPTION
        // =================================================

        try {
          const subscriptionData =
            await apiRequest(
              "/subscriptions/me"
            );

          setSubscription(
            subscriptionData.subscription ||
              null
          );
        } catch (error) {
          console.error(
            "Subscription Fetch Error:",
            error.message
          );

          setSubscription(null);
        }

        // =================================================
        // WINNINGS
        // =================================================

        try {
          const winningsData =
            await apiRequest(
              "/winners/my"
            );

          setWinnings(
            winningsData.winnings || []
          );
        } catch (error) {
          console.error(
            "Winnings Fetch Error:",
            error.message
          );

          setWinnings([]);
        }

        // =================================================
        // DONATIONS
        // =================================================

        try {
          const donationData =
            await apiRequest(
              "/donations/me"
            );

          setDonations(
            donationData.donations || []
          );
        } catch (error) {
          console.error(
            "Donation Fetch Error:",
            error.message
          );

          setDonations([]);
        }

      } catch (error) {
        console.error(
          "Dashboard Load Error:",
          error.message
        );

        setError(
          error.message ||
            "Unable to load dashboard."
        );

        // =================================================
        // INVALID TOKEN
        // =================================================

        const message =
          error.message || "";

        if (
          message.includes("token") ||
          message.includes("Token") ||
          message.includes("Authentication") ||
          message.includes("Access denied") ||
          message.includes("Invalid or expired")
        ) {
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

    return new Date(
      date
    ).toLocaleDateString();
  };

  // =====================================================
  // TOTAL DONATIONS
  // =====================================================

  const totalDonations =
    donations.reduce(
      (total, donation) =>
        total +
        Number(donation.amount || 0),
      0
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
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="dashboard-container">

        {/* ERROR */}

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
                ? `, ${user.name.split(" ")[0]}`
                : ""}
              !
            </h2>

            <p>
              Track your scores,
              subscription, winnings and
              charity impact all in one
              place.
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
                Winnings
              </span>

              <strong>
                {winnings.length}
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
                {totalDonations.toLocaleString()}
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
                  {user?.role ||
                    "User"}
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
                  user?.subscriptionStatus
                    ?.toLowerCase()
                    .replace(
                      /\s+/g,
                      "-"
                    ) ||
                  "not-subscribed"
                }`}
              >
                {user?.subscriptionStatus ||
                  "Not Subscribed"}
              </span>

            </div>

            {user?.subscriptionPlan && (
              <div className="detail-row">

                <span>
                  Plan
                </span>

                <strong>
                  {user.subscriptionPlan}
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
                    {subscription.amount}
                  </strong>

                </div>

                <div className="detail-row">

                  <span>
                    Start Date
                  </span>

                  <strong>
                    {formatDate(
                      subscription.startDate
                    )}
                  </strong>

                </div>

                <div className="detail-row">

                  <span>
                    End Date
                  </span>

                  <strong>
                    {formatDate(
                      subscription.endDate
                    )}
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

              Your latest{" "}
              {scores.length}{" "}
              Stableford score
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
                  No scores added yet.
                </p>

              </div>

            ) : (

              <div className="score-list">

                {scores.map(
                  (score) => (

                    <div
                      className="score-item"
                      key={score._id}
                    >

                      <div className="score-number">
                        {score.score}
                      </div>

                      <div>

                        <strong>
                          Stableford Score
                        </strong>

                        <span>
                          {formatDate(
                            score.date
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
              Manage Scores
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
                    src={charity.image}
                    alt={charity.name}
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
                    {user?.charityContribution ||
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
                    {totalDonations.toLocaleString()}
                  </strong>

                </div>

                <div className="donation-count">

                  {donations.length}{" "}
                  donation
                  {donations.length !== 1
                    ? "s"
                    : ""}{" "}
                  recorded

                </div>

                <div className="donation-list">

                  {donations
                    .slice(0, 3)
                    .map(
                      (donation) => (

                        <div
                          className="donation-item"
                          key={donation._id}
                        >

                          <div>

                            <strong>
                              {donation
                                .charity
                                ?.name ||
                                "Unknown Charity"}
                            </strong>

                            <span>
                              {formatDate(
                                donation.createdAt
                              )}
                            </span>

                          </div>

                          <div className="donation-right">

                            <strong>
                              ₹
                              {Number(
                                donation.amount ||
                                  0
                              ).toLocaleString()}
                            </strong>

                            <span
                              className={`donation-status ${(
                                donation.status ||
                                "Pending"
                              ).toLowerCase()}`}
                            >
                              {donation.status ||
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
              MONTHLY DRAW
          ================================================= */}

          <div className="dashboard-card draw-card">

            <div className="card-heading">

              <div>

                <span className="card-kicker">
                  MONTHLY
                </span>

                <h3>
                  Monthly Draw
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
                  Check the latest draw,
                  winning numbers and your
                  participation.
                </p>

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
                    Total Winning Records
                  </span>

                  <strong>
                    {winnings.length}
                  </strong>

                </div>

                <div className="winning-list">

                  {winnings
                    .slice(0, 3)
                    .map(
                      (winning) => (

                        <div
                          className="winning-item"
                          key={winning._id}
                        >

                          <div>

                            <strong>
                              {winning
                                .draw
                                ?.drawMonth ||
                                "N/A"}
                            </strong>

                            <span>
                              {winning.prizeCategory}
                            </span>

                          </div>

                          <div className="winning-right">

                            <strong>
                              ₹
                              {Number(
                                winning.prizeAmount ||
                                  0
                              ).toLocaleString()}
                            </strong>

                            <span
                              className={`payment-status ${(
                                winning.paymentStatus ||
                                "Pending"
                              ).toLowerCase()}`}
                            >
                              {winning.paymentStatus ||
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