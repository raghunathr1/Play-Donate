import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getWinners,
  verifyWinner,
  markWinnerPaid,
} from "../../api";

// =====================================================
// HELPERS
// =====================================================

const formatCurrency = (
  amount
) => {
  const value =
    Number(amount || 0);

  return `₹${value.toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 2,
    }
  )}`;
};

const normalizeStatus = (
  value
) => {
  const status = String(
    value || ""
  )
    .trim()
    .toLowerCase();

  if (
    status === "approved" ||
    status === "verified"
  ) {
    return "Approved";
  }

  if (status === "paid") {
    return "Paid";
  }

  return "Pending";
};

const getMatchText = (
  matchedNumbers
) => {
  const count =
    Number(
      matchedNumbers || 0
    );

  if (count >= 5) {
    return "5 Match";
  }

  if (count === 4) {
    return "4 Match";
  }

  if (count === 3) {
    return "3 Match";
  }

  return `${count} Match`;
};

// =====================================================
// COMPONENT
// =====================================================

const Winners = () => {
  // ===================================================
  // STATE
  // ===================================================

  const [
    winners,
    setWinners,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  // ===================================================
  // LOAD WINNERS
  // ===================================================

  const loadWinners =
    async () => {
      try {
        setError("");

        const data =
          await getWinners();

        const winnerList =
          Array.isArray(
            data?.winners
          )
            ? data.winners
            : [];

        const normalized =
          winnerList.map(
            (winner) => ({
              ...winner,

              verification_status:
                normalizeStatus(
                  winner.verification_status
                ),

              payment_status:
                normalizeStatus(
                  winner.payment_status
                ),

              matched_numbers:
                Number(
                  winner.matched_numbers ||
                    0
                ),

              prize_amount:
                Number(
                  winner.prize_amount ||
                    0
                ),
            })
          );

        setWinners(
          normalized
        );
      } catch (err) {
        console.error(
          "Load winners error:",
          err
        );

        setError(
          err.response?.data
            ?.message ||
            "Failed to load winners"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

  // ===================================================
  // INITIAL LOAD
  // ===================================================

  useEffect(() => {
    loadWinners();
  }, []);

  // ===================================================
  // REFRESH
  // ===================================================

  const handleRefresh =
    async () => {
      setRefreshing(true);
      setSuccess("");
      setError("");

      await loadWinners();
    };

  // ===================================================
  // VERIFY WINNER
  // ===================================================

  const handleVerify =
    async (winnerId) => {
      try {
        setActionLoading(
          `verify-${winnerId}`
        );

        setError("");
        setSuccess("");

        await verifyWinner(
          winnerId
        );

        setSuccess(
          "Winner verified successfully."
        );

        await loadWinners();
      } catch (err) {
        console.error(
          "Verify winner error:",
          err
        );

        setError(
          err.response?.data
            ?.message ||
            "Failed to verify winner"
        );
      } finally {
        setActionLoading(null);
      }
    };

  // ===================================================
  // MARK AS PAID
  // ===================================================

  const handlePayment =
    async (winnerId) => {
      try {
        setActionLoading(
          `payment-${winnerId}`
        );

        setError("");
        setSuccess("");

        await markWinnerPaid(
          winnerId
        );

        setSuccess(
          "Winner payment marked as paid."
        );

        await loadWinners();
      } catch (err) {
        console.error(
          "Winner payment error:",
          err
        );

        setError(
          err.response?.data
            ?.message ||
            "Failed to update payment"
        );
      } finally {
        setActionLoading(null);
      }
    };

  // ===================================================
  // STATISTICS
  // ===================================================

  const statistics =
    useMemo(() => {
      const total =
        winners.length;

      const pendingVerification =
        winners.filter(
          (winner) =>
            winner.verification_status ===
            "Pending"
        ).length;

      const approved =
        winners.filter(
          (winner) =>
            winner.verification_status ===
            "Approved"
        ).length;

      const paid =
        winners.filter(
          (winner) =>
            winner.payment_status ===
            "Paid"
        ).length;

      return {
        total,
        pendingVerification,
        approved,
        paid,
      };
    }, [winners]);

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <div
        className="winners-page winners-loading"
        style={{
          padding: "40px",
          textAlign: "center",
        }}
      >
        Loading winners...
      </div>
    );
  }

  // ===================================================
  // UI
  // ===================================================

  return (
    <div
      className="winners-page"
      style={{
        padding: "30px",
        maxWidth: "1400px",
        margin: "0 auto",
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <div
        className="winners-header"
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: "20px",
          marginBottom: "30px",
          flexWrap: "wrap",
        }}
      >
        <div className="winners-header-content">
          <div
            className="winners-eyebrow"
            style={{
              fontSize: "13px",
              fontWeight: "700",
              letterSpacing: "1.5px",
              color: "#777",
              marginBottom: "8px",
            }}
          >
            PRIZE VERIFICATION
          </div>

          <h1
            className="winners-title"
            style={{
              margin: 0,
              fontSize: "32px",
            }}
          >
            Winner Management
          </h1>

          <p
            className="winners-subtitle"
            style={{
              marginTop: "8px",
              color: "#666",
            }}
          >
            Review submitted proof,
            verify winning claims,
            and manage prize payment
            status.
          </p>
        </div>

        <button
          className="refresh-winners-btn"
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            padding: "12px 18px",
            border:
              "1px solid #ddd",
            borderRadius: "10px",
            background: "#fff",
            cursor: refreshing
              ? "not-allowed"
              : "pointer",
            fontWeight: "600",
          }}
        >
          {refreshing
            ? "Refreshing..."
            : "Refresh Winners"}
        </button>
      </div>

      {/* =================================================
          SUCCESS
      ================================================= */}

      {success && (
        <div
          className="winner-success-message"
          style={{
            marginBottom: "20px",
            padding: "14px 16px",
            borderRadius: "10px",
            background:
              "#eaf8ef",
            color: "#18753c",
            border:
              "1px solid #b9e6c8",
          }}
        >
          {success}
        </div>
      )}

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div
          className="winner-error-message"
          style={{
            marginBottom: "20px",
            padding: "14px 16px",
            borderRadius: "10px",
            background:
              "#fff0f0",
            color: "#b42318",
            border:
              "1px solid #f3b7b7",
          }}
        >
          {error}
        </div>
      )}

      {/* =================================================
          STATISTICS
      ================================================= */}

      <div
        className="winner-statistics"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(190px, 1fr))",
          gap: "18px",
          marginBottom: "35px",
        }}
      >
        <StatCard
          title="All Winners"
          value={
            statistics.total
          }
          description="Draw result records"
        />

        <StatCard
          title="Pending Verification"
          value={
            statistics.pendingVerification
          }
          description="Awaiting admin review"
        />

        <StatCard
          title="Approved"
          value={
            statistics.approved
          }
          description="Verified winner claims"
        />

        <StatCard
          title="Paid"
          value={
            statistics.paid
          }
          description="Completed payments"
        />
      </div>

      {/* =================================================
          WINNER RECORDS
      ================================================= */}

      <section
        className="winner-records-section"
      >
        <div
          className="winner-records-header"
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: "18px",
          }}
        >
          <div>
            <div
              className="winner-records-label"
              style={{
                fontSize: "13px",
                fontWeight: "700",
                letterSpacing: "1.2px",
                color: "#777",
              }}
            >
              WINNER RECORDS
            </div>

            <h2
              className="winner-records-title"
              style={{
                margin:
                  "6px 0 0",
              }}
            >
              Verification Queue
            </h2>
          </div>

          <span
            className="winner-record-count"
            style={{
              fontSize: "14px",
              color: "#666",
            }}
          >
            {winners.length} Records
          </span>
        </div>

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {winners.length ===
        0 ? (
          <div
            className="winner-empty-state"
            style={{
              padding: "50px",
              textAlign: "center",
              border:
                "1px solid #e5e5e5",
              borderRadius: "16px",
              background: "#fff",
            }}
          >
            <h3>
              No winner records found
            </h3>

            <p
              style={{
                marginTop: "8px",
                color: "#777",
              }}
            >
              Winners will appear
              here after draw results
              are calculated.
            </p>
          </div>
        ) : (
          <div
            className="winner-list"
            style={{
              display: "grid",
              gap: "18px",
            }}
          >
            {winners.map(
              (
                winner,
                index
              ) => {
                const isVerifying =
                  actionLoading ===
                  `verify-${winner.id}`;

                const isPaying =
                  actionLoading ===
                  `payment-${winner.id}`;

                const isApproved =
                  winner.verification_status ===
                  "Approved";

                const isPaid =
                  winner.payment_status ===
                  "Paid";

                const displayName =
                  winner.user_name ||
                  `Winner #${
                    index + 1
                  }`;

                return (
                  <div
                    key={winner.id}
                    className="winner-card"
                    style={{
                      border:
                        "1px solid #e5e5e5",
                      borderRadius:
                        "18px",
                      padding: "24px",
                      background:
                        "#fff",
                      boxShadow:
                        "0 4px 15px rgba(0,0,0,0.04)",
                    }}
                  >
                    {/* ===================================
                        WINNER HEADER
                    =================================== */}

                    <div
                      className="winner-card-header"
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap: "20px",
                        flexWrap:
                          "wrap",
                        marginBottom:
                          "22px",
                      }}
                    >
                      <div
                        className="winner-user-info"
                        style={{
                          display:
                            "flex",
                          gap: "14px",
                          alignItems:
                            "center",
                        }}
                      >
                        <div
                          className="winner-avatar"
                          style={{
                            width:
                              "46px",
                            height:
                              "46px",
                            borderRadius:
                              "50%",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            background:
                              "#f2f2f2",
                            fontWeight:
                              "700",
                          }}
                        >
                          {displayName
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <h3
                            className="winner-name"
                            style={{
                              margin:
                                0,
                            }}
                          >
                            {displayName}
                          </h3>

                          <p
                            className="winner-email"
                            style={{
                              margin:
                                "5px 0 0",
                              color:
                                "#777",
                              fontSize:
                                "14px",
                            }}
                          >
                            {winner.user_email ||
                              `User ID: ${winner.user_id}`}
                          </p>
                        </div>
                      </div>

                      <div
                        className="winner-prize"
                        style={{
                          textAlign:
                            "right",
                        }}
                      >
                        <div
                          style={{
                            fontSize:
                              "13px",
                            color:
                              "#777",
                          }}
                        >
                          Prize Amount
                        </div>

                        <div
                          className="winner-prize-amount"
                          style={{
                            fontSize:
                              "24px",
                            fontWeight:
                              "800",
                            marginTop:
                              "3px",
                          }}
                        >
                          {formatCurrency(
                            winner.prize_amount
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ===================================
                        DETAILS
                    =================================== */}

                    <div
                      className="winner-details-grid"
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(160px, 1fr))",
                        gap: "14px",
                        marginBottom:
                          "22px",
                      }}
                    >
                      <InfoBox
                        label="Match"
                        value={getMatchText(
                          winner.matched_numbers
                        )}
                      />

                      <InfoBox
                        label="Category"
                        value={
                          winner.prize_category ||
                          "-"
                        }
                      />

                      <InfoBox
                        label="Verification"
                        value={
                          winner.verification_status
                        }
                      />

                      <InfoBox
                        label="Payment"
                        value={
                          winner.payment_status
                        }
                      />
                    </div>

                    {/* ===================================
                        VERIFICATION PROOF
                    =================================== */}

                    <div
                      className="verification-proof"
                      style={{
                        borderTop:
                          "1px solid #eee",
                        paddingTop:
                          "20px",
                        marginBottom:
                          "20px",
                      }}
                    >
                      <div
                        className="verification-proof-title"
                        style={{
                          fontSize:
                            "13px",
                          fontWeight:
                            "700",
                          letterSpacing:
                            "1px",
                          color:
                            "#777",
                          marginBottom:
                            "10px",
                        }}
                      >
                        VERIFICATION PROOF
                      </div>

                      <div
                        className="verification-proof-box"
                        style={{
                          padding:
                            "20px",
                          border:
                            "1px dashed #d7d7d7",
                          borderRadius:
                            "12px",
                          background:
                            "#fafafa",
                        }}
                      >
                        <strong>
                          Winner Screenshot
                        </strong>

                        <div
                          style={{
                            marginTop:
                              "5px",
                            color:
                              "#777",
                            fontSize:
                              "14px",
                          }}
                        >
                          No proof screenshot
                          submitted yet.
                        </div>
                      </div>
                    </div>

                    {/* ===================================
                        ACTIONS
                    =================================== */}

                    <div
                      className="winner-actions"
                      style={{
                        display:
                          "flex",
                        gap: "12px",
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <button
                        className={`verify-winner-btn ${
                          isApproved
                            ? "approved"
                            : ""
                        }`}
                        type="button"
                        disabled={
                          isVerifying ||
                          isApproved
                        }
                        onClick={() =>
                          handleVerify(
                            winner.id
                          )
                        }
                        style={{
                          padding:
                            "11px 18px",
                          border:
                            "none",
                          borderRadius:
                            "9px",
                          background:
                            isApproved
                              ? "#d9f2df"
                              : "#111",
                          color:
                            isApproved
                              ? "#21753a"
                              : "#fff",
                          cursor:
                            isVerifying ||
                            isApproved
                              ? "not-allowed"
                              : "pointer",
                          fontWeight:
                            "700",
                        }}
                      >
                        {isVerifying
                          ? "Verifying..."
                          : isApproved
                          ? "Approved"
                          : "Verify Winner"}
                      </button>

                      <button
                        className={`mark-paid-btn ${
                          isPaid
                            ? "paid"
                            : ""
                        }`}
                        type="button"
                        disabled={
                          !isApproved ||
                          isPaying ||
                          isPaid
                        }
                        onClick={() =>
                          handlePayment(
                            winner.id
                          )
                        }
                        style={{
                          padding:
                            "11px 18px",
                          border:
                            "1px solid #ddd",
                          borderRadius:
                            "9px",
                          background:
                            isPaid
                              ? "#d9f2df"
                              : "#fff",
                          color:
                            isPaid
                              ? "#21753a"
                              : "#222",
                          cursor:
                            !isApproved ||
                            isPaying ||
                            isPaid
                              ? "not-allowed"
                              : "pointer",
                          fontWeight:
                            "700",
                        }}
                      >
                        {isPaying
                          ? "Processing..."
                          : isPaid
                          ? "Paid"
                          : "Mark as Paid"}
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
};

// =====================================================
// STAT CARD
// =====================================================

const StatCard = ({
  title,
  value,
  description,
}) => {
  return (
    <div
      className="winner-stat-card"
      style={{
        padding: "22px",
        border:
          "1px solid #e5e5e5",
        borderRadius: "16px",
        background: "#fff",
      }}
    >
      <div
        className="winner-stat-title"
        style={{
          fontSize: "13px",
          color: "#777",
          fontWeight: "700",
          marginBottom: "10px",
        }}
      >
        {title}
      </div>

      <div
        className="winner-stat-value"
        style={{
          fontSize: "30px",
          fontWeight: "800",
        }}
      >
        {value}
      </div>

      <div
        className="winner-stat-description"
        style={{
          marginTop: "6px",
          color: "#888",
          fontSize: "13px",
        }}
      >
        {description}
      </div>
    </div>
  );
};

// =====================================================
// INFO BOX
// =====================================================

const InfoBox = ({
  label,
  value,
}) => {
  return (
    <div
      className="winner-info-box"
      style={{
        padding: "14px",
        borderRadius: "10px",
        background: "#f8f8f8",
      }}
    >
      <div
        className="winner-info-label"
        style={{
          fontSize: "12px",
          color: "#777",
          marginBottom: "5px",
        }}
      >
        {label}
      </div>

      <div
        className="winner-info-value"
        style={{
          fontWeight: "700",
        }}
      >
        {value}
      </div>
    </div>
  );
};

export default Winners;