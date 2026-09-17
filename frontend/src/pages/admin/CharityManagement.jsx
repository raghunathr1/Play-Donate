import { useEffect, useState } from "react";
import { apiRequest } from "../../api";
import "./CharityManagement.css";

function CharityManagement() {
  const [charities, setCharities] = useState([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [upcomingEvents, setUpcomingEvents] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ======================================================
  // LOAD ALL CHARITIES
  // ======================================================

  const loadCharities = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest(
        "/charities/admin/all"
      );

      setCharities(data.charities || []);
    } catch (error) {
      console.error(
        "Load Charities Error:",
        error.message
      );

      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // LOAD ON PAGE OPEN
  // ======================================================

  useEffect(() => {
    loadCharities();
  }, []);

  // ======================================================
  // ADD CHARITY
  // ======================================================

  const handleAddCharity = async (e) => {
    e.preventDefault();

    if (
      !name.trim() ||
      !description.trim()
    ) {
      setError(
        "Please enter charity name and description."
      );

      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const events = upcomingEvents
        .split("\n")
        .map((event) => event.trim())
        .filter(
          (event) => event !== ""
        );

      const data = await apiRequest(
        "/charities",
        {
          method: "POST",

          body: JSON.stringify({
            name: name.trim(),
            description:
              description.trim(),
            image: image.trim(),
            upcomingEvents: events,
            isFeatured,
          }),
        }
      );

      setSuccess(
        data.message ||
          "Charity added successfully."
      );

      setName("");
      setDescription("");
      setImage("");
      setUpcomingEvents("");
      setIsFeatured(false);

      await loadCharities();
    } catch (error) {
      console.error(
        "Add Charity Error:",
        error.message
      );

      setError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ======================================================
  // ACTIVATE / DEACTIVATE
  // ======================================================

  const handleStatusChange = async (
    charity
  ) => {
    const newStatus =
      !charity.isActive;

    const statusText = newStatus
      ? "activate"
      : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${statusText} "${charity.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const data = await apiRequest(
        `/charities/${charity._id}`,
        {
          method: "PUT",

          body: JSON.stringify({
            isActive: newStatus,
          }),
        }
      );

      setSuccess(
        data.message ||
          `Charity ${statusText}d successfully.`
      );

      await loadCharities();
    } catch (error) {
      console.error(
        "Status Change Error:",
        error.message
      );

      setError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ======================================================
  // FEATURED / NOT FEATURED
  // ======================================================

  const handleFeaturedChange = async (
    charity
  ) => {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const data = await apiRequest(
        `/charities/${charity._id}`,
        {
          method: "PUT",

          body: JSON.stringify({
            isFeatured:
              !charity.isFeatured,
          }),
        }
      );

      setSuccess(
        data.message ||
          "Featured status updated successfully."
      );

      await loadCharities();
    } catch (error) {
      console.error(
        "Featured Status Error:",
        error.message
      );

      setError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ======================================================
  // DELETE CHARITY
  // ======================================================

  const handleDelete = async (
    charity
  ) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${charity.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const data = await apiRequest(
        `/charities/${charity._id}`,
        {
          method: "DELETE",
        }
      );

      setSuccess(
        data.message ||
          "Charity deleted successfully."
      );

      await loadCharities();
    } catch (error) {
      console.error(
        "Delete Charity Error:",
        error.message
      );

      setError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <div className="charity-admin-page">
        <div className="charity-admin-loading">
          <div className="charity-admin-spinner"></div>

          <h1>Charity Management</h1>

          <p>
            Loading charities...
          </p>
        </div>
      </div>
    );
  }

  // ======================================================
  // UI
  // ======================================================

  return (
    <div className="charity-admin-page">

      {/* ==================================================
          HEADER
      ================================================== */}

      <header className="charity-admin-header">

        <div className="charity-admin-brand">

          <div className="charity-admin-brand-mark">
            DH
          </div>

          <div>
            <h1>
              Charity Management
            </h1>

            <p>
              Manage Digital Heroes
              charity partners
            </p>
          </div>

        </div>

      </header>

      <main className="charity-admin-main">

        <section className="charity-admin-hero">

          <div>
            <span>
              CHARITY CONTROL CENTER
            </span>

            <h2>
              Manage Your Impact
            </h2>

            <p>
              Add, update and manage the
              charities available to
              Digital Heroes members.
            </p>
          </div>

          <div className="charity-admin-count">
            <strong>
              {charities.length}
            </strong>

            <span>
              Total Charities
            </span>
          </div>

        </section>

        {/* ==================================================
            MESSAGES
        ================================================== */}

        {error && (
          <div className="charity-admin-message error">
            <strong>Error</strong>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="charity-admin-message success">
            <strong>Success</strong>
            <span>{success}</span>
          </div>
        )}

        {/* ==================================================
            ADD CHARITY
        ================================================== */}

        <section className="charity-admin-form-section">

          <div className="charity-admin-section-heading">
            <span>
              CREATE
            </span>

            <h2>
              Add New Charity
            </h2>

            <p>
              Add a new organisation to the
              Digital Heroes charity directory.
            </p>
          </div>

          <form
            className="charity-admin-form"
            onSubmit={handleAddCharity}
          >

            <div className="charity-form-grid">

              {/* NAME */}

              <div className="charity-form-group">
                <label>
                  Charity Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  placeholder="Enter charity name"
                />
              </div>

              {/* IMAGE */}

              <div className="charity-form-group">
                <label>
                  Image URL
                </label>

                <input
                  type="text"
                  value={image}
                  onChange={(e) =>
                    setImage(
                      e.target.value
                    )
                  }
                  placeholder="https://example.com/image.jpg"
                />
              </div>

            </div>

            {/* DESCRIPTION */}

            <div className="charity-form-group">
              <label>
                Description
              </label>

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                placeholder="Enter charity description"
                rows="4"
              />
            </div>

            {/* EVENTS */}

            <div className="charity-form-group">
              <label>
                Upcoming Events
              </label>

              <textarea
                value={upcomingEvents}
                onChange={(e) =>
                  setUpcomingEvents(
                    e.target.value
                  )
                }
                placeholder={
                  "Enter one event per line\nExample:\nCharity Run 2026\nCommunity Fundraiser"
                }
                rows="4"
              />

              <small>
                Enter each event on a new line.
              </small>
            </div>

            {/* FEATURED */}

            <label className="charity-featured-toggle">

              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) =>
                  setIsFeatured(
                    e.target.checked
                  )
                }
              />

              <span className="charity-checkbox">
                ✓
              </span>

              <span>
                <strong>
                  Featured Charity
                </strong>

                <small>
                  Highlight this charity
                  on the platform.
                </small>
              </span>

            </label>

            {/* SUBMIT */}

            <button
              className="charity-admin-submit"
              type="submit"
              disabled={actionLoading}
            >
              {actionLoading
                ? "Processing..."
                : "Add Charity"}
            </button>

          </form>

        </section>

        {/* ==================================================
            DIRECTORY
        ================================================== */}

        <section className="charity-directory-section">

          <div className="charity-admin-section-heading">
            <span>
              DIRECTORY
            </span>

            <h2>
              Charity Directory
            </h2>

            <p>
              Manage all charities currently
              available in the system.
            </p>
          </div>

          {charities.length === 0 ? (
            <div className="charity-empty-state">
              <div>♡</div>

              <h3>
                No charities available
              </h3>

              <p>
                Add your first charity using
                the form above.
              </p>
            </div>
          ) : (
            <div className="charity-admin-grid">

              {charities.map(
                (charity) => (
                  <article
                    className="charity-admin-card"
                    key={charity._id}
                  >

                    {/* IMAGE */}

                    <div className="charity-admin-image">

                      {charity.image ? (
                        <img
                          src={charity.image}
                          alt={charity.name}
                        />
                      ) : (
                        <div className="charity-image-placeholder">
                          ♡
                        </div>
                      )}

                      <div
                        className={
                          charity.isActive
                            ? "charity-status active"
                            : "charity-status inactive"
                        }
                      >
                        {charity.isActive
                          ? "Active"
                          : "Inactive"}
                      </div>

                      {charity.isFeatured && (
                        <div className="charity-featured-badge">
                          ★ Featured
                        </div>
                      )}

                    </div>

                    {/* CONTENT */}

                    <div className="charity-admin-card-content">

                      <h3>
                        {charity.name}
                      </h3>

                      <p className="charity-admin-description">
                        {charity.description}
                      </p>

                      {/* EVENTS */}

                      {charity.upcomingEvents &&
                        charity.upcomingEvents
                          .length > 0 && (
                          <div className="charity-events">

                            <strong>
                              Upcoming Events
                            </strong>

                            <ul>
                              {charity.upcomingEvents.map(
                                (
                                  event,
                                  index
                                ) => (
                                  <li
                                    key={
                                      index
                                    }
                                  >
                                    {event}
                                  </li>
                                )
                              )}
                            </ul>

                          </div>
                        )}

                      {/* IMAGE LINK */}

                      {charity.image && (
                        <a
                          className="charity-image-link"
                          href={
                            charity.image
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          View Image ↗
                        </a>
                      )}

                      {/* ACTIONS */}

                      <div className="charity-admin-actions">

                        <button
                          className={
                            charity.isActive
                              ? "admin-action-btn deactivate"
                              : "admin-action-btn activate"
                          }
                          onClick={() =>
                            handleStatusChange(
                              charity
                            )
                          }
                          disabled={
                            actionLoading
                          }
                        >
                          {charity.isActive
                            ? "Deactivate"
                            : "Activate"}
                        </button>

                        <button
                          className="admin-action-btn featured"
                          onClick={() =>
                            handleFeaturedChange(
                              charity
                            )
                          }
                          disabled={
                            actionLoading
                          }
                        >
                          {charity.isFeatured
                            ? "Remove Featured"
                            : "Make Featured"}
                        </button>

                        <button
                          className="admin-action-btn delete"
                          onClick={() =>
                            handleDelete(
                              charity
                            )
                          }
                          disabled={
                            actionLoading
                          }
                        >
                          Delete
                        </button>

                      </div>

                    </div>

                  </article>
                )
              )}

            </div>
          )}

        </section>

      </main>
    </div>
  );
}

export default CharityManagement;
