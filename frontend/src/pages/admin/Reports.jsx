import { useEffect, useState } from "react";
import { apiRequest } from "../../api";
import "./Reports.css";

const Reports = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD REPORTS
  // =====================================================

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest(
        "/admin/reports"
      );

      console.log(
        "REPORTS API RESPONSE:",
        data
      );

      // Supports both:
      // 1. data.reports
      // 2. direct data response
      const reportData =
        data?.reports || data || null;

      setReports(reportData);
    } catch (error) {
      console.error(
        "Reports Load Error:",
        error
      );

      setError(
        error.message ||
          "Unable to load reports"
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadReports();
  }, []);

  // =====================================================
  // FORMAT AMOUNT
  // =====================================================

  const formatAmount = (amount) => {
    return `₹${Number(
      amount || 0
    ).toLocaleString("en-IN")}`;
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="reports-admin-page">
        <div className="reports-loading">
          <div className="reports-spinner"></div>

          <h1>
            Reports & Impact
          </h1>

          <p>
            Loading reports...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div className="reports-admin-page">
        <div className="reports-error-card">

          <div className="reports-error-icon">
            !
          </div>

          <h1>
            Unable to Load Reports
          </h1>

          <p>
            {error}
          </p>

          <button
            className="reports-primary-btn"
            onClick={loadReports}
          >
            Try Again
          </button>

        </div>
      </div>
    );
  }

  // =====================================================
  // EMPTY
  // =====================================================

  if (!reports) {
    return (
      <div className="reports-admin-page">
        <div className="reports-empty">

          <h1>
            Reports
          </h1>

          <p>
            No report data available.
          </p>

        </div>
      </div>
    );
  }

  // =====================================================
  // NORMALIZED DATA
  // =====================================================

  const users =
    reports.users || {};

  const charities =
    reports.charities || {};

  const draws =
    reports.draws || {};

  const winners =
    reports.winners || {};

  const prizes =
    reports.prizes || {};

  const donations =
    reports.donations || {};

  // -----------------------------------------------------
  // Users
  // -----------------------------------------------------

  const totalUsers =
    users.total ??
    users.totalUsers ??
    reports.totalUsers ??
    0;

  const activeSubscriptions =
    users.activeSubscriptions ??
    reports.activeSubscriptions ??
    0;

  const monthlyPlans =
    users.monthlyPlans ??
    users.monthlySubscriptions ??
    reports.monthlyPlans ??
    0;

  const yearlyPlans =
    users.yearlyPlans ??
    users.yearlySubscriptions ??
    reports.yearlyPlans ??
    0;

  // -----------------------------------------------------
  // Charities
  // -----------------------------------------------------

  const totalCharities =
    charities.total ??
    charities.totalCharities ??
    reports.totalCharities ??
    0;

  const activeCharities =
    charities.active ??
    charities.activeCharities ??
    reports.activeCharities ??
    0;

  const featuredCharities =
    charities.featured ??
    charities.featuredCharities ??
    reports.featuredCharities ??
    0;

  // -----------------------------------------------------
  // Draws
  // -----------------------------------------------------

  const totalDraws =
    draws.total ??
    draws.totalDraws ??
    reports.totalDraws ??
    0;

  const publishedDraws =
    draws.published ??
    draws.publishedDraws ??
    reports.publishedDraws ??
    0;

  const totalPrizePool =
    draws.totalPrizePool ??
    reports.totalPrizePool ??
    0;

  // -----------------------------------------------------
  // Winners
  // -----------------------------------------------------

  const totalWinners =
    winners.total ??
    winners.totalWinners ??
    reports.totalWinners ??
    0;

  const pendingVerification =
    winners.pendingVerification ??
    reports.pendingVerification ??
    0;

  const approvedWinners =
    winners.approved ??
    winners.approvedWinners ??
    reports.approvedWinners ??
    0;

  const paidWinners =
    winners.paid ??
    winners.paidWinners ??
    reports.paidWinners ??
    0;

  // -----------------------------------------------------
  // Prizes
  // -----------------------------------------------------

  const totalPrizeAmount =
    prizes.totalPrizeAmount ??
    reports.totalPrizeAmount ??
    0;

  // -----------------------------------------------------
  // Donations
  // -----------------------------------------------------

  const totalDonations =
    donations.total ??
    donations.totalDonations ??
    reports.totalDonations ??
    0;

  const paidDonations =
    donations.paid ??
    donations.paidDonations ??
    reports.paidDonations ??
    0;

  const pendingDonations =
    donations.pending ??
    donations.pendingDonations ??
    reports.pendingDonations ??
    0;

  const failedDonations =
    donations.failed ??
    donations.failedDonations ??
    reports.failedDonations ??
    0;

  const totalDonors =
    donations.totalDonors ??
    reports.totalDonors ??
    0;

  const totalDonated =
    donations.totalDonated ??
    donations.totalDonationAmount ??
    reports.totalDonated ??
    reports.totalDonationAmount ??
    0;

  // =====================================================
  // CHARITY-WISE DONATIONS
  // =====================================================

  const rawCharityWise =
    donations.charityWise ??
    reports.charityWiseDonations ??
    reports.charityWise ??
    [];

  const charityWise =
    rawCharityWise.map(
      (charity) => ({
        id:
          charity.charityId ??
          charity._id ??
          charity.id,

        charityName:
          charity.charityName ??
          charity.name ??
          "Unknown Charity",

        donationCount:
          charity.donations ??
          charity.donationCount ??
          0,

        totalAmount:
          charity.amount ??
          charity.totalAmount ??
          0,
      })
    );

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="reports-admin-page">

      {/* HEADER */}

      <header className="reports-admin-header">

        <div className="reports-brand">

          <div className="reports-brand-mark">
            DH
          </div>

          <div>
            <h1>
              Reports & Impact
            </h1>

            <p>
              Digital Heroes administration
            </p>
          </div>

        </div>

      </header>

      <main className="reports-main">

        {/* HERO */}

        <section className="reports-hero">

          <div>

            <span>
              PLATFORM ANALYTICS
            </span>

            <h2>
              Reports & Impact
            </h2>

            <p>
              Monitor subscriptions, draws,
              winners, prizes and charity
              contributions.
            </p>

          </div>

          <button
            className="reports-refresh-btn"
            onClick={loadReports}
          >
            ↻ Refresh
          </button>

        </section>

        {/* USERS */}

        <section className="reports-section">

          <div className="reports-section-heading">

            <span>
              MEMBERS
            </span>

            <h2>
              Users & Subscriptions
            </h2>

          </div>

          <div className="reports-grid">

            <div className="reports-card">
              <span>
                Total Users
              </span>

              <strong>
                {totalUsers}
              </strong>
            </div>

            <div className="reports-card">
              <span>
                Active Subscriptions
              </span>

              <strong>
                {activeSubscriptions}
              </strong>
            </div>

            <div className="reports-card">
              <span>
                Monthly Plans
              </span>

              <strong>
                {monthlyPlans}
              </strong>
            </div>

            <div className="reports-card">
              <span>
                Yearly Plans
              </span>

              <strong>
                {yearlyPlans}
              </strong>
            </div>

          </div>
        </section>

        {/* CHARITIES */}

        <section className="reports-section">

          <div className="reports-section-heading">

            <span>
              CHARITIES
            </span>

            <h2>
              Charity Overview
            </h2>

          </div>

          <div className="reports-grid">

            <div className="reports-card">
              <span>
                Total Charities
              </span>

              <strong>
                {totalCharities}
              </strong>
            </div>

            <div className="reports-card">
              <span>
                Active Charities
              </span>

              <strong>
                {activeCharities}
              </strong>
            </div>

            <div className="reports-card">
              <span>
                Featured Charities
              </span>

              <strong>
                {featuredCharities}
              </strong>
            </div>

          </div>
        </section>

        {/* DRAWS */}

        <section className="reports-section">

          <div className="reports-section-heading">

            <span>
              DRAWS
            </span>

            <h2>
              Draw Overview
            </h2>

          </div>

          <div className="reports-grid">

            <div className="reports-card">

              <span>
                Total Draws
              </span>

              <strong>
                {totalDraws}
              </strong>

            </div>

            <div className="reports-card">

              <span>
                Published Draws
              </span>

              <strong>
                {publishedDraws}
              </strong>

            </div>

            <div className="reports-card">

              <span>
                Total Prize Pool
              </span>

              <strong>
                {formatAmount(
                  totalPrizePool
                )}
              </strong>

            </div>

          </div>
        </section>

        {/* WINNERS */}

        <section className="reports-section">

          <div className="reports-section-heading">

            <span>
              WINNERS
            </span>

            <h2>
              Winner Overview
            </h2>

          </div>

          <div className="reports-grid">

            <div className="reports-card">

              <span>
                Total Winners
              </span>

              <strong>
                {totalWinners}
              </strong>

            </div>

            <div className="reports-card">

              <span>
                Pending Verification
              </span>

              <strong>
                {pendingVerification}
              </strong>

            </div>

            <div className="reports-card">

              <span>
                Approved Winners
              </span>

              <strong>
                {approvedWinners}
              </strong>

            </div>

            <div className="reports-card">

              <span>
                Paid Winners
              </span>

              <strong>
                {paidWinners}
              </strong>

            </div>

          </div>
        </section>

        {/* PRIZE */}

        <section className="reports-section">

          <div className="reports-section-heading">

            <span>
              PRIZES
            </span>

            <h2>
              Prize Overview
            </h2>

          </div>

          <div className="reports-highlight-card">

            <div>

              <span>
                TOTAL PRIZE AMOUNT
              </span>

              <p>
                Recorded prize amount
                across the platform.
              </p>

            </div>

            <strong>
              {formatAmount(
                totalPrizeAmount
              )}
            </strong>

          </div>
        </section>

        {/* DONATIONS */}

        <section className="reports-section">

          <div className="reports-section-heading">

            <span>
              SOCIAL IMPACT
            </span>

            <h2>
              Charity Donation Impact
            </h2>

            <p>
              Track successful donations
              and support received by each
              charity.
            </p>

          </div>

          <div className="reports-grid">

            <div className="reports-card">

              <span>
                Total Donations
              </span>

              <strong>
                {totalDonations}
              </strong>

            </div>

            <div className="reports-card">

              <span>
                Paid Donations
              </span>

              <strong>
                {paidDonations}
              </strong>

            </div>

            <div className="reports-card">

              <span>
                Pending Donations
              </span>

              <strong>
                {pendingDonations}
              </strong>

            </div>

            <div className="reports-card">

              <span>
                Failed Donations
              </span>

              <strong>
                {failedDonations}
              </strong>

            </div>

            <div className="reports-card">

              <span>
                Total Donors
              </span>

              <strong>
                {totalDonors}
              </strong>

            </div>

            <div className="reports-highlight-card">

              <div>

                <span>
                  TOTAL DONATED
                </span>

                <p>
                  Successful charity
                  contributions.
                </p>

              </div>

              <strong>
                {formatAmount(
                  totalDonated
                )}
              </strong>

            </div>

          </div>

        </section>

        {/* CHARITY WISE */}

        <section className="reports-section">

          <div className="reports-section-heading">

            <span>
              BREAKDOWN
            </span>

            <h2>
              Charity-wise Donation Impact
            </h2>

          </div>

          {charityWise.length === 0 ? (

            <div className="reports-empty-card">

              <div>♡</div>

              <h3>
                No paid donations yet
              </h3>

              <p>
                Charity donation data will
                appear here once successful
                donations are recorded.
              </p>

            </div>

          ) : (

            <div className="charity-report-list">

              {charityWise.map(
                (charity) => (

                  <div
                    className="charity-report-card"
                    key={
                      charity.id ||
                      charity.charityName
                    }
                  >

                    <div>

                      <h3>
                        {charity.charityName}
                      </h3>

                      <p>
                        {charity.donationCount}{" "}
                        successful donation
                        {charity.donationCount !==
                        1
                          ? "s"
                          : ""}
                      </p>

                    </div>

                    <strong>
                      {formatAmount(
                        charity.totalAmount
                      )}
                    </strong>

                  </div>

                )
              )}

            </div>
          )}

        </section>

        {/* SUMMARY */}

        <section className="reports-section">

          <div className="reports-section-heading">

            <span>
              SUMMARY
            </span>

            <h2>
              Platform Summary
            </h2>

          </div>

          <div className="reports-summary-card">

            <div className="summary-row">

              <span>
                Registered users
              </span>

              <strong>
                {totalUsers}
              </strong>

            </div>

            <div className="summary-row">

              <span>
                Active subscriptions
              </span>

              <strong>
                {activeSubscriptions}
              </strong>

            </div>

            <div className="summary-row">

              <span>
                Published draws
              </span>

              <strong>
                {publishedDraws}
              </strong>

            </div>

            <div className="summary-row">

              <span>
                Winner records
              </span>

              <strong>
                {totalWinners}
              </strong>

            </div>

            <div className="summary-row">

              <span>
                Recorded prize amount
              </span>

              <strong>
                {formatAmount(
                  totalPrizeAmount
                )}
              </strong>

            </div>

            <div className="summary-row">

              <span>
                Successful donations
              </span>

              <strong>
                {formatAmount(
                  totalDonated
                )}
              </strong>

            </div>

          </div>

        </section>

      </main>

    </div>
  );
};

export default Reports;