import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api";
import "./AdminDashboard.css";

function AdminDashboard() {
const [reports, setReports] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

const loadDashboard = async () => {
try {
setLoading(true);
setError("");

  const data = await apiRequest("/admin/reports");

  setReports(data.reports);
} catch (error) {
  console.error("Load Dashboard Error:", error.message);
  setError(error.message);
} finally {
  setLoading(false);
}

};

useEffect(() => {
loadDashboard();
}, []);

if (loading) {
return ( <div className="admin-dashboard-page"> <div className="admin-loading"> <div className="admin-loading-brand">
DH </div>
      <div className="admin-loading-spinner"></div>

      <h1>Digital Heroes Admin</h1>

      <p>Preparing your control center...</p>
    </div>
  </div>
);

}

if (error) {
return ( <div className="admin-dashboard-page"> <div className="admin-error-card">

      <div className="admin-error-icon">
        !
      </div>

      <span className="admin-error-label">
        ADMIN CONTROL CENTER
      </span>

      <h1>
        Unable to Load Dashboard
      </h1>

      <p>
        We couldn't retrieve the latest
        platform information.
      </p>

      <div className="admin-error-message">
        {error}
      </div>

      <button
        className="admin-primary-btn"
        onClick={loadDashboard}
      >
        Try Again
      </button>

    </div>
  </div>
);

}

return ( <div className="admin-dashboard-page">

  <header className="admin-dashboard-header">
    <div className="admin-header-inner">

      <div className="admin-brand">

        <div className="admin-brand-mark">
          DH
        </div>

        <div>
          <h1>
            Digital Heroes Admin
          </h1>

          <p>
            Platform administration & management
          </p>
        </div>

      </div>

      <div className="admin-header-status">
        <span className="admin-status-dot"></span>
        System Online
      </div>

    </div>
  </header>

  <main className="admin-dashboard-main">

    <section className="admin-dashboard-hero">

      <div className="admin-hero-content">

        <span className="admin-eyebrow">
          ADMIN CONTROL CENTER
        </span>

        <h2>
          Admin Dashboard
        </h2>

        <p>
          Manage users, monthly draws, charities,
          winners and platform reports from one
          central workspace.
        </p>

      </div>

      <div className="admin-hero-badge">
        <span className="admin-badge-dot"></span>
        System Overview
      </div>

    </section>

    <section className="admin-section">

      <div className="admin-section-heading">

        <span className="admin-section-label">
          OVERVIEW
        </span>

        <h2>
          Platform Overview
        </h2>

        <p>
          A quick snapshot of the Digital Heroes
          platform.
        </p>

      </div>

      <div className="admin-stats-grid">

        <div className="admin-stat-card">

          <div className="admin-stat-icon">
            <span>01</span>
          </div>

          <div>
            <p>Total Users</p>

            <strong>
              {reports.users.totalUsers}
            </strong>
          </div>

        </div>

        <div className="admin-stat-card">

          <div className="admin-stat-icon">
            <span>02</span>
          </div>

          <div>
            <p>Active Subscriptions</p>

            <strong>
              {reports.users.activeSubscriptions}
            </strong>
          </div>

        </div>

        <div className="admin-stat-card">

          <div className="admin-stat-icon">
            <span>03</span>
          </div>

          <div>
            <p>Active Charities</p>

            <strong>
              {reports.charities.activeCharities}
            </strong>
          </div>

        </div>

        <div className="admin-stat-card">

          <div className="admin-stat-icon">
            <span>04</span>
          </div>

          <div>
            <p>Total Winners</p>

            <strong>
              {reports.winners.totalWinners}
            </strong>
          </div>

        </div>

      </div>

      <div className="admin-overview-grid">

        <div className="admin-info-card">

          <div className="admin-info-card-header">

            <div className="admin-info-symbol">
              U
            </div>

            <div>
              <h3>
                Users & Subscriptions
              </h3>

              <p>
                Account and subscription activity
              </p>
            </div>

          </div>

          <div className="admin-info-list">

            <div className="admin-info-row">
              <span>Total Users</span>

              <strong>
                {reports.users.totalUsers}
              </strong>
            </div>

            <div className="admin-info-row">
              <span>Active Subscriptions</span>

              <strong>
                {reports.users.activeSubscriptions}
              </strong>
            </div>

            <div className="admin-info-row">
              <span>Monthly Plans</span>

              <strong>
                {reports.users.monthlySubscriptions}
              </strong>
            </div>

            <div className="admin-info-row">
              <span>Yearly Plans</span>

              <strong>
                {reports.users.yearlySubscriptions}
              </strong>
            </div>

          </div>

        </div>

        <div className="admin-info-card">

          <div className="admin-info-card-header">

            <div className="admin-info-symbol">
              D
            </div>

            <div>
              <h3>
                Draw Activity
              </h3>

              <p>
                Monthly draw statistics
              </p>
            </div>

          </div>

          <div className="admin-info-list">

            <div className="admin-info-row">
              <span>Total Draws</span>

              <strong>
                {reports.draws.totalDraws}
              </strong>
            </div>

            <div className="admin-info-row">
              <span>Published Draws</span>

              <strong>
                {reports.draws.publishedDraws}
              </strong>
            </div>

          </div>

        </div>

        <div className="admin-info-card">

          <div className="admin-info-card-header">

            <div className="admin-info-symbol">
              C
            </div>

            <div>
              <h3>
                Charity Activity
              </h3>

              <p>
                Charity directory status
              </p>
            </div>

          </div>

          <div className="admin-info-list">

            <div className="admin-info-row">
              <span>Total Charities</span>

              <strong>
                {reports.charities.totalCharities}
              </strong>
            </div>

            <div className="admin-info-row">
              <span>Active Charities</span>

              <strong>
                {reports.charities.activeCharities}
              </strong>
            </div>

            <div className="admin-info-row">
              <span>Featured Charities</span>

              <strong>
                {reports.charities.featuredCharities}
              </strong>
            </div>

          </div>

        </div>

        <div className="admin-info-card">

          <div className="admin-info-card-header">

            <div className="admin-info-symbol">
              W
            </div>

            <div>
              <h3>
                Winner Activity
              </h3>

              <p>
                Verification and payment status
              </p>
            </div>

          </div>

          <div className="admin-info-list">

            <div className="admin-info-row">
              <span>Total Winners</span>

              <strong>
                {reports.winners.totalWinners}
              </strong>
            </div>

            <div className="admin-info-row">
              <span>Pending Verification</span>

              <strong>
                {reports.winners.pendingVerification}
              </strong>
            </div>

            <div className="admin-info-row">
              <span>Approved</span>

              <strong>
                {reports.winners.approvedWinners}
              </strong>
            </div>

            <div className="admin-info-row">
              <span>Paid</span>

              <strong>
                {reports.winners.paidWinners}
              </strong>
            </div>

          </div>

        </div>

      </div>

    </section>

    <section className="admin-prize-card">

      <div className="admin-prize-glow"></div>

      <div className="admin-prize-content">

        <span className="admin-section-label">
          PRIZE INFORMATION
        </span>

        <h2>
          Current Prize Amount
        </h2>

        <p>
          Total prize amount currently recorded
          on the platform.
        </p>

      </div>

      <div className="admin-prize-amount">
        ₹{Number(
          reports.prizes.totalPrizeAmount || 0
        ).toLocaleString("en-IN")}
      </div>

    </section>

    <section className="admin-section">

      <div className="admin-section-heading">

        <span className="admin-section-label">
          MANAGEMENT
        </span>

        <h2>
          Platform Management
        </h2>

        <p>
          Access and manage each major area
          of the Digital Heroes platform.
        </p>

      </div>

      <div className="admin-management-grid">

        <div className="admin-management-card">

          <div className="admin-management-top">

            <div className="admin-management-icon">
              U
            </div>

            <span className="admin-card-number">
              01
            </span>

          </div>

          <h3>
            User Management
          </h3>

          <p>
            View and manage registered Digital
            Heroes users and their subscription
            status.
          </p>

          <Link
            to="/admin/users"
            className="admin-card-btn"
          >
            <span>
              Manage Users
            </span>

            <span className="admin-card-arrow">
              →
            </span>
          </Link>

        </div>

        <div className="admin-management-card">

          <div className="admin-management-top">

            <div className="admin-management-icon">
              D
            </div>

            <span className="admin-card-number">
              02
            </span>

          </div>

          <h3>
            Draw Management
          </h3>

          <p>
            Manage monthly draws, simulate draw
            results and publish results.
          </p>

          <Link
            to="/admin/draws"
            className="admin-card-btn"
          >
            <span>
              Manage Draws
            </span>

            <span className="admin-card-arrow">
              →
            </span>
          </Link>

        </div>

        <div className="admin-management-card">

          <div className="admin-management-top">

            <div className="admin-management-icon">
              C
            </div>

            <span className="admin-card-number">
              03
            </span>

          </div>

          <h3>
            Charity Management
          </h3>

          <p>
            Manage charities available to
            Digital Heroes members.
          </p>

          <Link
            to="/admin/charities"
            className="admin-card-btn"
          >
            <span>
              Manage Charities
            </span>

            <span className="admin-card-arrow">
              →
            </span>
          </Link>

        </div>

        <div className="admin-management-card">

          <div className="admin-management-top">

            <div className="admin-management-icon">
              W
            </div>

            <span className="admin-card-number">
              04
            </span>

          </div>

          <h3>
            Winner Management
          </h3>

          <p>
            Review winners, verify score proof
            and manage payment status.
          </p>

          <Link
            to="/admin/winners"
            className="admin-card-btn"
          >
            <span>
              Manage Winners
            </span>

            <span className="admin-card-arrow">
              →
            </span>
          </Link>

        </div>

        <div className="admin-management-card admin-management-card-wide">

          <div className="admin-management-top admin-wide-icon">

            <div className="admin-management-icon">
              R
            </div>

            <span className="admin-card-number">
              05
            </span>

          </div>

          <div className="admin-wide-content">

            <h3>
              Reports & Analytics
            </h3>

            <p>
              View platform statistics, subscription
              activity, draw results and charity
              contribution information.
            </p>

            <Link
              to="/admin/reports"
              className="admin-card-btn"
            >
              <span>
                View Reports
              </span>

              <span className="admin-card-arrow">
                →
              </span>
            </Link>

          </div>

        </div>

      </div>

    </section>

  </main>

</div>

);
}

export default AdminDashboard;
