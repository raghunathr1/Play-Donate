import { useEffect, useState } from "react";
import { apiRequest } from "../../api";
import "./Reports.css";

const Reports = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest(
        "/admin/reports"
      );

      setReports(data.reports);
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "Unable to load reports"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const formatAmount = (amount) => {
    return `₹${Number(
      amount || 0
    ).toLocaleString("en-IN")}`;
  };

  if (loading) {
    return (
      <div className="reports-admin-page">
        <div className="reports-loading">
          <div className="reports-spinner"></div>

          <h1>Reports & Impact</h1>

          <p>
            Loading reports...
          </p>
        </div>
      </div>
    );
  }

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

          <p>{error}</p>

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

  if (!reports) {
    return (
      <div className="reports-admin-page">
        <div className="reports-empty">
          <h1>Reports</h1>

          <p>
            No report data available.
          </p>
        </div>
      </div>
    );
  }

  const charityWise =
    reports.donations?.charityWise || [];

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
              <span>Total Users</span>
              <strong>
                {reports.users.totalUsers}
              </strong>
            </div>

            <div className="reports-card">
              <span>
                Active Subscriptions
              </span>
              <strong>
                {
                  reports.users
                    .activeSubscriptions
                }
              </strong>
            </div>

            <div className="reports-card">
              <span>
                Monthly Plans
              </span>
              <strong>
                {
                  reports.users
                    .monthlySubscriptions
                }
              </strong>
            </div>

            <div className="reports-card">
              <span>
                Yearly Plans
              </span>
              <strong>
                {
                  reports.users
                    .yearlySubscriptions
                }
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
                {
                  reports.charities
                    .totalCharities
                }
              </strong>
            </div>

            <div className="reports-card">
              <span>
                Active Charities
              </span>

              <strong>
                {
                  reports.charities
                    .activeCharities
                }
              </strong>
            </div>

            <div className="reports-card">
              <span>
                Featured Charities
              </span>

              <strong>
                {
                  reports.charities
                    .featuredCharities
                }
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
                {reports.draws.totalDraws}
              </strong>
            </div>

            <div className="reports-card">
              <span>
                Published Draws
              </span>

              <strong>
                {
                  reports.draws
                    .publishedDraws
                }
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
                {
                  reports.winners
                    .totalWinners
                }
              </strong>
            </div>

            <div className="reports-card">
              <span>
                Pending Verification
              </span>

              <strong>
                {
                  reports.winners
                    .pendingVerification
                }
              </strong>
            </div>

            <div className="reports-card">
              <span>
                Approved Winners
              </span>

              <strong>
                {
                  reports.winners
                    .approvedWinners
                }
              </strong>
            </div>

            <div className="reports-card">
              <span>
                Paid Winners
              </span>

              <strong>
                {
                  reports.winners
                    .paidWinners
                }
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
                reports.prizes
                  .totalPrizeAmount
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
                {
                  reports.donations
                    .totalDonations
                }
              </strong>
            </div>

            <div className="reports-card">
              <span>
                Paid Donations
              </span>

              <strong>
                {
                  reports.donations
                    .paidDonations
                }
              </strong>
            </div>

            <div className="reports-card">
              <span>
                Pending Donations
              </span>

              <strong>
                {
                  reports.donations
                    .pendingDonations
                }
              </strong>
            </div>

            <div className="reports-card">
              <span>
                Failed Donations
              </span>

              <strong>
                {
                  reports.donations
                    .failedDonations
                }
              </strong>
            </div>

            <div className="reports-card">
              <span>
                Total Donors
              </span>

              <strong>
                {
                  reports.donations
                    .totalDonors
                }
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
                  reports.donations
                    .totalDonationAmount
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
                    key={charity._id}
                  >

                    <div>
                      <h3>
                        {
                          charity.charityName
                        }
                      </h3>

                      <p>
                        {
                          charity.donationCount
                        }{" "}
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
                {reports.users.totalUsers}
              </strong>
            </div>

            <div className="summary-row">
              <span>
                Active subscriptions
              </span>

              <strong>
                {
                  reports.users
                    .activeSubscriptions
                }
              </strong>
            </div>

            <div className="summary-row">
              <span>
                Published draws
              </span>

              <strong>
                {
                  reports.draws
                    .publishedDraws
                }
              </strong>
            </div>

            <div className="summary-row">
              <span>
                Winner records
              </span>

              <strong>
                {
                  reports.winners
                    .totalWinners
                }
              </strong>
            </div>

            <div className="summary-row">
              <span>
                Recorded prize amount
              </span>

              <strong>
                {formatAmount(
                  reports.prizes
                    .totalPrizeAmount
                )}
              </strong>
            </div>

            <div className="summary-row">
              <span>
                Successful donations
              </span>

              <strong>
                {formatAmount(
                  reports.donations
                    .totalDonationAmount
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
