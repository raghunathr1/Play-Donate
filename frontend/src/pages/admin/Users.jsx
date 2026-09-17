import { useEffect, useState } from "react";
import { apiRequest } from "../../api";
import "./Users.css";

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] =
    useState(null);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD ALL USERS
  // =====================================================

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const data =
        await apiRequest("/admin/users");

      setUsers(data.users || []);
    } catch (error) {
      console.error(
        "Load Users Error:",
        error.message
      );

      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // =====================================================
  // CHANGE SUBSCRIPTION STATUS
  // =====================================================

  const handleStatusChange = async (user) => {
    let newStatus;

    if (
      user.subscriptionStatus === "Active"
    ) {
      newStatus = "Cancelled";
    } else {
      newStatus = "Active";
    }

    const confirmChange =
      window.confirm(
        `Are you sure you want to change this user's subscription status to "${newStatus}"?`
      );

    if (!confirmChange) {
      return;
    }

    try {
      setActionLoading(user._id);
      setError("");

      await apiRequest(
        `/admin/users/${user._id}/subscription-status`,
        {
          method: "PUT",
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      await loadUsers();
    } catch (error) {
      console.error(
        "Update Subscription Status Error:",
        error.message
      );

      setError(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="users-admin-page">
        <div className="users-loading-card">
          <div className="users-loading-spinner"></div>

          <h2>Loading Users</h2>

          <p>
            Fetching registered Digital Heroes
            users...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="users-admin-page">

      {/* HEADER */}
      <header className="users-admin-header">
        <div className="users-admin-brand">
          <div className="users-brand-mark">
            DH
          </div>

          <div>
            <span>Digital Heroes</span>
            <strong>Admin Console</strong>
          </div>
        </div>

        <div className="users-header-label">
          User Management
        </div>
      </header>

      <main className="users-admin-main">

        {/* PAGE INTRO */}
        <section className="users-page-hero">
          <div>
            <span className="users-eyebrow">
              PLATFORM USERS
            </span>

            <h1>User Management</h1>

            <p>
              View registered Digital Heroes
              users and manage their subscription
              status.
            </p>
          </div>

          <button
            className="users-btn users-btn-secondary"
            onClick={loadUsers}
          >
            Refresh Users
          </button>
        </section>

        {/* ERROR */}
        {error && (
          <div className="users-message users-message-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* USER SUMMARY */}
        <section className="users-summary-grid">

          <div className="users-summary-card">
            <span className="users-summary-label">
              Total Users
            </span>

            <strong>
              {users.length}
            </strong>

            <p>
              Registered accounts
            </p>
          </div>

          <div className="users-summary-card">
            <span className="users-summary-label">
              Active Subscriptions
            </span>

            <strong>
              {
                users.filter(
                  (user) =>
                    user.subscriptionStatus ===
                    "Active"
                ).length
              }
            </strong>

            <p>
              Currently active
            </p>
          </div>

          <div className="users-summary-card">
            <span className="users-summary-label">
              Admin Accounts
            </span>

            <strong>
              {
                users.filter(
                  (user) =>
                    user.role === "Admin"
                ).length
              }
            </strong>

            <p>
              Platform administrators
            </p>
          </div>

        </section>

        {/* USERS */}
        <section className="users-directory-section">

          <div className="users-section-heading">
            <div>
              <span className="users-eyebrow">
                DIRECTORY
              </span>

              <h2>
                Registered Users
              </h2>
            </div>

            <span className="users-count-badge">
              {users.length} Users
            </span>
          </div>

          {users.length === 0 ? (
            <div className="users-empty-card">
              <div className="users-empty-icon">
                DH
              </div>

              <h3>No users found</h3>

              <p>
                Registered users will appear
                here once accounts are created.
              </p>
            </div>
          ) : (
            <div className="users-grid">

              {users.map((user) => {
                const isProcessing =
                  actionLoading === user._id;

                const isActive =
                  user.subscriptionStatus ===
                  "Active";

                return (
                  <article
                    className="user-admin-card"
                    key={user._id}
                  >

                    {/* CARD HEADER */}
                    <div className="user-card-header">

                      <div className="user-avatar">
                        {user.name
                          ?.charAt(0)
                          ?.toUpperCase() || "U"}
                      </div>

                      <div className="user-card-title">
                        <h3>
                          {user.name}
                        </h3>

                        <p>
                          {user.email}
                        </p>
                      </div>

                      <span
                        className={`user-role-badge ${
                          user.role === "Admin"
                            ? "admin"
                            : "user"
                        }`}
                      >
                        {user.role}
                      </span>

                    </div>

                    {/* USER DETAILS */}
                    <div className="user-details">

                      <div className="user-detail-row">
                        <span>
                          Subscription Plan
                        </span>

                        <strong>
                          {user.subscriptionPlan ||
                            "None"}
                        </strong>
                      </div>

                      <div className="user-detail-row">
                        <span>
                          Subscription Status
                        </span>

                        <span
                          className={`user-status-badge ${
                            isActive
                              ? "active"
                              : "inactive"
                          }`}
                        >
                          {user.subscriptionStatus}
                        </span>
                      </div>

                      {user.subscriptionEndDate && (
                        <div className="user-detail-row">
                          <span>
                            Subscription End
                          </span>

                          <strong>
                            {new Date(
                              user.subscriptionEndDate
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </strong>
                        </div>
                      )}

                      <div className="user-detail-row">
                        <span>
                          Charity
                        </span>

                        <strong>
                          {user.charity?.name ||
                            "Not Selected"}
                        </strong>
                      </div>

                      <div className="user-detail-row">
                        <span>
                          Charity Contribution
                        </span>

                        <strong>
                          {user.charityContribution ||
                            10}
                          %
                        </strong>
                      </div>

                    </div>

                    {/* ACTION */}
                    <div className="user-card-action">

                      <button
                        className={`users-btn ${
                          isActive
                            ? "users-btn-danger"
                            : "users-btn-primary"
                        }`}
                        onClick={() =>
                          handleStatusChange(
                            user
                          )
                        }
                        disabled={
                          isProcessing
                        }
                      >
                        {isProcessing
                          ? "Updating..."
                          : isActive
                          ? "Cancel Subscription"
                          : "Activate Subscription"}
                      </button>

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
}

export default Users;
