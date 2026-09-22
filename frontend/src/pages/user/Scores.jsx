import { useEffect, useState } from "react";
import { apiRequest } from "../../api";
import "./Scores.css";

function Scores() {
  const [scores, setScores] = useState([]);

  const [score, setScore] = useState("");
  const [date, setDate] = useState("");

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // =========================================================
  // GET SCORES
  // =========================================================

  const loadScores = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest("/scores");

      setScores(data.scores || []);
    } catch (error) {
      console.error("Load Scores Error:", error);

      setError(
        error.message || "Unable to load your scores."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScores();
  }, []);

  // =========================================================
  // ADD / UPDATE SCORE
  // =========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!score || !date) {
      setError("Please enter both score and date.");
      return;
    }

    const scoreNumber = Number(score);

    if (
      !Number.isInteger(scoreNumber) ||
      scoreNumber < 1 ||
      scoreNumber > 45
    ) {
      setError(
        "Stableford score must be a whole number between 1 and 45."
      );
      return;
    }

    try {
      setSaving(true);

      // =====================================================
      // UPDATE
      // =====================================================

      if (editingId) {
        const data = await apiRequest(
          `/scores/${editingId}`,
          {
            method: "PUT",
            body: JSON.stringify({
              score: scoreNumber,
              scoreDate: date,
            }),
          }
        );

        setMessage(
          data.message || "Score updated successfully."
        );

        setEditingId(null);
      }

      // =====================================================
      // ADD
      // =====================================================

      else {
        const data = await apiRequest(
          "/scores",
          {
            method: "POST",
            body: JSON.stringify({
              score: scoreNumber,
              scoreDate: date,
            }),
          }
        );

        setMessage(
          data.message || "Score added successfully."
        );
      }

      setScore("");
      setDate("");

      await loadScores();
    } catch (error) {
      console.error("Save Score Error:", error);

      setError(
        error.message || "Unable to save score."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // EDIT
  // =========================================================

  const handleEdit = (item) => {
    setError("");
    setMessage("");

    // Supabase uses "id", NOT "_id"
    setEditingId(item.id);

    setScore(item.score);

    // Supabase uses "score_date", NOT "date"
    const formattedDate = item.score_date
      ? new Date(item.score_date)
          .toISOString()
          .split("T")[0]
      : "";

    setDate(formattedDate);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =========================================================
  // CANCEL EDIT
  // =========================================================

  const handleCancelEdit = () => {
    setEditingId(null);
    setScore("");
    setDate("");
    setError("");
    setMessage("");
  };

  // =========================================================
  // DELETE
  // =========================================================

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this score?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");
      setMessage("");

      const data = await apiRequest(
        `/scores/${id}`,
        {
          method: "DELETE",
        }
      );

      setMessage(
        data.message || "Score deleted successfully."
      );

      await loadScores();
    } catch (error) {
      console.error("Delete Score Error:", error);

      setError(
        error.message || "Unable to delete score."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (value) => {
    if (!value) return "—";

    return new Date(value).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="scores-page">
        <div className="scores-loading">
          <div className="scores-spinner"></div>

          <p>
            Loading your scores...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="scores-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="scores-header">

        <div className="scores-brand">

          <div className="scores-brand-mark">
            DH
          </div>

          <span>
            Digital Heroes
          </span>

        </div>

        <a
          href="/dashboard"
          className="scores-back"
        >
          ← Dashboard
        </a>

      </header>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="scores-hero">

        <div>

          <span className="scores-label">
            YOUR PERFORMANCE
          </span>

          <h1>
            Manage your
            <br />
            Stableford scores.
          </h1>

          <p>
            Keep your latest five scores
            up to date. These scores are
            used for your monthly draw
            participation.
          </p>

        </div>

        <div className="scores-hero-icon">
          45
        </div>

      </section>

      <main className="scores-container">

        {/* ===================================================
            MESSAGES
        =================================================== */}

        {error && (
          <div className="scores-message error">
            {error}
          </div>
        )}

        {message && (
          <div className="scores-message success">
            {message}
          </div>
        )}

        {/* ===================================================
            FORM
        =================================================== */}

        <section className="score-form-card">

          <div className="score-form-heading">

            <div>

              <span className="section-label">
                SCORE ENTRY
              </span>

              <h2>
                {editingId
                  ? "Edit Score"
                  : "Add New Score"}
              </h2>

              <p>
                Enter a Stableford score
                between 1 and 45.
              </p>

            </div>

            <div className="score-form-icon">
              {editingId ? "✎" : "+"}
            </div>

          </div>

          <form
            className="score-form"
            onSubmit={handleSubmit}
          >

            {/* SCORE */}

            <div className="score-field">

              <label htmlFor="score">
                Stableford Score
              </label>

              <input
                id="score"
                type="number"
                min="1"
                max="45"
                step="1"
                value={score}
                onChange={(e) =>
                  setScore(e.target.value)
                }
                placeholder="1 - 45"
              />

              <span className="field-hint">
                Enter your score
              </span>

            </div>

            {/* DATE */}

            <div className="score-field">

              <label htmlFor="date">
                Score Date
              </label>

              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) =>
                  setDate(e.target.value)
                }
              />

              <span className="field-hint">
                One score per date
              </span>

            </div>

            {/* ACTIONS */}

            <div className="score-form-actions">

              <button
                type="submit"
                className="score-primary-btn"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Score"
                  : "Add Score"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="score-secondary-btn"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
              )}

            </div>

          </form>

        </section>

        {/* ===================================================
            SCORE LIST
        =================================================== */}

        <section className="score-list-section">

          <div className="score-list-heading">

            <div>

              <span className="section-label">
                SCORE HISTORY
              </span>

              <h2>
                Latest Scores
              </h2>

            </div>

            <div className="score-count">

              <strong>
                {scores.length}
              </strong>

              <span>
                / 5
              </span>

            </div>

          </div>

          {/* EMPTY */}

          {scores.length === 0 ? (

            <div className="empty-scores">

              <div className="empty-score-icon">
                +
              </div>

              <h3>
                No scores yet
              </h3>

              <p>
                Add your first Stableford
                score using the form above.
              </p>

            </div>

          ) : (

            <div className="scores-list">

              {scores.map(
                (item, index) => (

                  <div
                    key={item.id}
                    className="score-item"
                  >

                    {/* SCORE NUMBER */}

                    <div className="score-number">
                      {item.score}
                    </div>

                    {/* INFO */}

                    <div className="score-info">

                      <span>
                        Score #{index + 1}
                      </span>

                      <strong>
                        Stableford Score
                      </strong>

                      <small>
                        {formatDate(
                          item.score_date
                        )}
                      </small>

                    </div>

                    {/* ACTIONS */}

                    <div className="score-actions">

                      <button
                        type="button"
                        className="edit-score-btn"
                        onClick={() =>
                          handleEdit(item)
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="delete-score-btn"
                        onClick={() =>
                          handleDelete(item.id)
                        }
                        disabled={
                          deletingId === item.id
                        }
                      >
                        {deletingId === item.id
                          ? "..."
                          : "Delete"}
                      </button>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>

        {/* ===================================================
            INFO
        =================================================== */}

        <section className="scores-info">

          <div className="info-icon">
            i
          </div>

          <div>

            <h3>
              How your scores are used
            </h3>

            <p>
              Digital Heroes keeps your
              latest five Stableford scores.
              When a new score is added
              beyond the fifth score, the
              oldest score is automatically
              removed.
            </p>

          </div>

        </section>

      </main>

    </div>
  );
}

export default Scores;