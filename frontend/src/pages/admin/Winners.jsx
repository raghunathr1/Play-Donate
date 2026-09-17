import { useEffect, useState } from "react";
import { apiRequest } from "../../api";
import "./Winners.css";

const Winners = () => {
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] =
    useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadWinners = async () => {
    try {
      setLoading(true);
      setError("");

      const data =
        await apiRequest("/admin/winners");

      setWinners(data.winners || []);
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "Unable to load winners"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWinners();
  }, []);

  const handleApprove = async (winnerId) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to approve this winner?"
      );

    if (!confirmed) return;

    try {
      setActionLoading(winnerId);
      setError("");
      setSuccess("");

      await apiRequest(
        `/admin/winners/${winnerId}/approve`,
        {
          method: "PUT",
        }
      );

      setSuccess(
        "Winner proof approved successfully."
      );

      await loadWinners();
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "Unable to approve winner"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (winnerId) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to reject this winner proof?"
      );

    if (!confirmed) return;

    try {
      setActionLoading(winnerId);
      setError("");
      setSuccess("");

      await apiRequest(
        `/admin/winners/${winnerId}/reject`,
        {
          method: "PUT",
        }
      );

      setSuccess(
        "Winner proof rejected successfully."
      );

      await loadWinners();
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "Unable to reject winner"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaid = async (winnerId) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to mark this winner as paid?"
      );

    if (!confirmed) return;

    try {
      setActionLoading(winnerId);
      setError("");
      setSuccess("");

      await apiRequest(
        `/admin/winners/${winnerId}/mark-paid`,
        {
          method: "PUT",
        }
      );

      setSuccess(
        "Winner payment marked as paid."
      );

      await loadWinners();
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "Unable to mark winner as paid"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(
      date
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="winners-admin-page">
        <div className="winners-loading-card">
          <div className="winners-loading-spinner"></div>

          <h2>
            Loading Winner Records
          </h2>

          <p>
            Fetching winner verification
            information...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="winners-admin-page">

      {/* HEADER */}
      <header className="winners-admin-header">

        <div className="winners-admin-brand">
          <div className="winners-brand-mark">
            DH
          </div>

          <div>
            <span>Digital Heroes</span>
            <strong>Admin Console</strong>
          </div>
        </div>

        <div className="winners-header-label">
          Winner Verification
        </div>

      </header>

      <main className="winners-admin-main">

        {/* PAGE HERO */}
        <section className="winners-page-hero">

          <div>
            <span className="winners-eyebrow">
              PRIZE VERIFICATION
            </span>

            <h1>
              Winner Management
            </h1>

            <p>
              Review submitted proof,
              verify winning claims, and
              manage prize payment status.
            </p>
          </div>

          <button
            className="winners-btn winners-btn-secondary"
            onClick={loadWinners}
          >
            Refresh Winners
          </button>

        </section>

        {/* MESSAGES */}
        {error && (
          <div className="winners-message winners-message-error">
            <strong>Error:</strong>{" "}
            {error}
          </div>
        )}

        {success && (
          <div className="winners-message winners-message-success">
            ✓ {success}
          </div>
        )}

        {/* SUMMARY */}
        <section className="winners-summary-grid">

          <div className="winner-summary-card">
            <span>All Winners</span>
            <strong>{winners.length}</strong>
            <small>
              Draw result records
            </small>
          </div>

          <div className="winner-summary-card">
            <span>Pending Verification</span>
            <strong>
              {
                winners.filter(
                  (winner) =>
                    winner.verificationStatus ===
                    "Pending"
                ).length
              }
            </strong>
            <small>
              Awaiting admin review
            </small>
          </div>

          <div className="winner-summary-card">
            <span>Approved</span>
            <strong>
              {
                winners.filter(
                  (winner) =>
                    winner.verificationStatus ===
                    "Approved"
                ).length
              }
            </strong>
            <small>
              Verified winner claims
            </small>
          </div>

          <div className="winner-summary-card">
            <span>Paid</span>
            <strong>
              {
                winners.filter(
                  (winner) =>
                    winner.paymentStatus ===
                    "Paid"
                ).length
              }
            </strong>
            <small>
              Completed payments
            </small>
          </div>

        </section>

        {/* WINNER DIRECTORY */}
        <section className="winner-directory-section">

          <div className="winner-section-heading">
            <div>
              <span className="winners-eyebrow">
                WINNER RECORDS
              </span>

              <h2>
                Verification Queue
              </h2>
            </div>

            <span className="winner-count-badge">
              {winners.length} Records
            </span>
          </div>

          {winners.length === 0 ? (
            <div className="winner-empty-card">

              <div className="winner-empty-icon">
                DH
              </div>

              <h3>
                No winners found
              </h3>

              <p>
                Winner records will appear
                here after draw calculation.
              </p>

            </div>
          ) : (
            <div className="winner-admin-grid">

              {winners.map((winner) => {

                const isProcessing =
                  actionLoading ===
                  winner._id;

                const verificationClass =
                  winner.verificationStatus
                    ?.toLowerCase();

                const paymentClass =
                  winner.paymentStatus
                    ?.toLowerCase();

                return (
                  <article
                    className="winner-admin-card"
                    key={winner._id}
                  >

                    {/* CARD TOP */}
                    <div className="winner-card-top">

                      <div className="winner-user-avatar">
                        {winner.user?.name
                          ?.charAt(0)
                          ?.toUpperCase() ||
                          "W"}
                      </div>

                      <div className="winner-user-info">
                        <h2>
                          {winner.user?.name ||
                            "Unknown User"}
                        </h2>

                        <p>
                          {winner.user?.email ||
                            "-"}
                        </p>
                      </div>

                      <span
                        className={`winner-verification-badge ${verificationClass}`}
                      >
                        {
                          winner.verificationStatus
                        }
                      </span>

                    </div>

                    {/* PRIZE DETAILS */}
                    <div className="winner-details-grid">

                      <div className="winner-detail-item">
                        <span>
                          Prize Amount
                        </span>

                        <strong className="winner-prize">
                          ₹
                          {Number(
                            winner.prizeAmount ||
                              0
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </strong>
                      </div>

                      <div className="winner-detail-item">
                        <span>
                          Match
                        </span>

                        <strong>
                          {
                            winner.matchedNumbers
                          }
                        </strong>
                      </div>

                      <div className="winner-detail-item">
                        <span>
                          Category
                        </span>

                        <strong>
                          {
                            winner.prizeCategory
                          }
                        </strong>
                      </div>

                      <div className="winner-detail-item">
                        <span>
                          Payment
                        </span>

                        <span
                          className={`winner-payment-badge ${paymentClass}`}
                        >
                          {
                            winner.paymentStatus
                          }
                        </span>
                      </div>

                      <div className="winner-detail-item">
                        <span>
                          Submitted
                        </span>

                        <strong>
                          {formatDate(
                            winner.updatedAt
                          )}
                        </strong>
                      </div>

                    </div>

                    {/* PROOF */}
                    <div className="winner-proof-section">

                      <div className="winner-proof-heading">
                        <div>
                          <span>
                            VERIFICATION PROOF
                          </span>

                          <h3>
                            Winner Screenshot
                          </h3>
                        </div>

                        {winner.proofScreenshot && (
                          <span className="proof-ready-badge">
                            Proof Submitted
                          </span>
                        )}
                      </div>

                      {winner.proofScreenshot ? (
                        <>

                          <div className="winner-proof-preview">
                            <img
                              src={
                                winner.proofScreenshot
                              }
                              alt="Winner proof screenshot"
                            />
                          </div>

                          <a
                            href={
                              winner.proofScreenshot
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="winners-btn winners-btn-secondary proof-open-btn"
                          >
                            Open Full Screenshot
                          </a>

                        </>
                      ) : (
                        <div className="proof-empty">
                          <span>
                            No proof screenshot
                            submitted yet.
                          </span>
                        </div>
                      )}

                    </div>

                    {/* ACTIONS */}
                    <div className="winner-admin-actions">

                      {winner.verificationStatus ===
                        "Pending" &&
                        winner.proofScreenshot && (
                          <div className="winner-review-actions">

                            <button
                              className="winners-btn winners-btn-primary"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                handleApprove(
                                  winner._id
                                )
                              }
                            >
                              {isProcessing
                                ? "Processing..."
                                : "Approve Winner"}
                            </button>

                            <button
                              className="winners-btn winners-btn-danger"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                handleReject(
                                  winner._id
                                )
                              }
                            >
                              {isProcessing
                                ? "Processing..."
                                : "Reject Proof"}
                            </button>

                          </div>
                        )}

                      {winner.verificationStatus ===
                        "Pending" &&
                        !winner.proofScreenshot && (
                          <div className="winner-action-note waiting">
                            <strong>
                              Waiting for proof
                            </strong>

                            <span>
                              The winner must submit
                              a screenshot before
                              verification.
                            </span>
                          </div>
                        )}

                      {winner.verificationStatus ===
                        "Approved" &&
                        winner.paymentStatus ===
                          "Pending" && (
                          <div className="winner-approved-action">

                            <div>
                              <strong>
                                Winner approved
                              </strong>

                              <span>
                                Prize is ready for
                                payment.
                              </span>
                            </div>

                            <button
                              className="winners-btn winners-btn-primary"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                handleMarkPaid(
                                  winner._id
                                )
                              }
                            >
                              {isProcessing
                                ? "Processing..."
                                : "Mark as Paid"}
                            </button>

                          </div>
                        )}

                      {winner.verificationStatus ===
                        "Rejected" && (
                        <div className="winner-action-note rejected">
                          <strong>
                            Proof rejected
                          </strong>

                          <span>
                            Winner can submit a
                            new screenshot for
                            review.
                          </span>
                        </div>
                      )}

                      {winner.paymentStatus ===
                        "Paid" && (
                        <div className="winner-action-note paid">
                          <strong>
                            ✓ Prize payment completed
                          </strong>

                          <span>
                            This winner has received
                            the recorded prize
                            payment.
                          </span>
                        </div>
                      )}

                    </div>

                  </article>
                );
              })}

            </div>
          )}

        </section>

      </main>
    </div>
  );
};

export default Winners;

