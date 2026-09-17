import { useEffect, useState } from "react";
import { apiRequest } from "../../api";
import "./Winnings.css";

function Winnings() {
  const [winnings, setWinnings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [proofFiles, setProofFiles] =
    useState({});

  const [uploadingId, setUploadingId] =
    useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // =========================================================
  // LOAD WINNINGS
  // =========================================================

  const loadWinnings = async () => {
    try {
      setLoading(true);
      setError("");

      const data =
        await apiRequest("/winners/my");

      setWinnings(
        data.winnings || []
      );
    } catch (error) {
      console.error(
        "Winnings Load Error:",
        error.message
      );

      setError(
        error.message ||
          "Unable to load your winnings."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWinnings();
  }, []);

  // =========================================================
  // FILE CHANGE
  // =========================================================

  const handleProofChange = (
    winningId,
    file
  ) => {
    setError("");
    setMessage("");

    if (!file) {
      setProofFiles((previous) => ({
        ...previous,
        [winningId]: null,
      }));

      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        "Please select an image file."
      );

      return;
    }

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {
      setError(
        "Screenshot size must be less than 5 MB."
      );

      return;
    }

    setProofFiles((previous) => ({
      ...previous,
      [winningId]: file,
    }));
  };

  // =========================================================
  // UPLOAD PROOF
  // =========================================================

  const handleProofUpload = async (
    winningId
  ) => {
    const file =
      proofFiles[winningId];

    if (!file) {
      setError(
        "Please select your score screenshot first."
      );

      return;
    }

    try {
      setUploadingId(winningId);
      setError("");
      setMessage("");

      const formData =
        new FormData();

      formData.append(
        "proofScreenshot",
        file
      );

      await apiRequest(
        `/winners/${winningId}/proof`,
        {
          method: "PUT",
          body: formData,
        }
      );

      setMessage(
        "Score proof uploaded successfully and sent for verification."
      );

      setProofFiles((previous) => ({
        ...previous,
        [winningId]: null,
      }));

      await loadWinnings();
    } catch (error) {
      console.error(
        "Proof Upload Error:",
        error.message
      );

      setError(
        error.message ||
          "Unable to upload score proof."
      );
    } finally {
      setUploadingId(null);
    }
  };

  // =========================================================
  // FORMAT CURRENCY
  // =========================================================

  const formatCurrency = (
    amount
  ) => {
    return Number(
      amount || 0
    ).toLocaleString("en-IN");
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="winnings-page">
        <div className="winnings-loading">
          <div className="winnings-spinner"></div>
          <p>
            Loading your winnings...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // SUMMARY
  // =========================================================

  const totalWinnings =
    winnings.reduce(
      (total, winning) =>
        total +
        Number(
          winning.prizeAmount || 0
        ),
      0
    );

  const paidWinnings =
    winnings
      .filter(
        (winning) =>
          winning.paymentStatus ===
          "Paid"
      )
      .reduce(
        (total, winning) =>
          total +
          Number(
            winning.prizeAmount || 0
          ),
        0
      );

  const pendingWinnings =
    winnings
      .filter(
        (winning) =>
          winning.paymentStatus ===
          "Pending"
      )
      .reduce(
        (total, winning) =>
          total +
          Number(
            winning.prizeAmount || 0
          ),
        0
      );

  return (
    <div className="winnings-page">

      {/* HEADER */}

      <header className="winnings-header">
        <div className="winnings-brand">
          <div className="winnings-brand-mark">
            DH
          </div>

          <span>Digital Heroes</span>
        </div>

        <a
          href="/dashboard"
          className="winnings-back"
        >
          ← Dashboard
        </a>
      </header>

      {/* HERO */}

      <section className="winnings-hero">
        <div>
          <span className="winnings-label">
            YOUR REWARDS
          </span>

          <h1>
            Your winnings,
            <br />
            your journey.
          </h1>

          <p>
            Track your prize winnings,
            submit verification proof and
            follow your payment status.
          </p>
        </div>

        <div className="winnings-hero-icon">
          ₹
        </div>
      </section>

      <main className="winnings-container">

        {/* MESSAGES */}

        {error && (
          <div className="winnings-message error">
            {error}
          </div>
        )}

        {message && (
          <div className="winnings-message success">
            {message}
          </div>
        )}

        {/* SUMMARY */}

        <section className="winnings-summary">

          <div className="summary-heading">
            <div>
              <span className="section-label">
                OVERVIEW
              </span>

              <h2>
                Winnings Summary
              </h2>
            </div>
          </div>

          <div className="summary-grid">

            <div className="summary-card total">
              <span>
                TOTAL WINNINGS
              </span>

              <strong>
                ₹
                {formatCurrency(
                  totalWinnings
                )}
              </strong>

              <small>
                All recorded prizes
              </small>
            </div>

            <div className="summary-card paid">
              <span>
                PAID
              </span>

              <strong>
                ₹
                {formatCurrency(
                  paidWinnings
                )}
              </strong>

              <small>
                Completed payments
              </small>
            </div>

            <div className="summary-card pending">
              <span>
                PENDING
              </span>

              <strong>
                ₹
                {formatCurrency(
                  pendingWinnings
                )}
              </strong>

              <small>
                Awaiting payment
              </small>
            </div>

          </div>

        </section>

        {/* HISTORY */}

        <section className="winning-history">

          <div className="section-heading">
            <span className="section-label">
              WINNING HISTORY
            </span>

            <h2>
              Your prize records
            </h2>
          </div>

          {winnings.length === 0 ? (
            <div className="empty-winnings">

              <div className="empty-winning-icon">
                ₹
              </div>

              <h3>
                No winnings yet
              </h3>

              <p>
                Your winning records will
                appear here when you win
                a monthly draw.
              </p>

              <a
                href="/draws"
                className="view-draw-btn"
              >
                View Draws
              </a>

            </div>
          ) : (
            <div className="winning-list">

              {winnings.map(
                (winning) => {

                  const drawName =
                    winning.draw
                      ?.drawMonth ||
                    "Monthly Draw";

                  const match =
                    winning.prizeCategory ||
                    `${winning.matchedNumbers} Number Match`;

                  const verificationStatus =
                    winning.verificationStatus ||
                    "Pending";

                  const paymentStatus =
                    winning.paymentStatus ||
                    "Pending";

                  const selectedFile =
                    proofFiles[
                      winning._id
                    ];

                  const isUploading =
                    uploadingId ===
                    winning._id;

                  return (
                    <article
                      key={winning._id}
                      className="winning-card"
                    >

                      {/* CARD TOP */}

                      <div className="winning-card-top">

                        <div>
                          <span className="winning-draw-label">
                            DRAW
                          </span>

                          <h3>
                            {drawName}
                          </h3>
                        </div>

                        <div className="winning-prize">
                          <span>
                            PRIZE
                          </span>

                          <strong>
                            ₹
                            {formatCurrency(
                              winning.prizeAmount
                            )}
                          </strong>
                        </div>

                      </div>

                      {/* MATCH */}

                      <div className="winning-meta">

                        <div>
                          <span>
                            MATCH
                          </span>

                          <strong>
                            {match}
                          </strong>
                        </div>

                        <div>
                          <span>
                            NUMBERS MATCHED
                          </span>

                          <strong>
                            {
                              winning.matchedNumbers
                            }
                          </strong>
                        </div>

                      </div>

                      {/* STATUS */}

                      <div className="status-row">

                        <div>
                          <span>
                            VERIFICATION
                          </span>

                          <strong
                            className={`status-pill verification-${verificationStatus.toLowerCase()}`}
                          >
                            {
                              verificationStatus
                            }
                          </strong>
                        </div>

                        <div>
                          <span>
                            PAYMENT
                          </span>

                          <strong
                            className={`status-pill payment-${paymentStatus.toLowerCase()}`}
                          >
                            {paymentStatus}
                          </strong>
                        </div>

                      </div>

                      {/* EXISTING PROOF */}

                      {winning.proofScreenshot && (
                        <div className="proof-submitted">

                          <div className="proof-heading">
                            <div>
                              <span className="section-label">
                                SCORE PROOF
                              </span>

                              <h4>
                                Screenshot submitted
                              </h4>
                            </div>

                            <span className="proof-check">
                              ✓
                            </span>
                          </div>

                          <img
                            src={
                              winning.proofScreenshot
                            }
                            alt="Score proof"
                            className="proof-image"
                          />

                          <a
                            href={
                              winning.proofScreenshot
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="proof-link"
                          >
                            Open Full Screenshot ↗
                          </a>

                        </div>
                      )}

                      {/* PENDING UPLOAD */}

                      {!winning.proofScreenshot &&
                        verificationStatus ===
                          "Pending" && (
                          <div className="proof-upload">

                            <div>
                              <span className="section-label">
                                VERIFICATION REQUIRED
                              </span>

                              <h4>
                                Submit Score Proof
                              </h4>

                              <p>
                                Upload a screenshot
                                of your golf score
                                for administrator
                                verification.
                              </p>

                              <small>
                                Image files up to
                                5 MB.
                              </small>
                            </div>

                            <label className="file-input-label">
                              Choose Screenshot

                              <input
                                type="file"
                                accept="image/*"
                                onChange={(event) =>
                                  handleProofChange(
                                    winning._id,
                                    event.target
                                      .files?.[0]
                                  )
                                }
                                disabled={
                                  isUploading
                                }
                              />
                            </label>

                            {selectedFile && (
                              <div className="selected-file">
                                <span>
                                  Selected:
                                </span>

                                <strong>
                                  {
                                    selectedFile.name
                                  }
                                </strong>
                              </div>
                            )}

                            <button
                              type="button"
                              className="upload-proof-btn"
                              onClick={() =>
                                handleProofUpload(
                                  winning._id
                                )
                              }
                              disabled={
                                isUploading ||
                                !selectedFile
                              }
                            >
                              {isUploading
                                ? "Uploading..."
                                : "Upload Score Proof"}
                            </button>

                          </div>
                        )}

                      {/* REJECTED */}

                      {verificationStatus ===
                        "Rejected" && (
                        <div className="rejected-proof">

                          <div className="rejected-icon">
                            !
                          </div>

                          <div>
                            <h4>
                              Previous proof was
                              rejected
                            </h4>

                            <p>
                              Please upload a
                              new score proof
                              for verification.
                            </p>
                          </div>

                          <label className="file-input-label">
                            Choose New Screenshot

                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) =>
                                handleProofChange(
                                  winning._id,
                                  event.target
                                    .files?.[0]
                                )
                              }
                              disabled={
                                isUploading
                              }
                            />
                          </label>

                          {selectedFile && (
                            <div className="selected-file">
                              <span>
                                Selected:
                              </span>

                              <strong>
                                {
                                  selectedFile.name
                                }
                              </strong>
                            </div>
                          )}

                          <button
                            type="button"
                            className="upload-proof-btn"
                            onClick={() =>
                              handleProofUpload(
                                winning._id
                              )
                            }
                            disabled={
                              isUploading ||
                              !selectedFile
                            }
                          >
                            {isUploading
                              ? "Uploading..."
                              : "Submit New Proof"}
                          </button>

                        </div>
                      )}

                      {/* APPROVED */}

                      {verificationStatus ===
                        "Approved" && (
                        <div className="approved-box">

                          <span className="approved-icon">
                            ✓
                          </span>

                          <div>
                            <h4>
                              Score proof approved
                            </h4>

                            <p>
                              Your winner
                              verification has
                              been completed by
                              the administrator.
                            </p>
                          </div>

                        </div>
                      )}

                      {/* PAYMENT PENDING */}

                      {verificationStatus ===
                        "Approved" &&
                        paymentStatus ===
                          "Pending" && (
                          <div className="payment-pending-box">

                            <strong>
                              Payment is pending
                            </strong>

                            <p>
                              Your prize has been
                              verified and is
                              awaiting payment.
                            </p>

                          </div>
                        )}

                      {/* PAYMENT PAID */}

                      {paymentStatus ===
                        "Paid" && (
                        <div className="paid-box">

                          <span>
                            ✓
                          </span>

                          <div>
                            <h4>
                              Prize payment completed
                            </h4>

                            <p>
                              Your winning payment
                              has been marked as
                              Paid.
                            </p>
                          </div>

                        </div>
                      )}

                    </article>
                  );
                }
              )}

            </div>
          )}

        </section>

        {/* VERIFICATION INFO */}

        <section className="verification-info">

          <div className="verification-info-icon">
            i
          </div>

          <div>
            <span className="section-label">
              WINNER VERIFICATION
            </span>

            <h3>
              How prize verification works
            </h3>

            <p>
              If you win a monthly draw,
              you may need to provide a
              screenshot of your golf score.
              The administrator reviews the
              submitted proof. Once approved,
              your prize moves to the payment
              process.
            </p>

            <div className="verification-flow">

              <span>
                01 Proof Submitted
              </span>

              <span>
                →
              </span>

              <span>
                02 Admin Review
              </span>

              <span>
                →
              </span>

              <span>
                03 Approved
              </span>

              <span>
                →
              </span>

              <span>
                04 Payment
              </span>

            </div>
          </div>

        </section>

      </main>

    </div>
  );
}

export default Winnings;

