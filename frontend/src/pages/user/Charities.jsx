import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../api";
import "./Charities.css";

function Charities() {
  const [charities, setCharities] = useState([]);
  const [selectedCharity, setSelectedCharity] = useState("");
  const [contribution, setContribution] = useState(10);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [donationAmount, setDonationAmount] = useState(500);
  const [donatingCharity, setDonatingCharity] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ==================================================
  // LOAD CHARITIES + CURRENT USER
  // ==================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");
        setMessage("");

        const charityData =
          await apiRequest("/charities");

        setCharities(
          charityData.charities || []
        );

        const userData =
          await apiRequest("/auth/me");

        const user = userData.user;

        if (user?.charity) {
          const charityId =
            typeof user.charity === "object"
              ? user.charity._id
              : user.charity;

          setSelectedCharity(charityId);
        }

        if (user?.charityContribution) {
          setContribution(
            user.charityContribution
          );
        }
      } catch (error) {
        console.error(
          "Load Charity Error:",
          error.message
        );

        setError(
          error.message ||
            "Unable to load charities."
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ==================================================
  // DONATION RESULT MESSAGE
  // ==================================================

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const donationStatus =
      params.get("donation");

    if (donationStatus === "success") {
      setMessage(
        "Donation payment completed successfully. Thank you for supporting the charity!"
      );
    }

    if (donationStatus === "cancelled") {
      setMessage(
        "Donation payment was cancelled."
      );
    }
  }, []);

  // ==================================================
  // FILTER CHARITIES
  // ==================================================

  const filteredCharities = useMemo(() => {
    return charities.filter((charity) => {
      const searchText = search
        .toLowerCase()
        .trim();

      const matchesSearch =
        charity.name
          .toLowerCase()
          .includes(searchText) ||
        charity.description
          .toLowerCase()
          .includes(searchText);

      const matchesFilter =
        filter === "All" ||
        (filter === "Featured" &&
          charity.isFeatured);

      return (
        matchesSearch &&
        matchesFilter
      );
    });
  }, [charities, search, filter]);

  // ==================================================
  // SELECT CHARITY
  // ==================================================

  const handleSelectCharity = (charityId) => {
    setSelectedCharity(charityId);
    setMessage("");
    setError("");
  };

  // ==================================================
  // CONTRIBUTION CHANGE
  // ==================================================

  const handleContributionChange = (
    event
  ) => {
    const value = Number(
      event.target.value
    );

    setContribution(value);
    setMessage("");
    setError("");
  };

  // ==================================================
  // SAVE CHARITY
  // ==================================================

  const handleSave = async () => {
    if (!selectedCharity) {
      setError(
        "Please select a charity first."
      );
      return;
    }

    if (
      contribution < 10 ||
      contribution > 100
    ) {
      setError(
        "Charity contribution must be between 10% and 100%."
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const data = await apiRequest(
        "/charities/select",
        {
          method: "PUT",
          body: JSON.stringify({
            charityId: selectedCharity,
            charityContribution:
              contribution,
          }),
        }
      );

      const oldUser =
        JSON.parse(
          localStorage.getItem(
            "digitalHeroesUser"
          )
        ) || {};

      const updatedUser = {
        ...oldUser,
        charity:
          data.user?.charity ||
          selectedCharity,
        charityContribution:
          data.user?.charityContribution ??
          contribution,
      };

      localStorage.setItem(
        "digitalHeroesUser",
        JSON.stringify(updatedUser)
      );

      setMessage(
        "Charity selection saved successfully!"
      );
    } catch (error) {
      console.error(
        "Save Charity Error:",
        error.message
      );

      setError(
        error.message ||
          "Unable to save charity selection."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==================================================
  // DONATE TO CHARITY
  // ==================================================

  const handleDonate = async (charityId) => {
    const amount = Number(
      donationAmount
    );

    if (!amount || amount <= 0) {
      setError(
        "Please enter a valid donation amount."
      );
      return;
    }

    try {
      setDonatingCharity(charityId);
      setMessage("");
      setError("");

      const data = await apiRequest(
        "/donations/create-checkout",
        {
          method: "POST",
          body: JSON.stringify({
            charityId,
            amount,
          }),
        }
      );

      window.location.href =
        data.checkoutUrl;
    } catch (error) {
      console.error(
        "Donation Error:",
        error.message
      );

      setError(
        error.message ||
          "Unable to create donation checkout."
      );

      setDonatingCharity("");
    }
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <div className="charity-loading">
        <div className="charity-spinner"></div>

        <h2>Loading charities...</h2>

        <p>
          Finding causes you can support.
        </p>
      </div>
    );
  }

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="charity-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="charity-header">

        <div className="charity-brand">
          <div className="charity-brand-mark">
            DH
          </div>

          <div>
            <h1>Digital Heroes</h1>
            <span>
              Play. Win. Give back.
            </span>
          </div>
        </div>

      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="charity-container">

        {/* =================================================
            HERO
        ================================================= */}

        <section className="charity-hero">

          <div>
            <span className="charity-hero-label">
              MAKE AN IMPACT
            </span>

            <h2>
              Choose a cause that matters to you.
            </h2>

            <p>
              Your participation can help support
              organisations creating meaningful
              change in communities.
            </p>
          </div>

          <div className="impact-symbol">
            ❤️
          </div>

        </section>

        {/* =================================================
            SEARCH + FILTER
        ================================================= */}

        <section className="charity-tools">

          <div className="search-wrapper">
            <span className="search-icon">
              🔍
            </span>

            <input
              type="text"
              placeholder="Search charities..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="filter-buttons">

            <button
              className={
                filter === "All"
                  ? "filter-btn active"
                  : "filter-btn"
              }
              onClick={() =>
                setFilter("All")
              }
            >
              All Charities
            </button>

            <button
              className={
                filter === "Featured"
                  ? "filter-btn active"
                  : "filter-btn"
              }
              onClick={() =>
                setFilter("Featured")
              }
            >
              ⭐ Featured
            </button>

          </div>

        </section>

        {/* =================================================
            MESSAGES
        ================================================= */}

        {error && (
          <div className="charity-message error">
            <span>!</span>
            {error}
          </div>
        )}

        {message && (
          <div className="charity-message success">
            <span>✓</span>
            {message}
          </div>
        )}

        {/* =================================================
            CHARITY DIRECTORY
        ================================================= */}

        <section className="charity-section">

          <div className="section-heading">
            <div>
              <span>
                CHARITY DIRECTORY
              </span>

              <h3>
                Organisations making a difference
              </h3>
            </div>

            <p>
              {filteredCharities.length}{" "}
              {filteredCharities.length === 1
                ? "charity"
                : "charities"}
            </p>
          </div>

          {filteredCharities.length === 0 ? (
            <div className="no-charities">
              <div>🔎</div>

              <h3>
                No charities found
              </h3>

              <p>
                Try changing your search or
                selected filter.
              </p>
            </div>
          ) : (
            <div className="charity-grid">

              {filteredCharities.map(
                (charity) => {

                  const isSelected =
                    selectedCharity ===
                    charity._id;

                  return (
                    <article
                      className={
                        isSelected
                          ? "charity-card selected"
                          : "charity-card"
                      }
                      key={charity._id}
                    >

                      {/* IMAGE */}

                      <div className="charity-image-wrapper">

                        {charity.image ? (
                          <img
                            src={charity.image}
                            alt={charity.name}
                            className="charity-card-image"
                          />
                        ) : (
                          <div className="charity-image-placeholder">
                            ❤️
                          </div>
                        )}

                        {charity.isFeatured && (
                          <span className="featured-badge">
                            ⭐ Featured
                          </span>
                        )}

                        {isSelected && (
                          <span className="selected-badge">
                            ✓ Selected
                          </span>
                        )}

                      </div>

                      {/* CONTENT */}

                      <div className="charity-card-content">

                        <h3>
                          {charity.name}
                        </h3>

                        <p className="charity-card-description">
                          {charity.description}
                        </p>

                        {/* EVENTS */}

                        {charity
                          .upcomingEvents
                          ?.length > 0 && (
                          <div className="events-box">

                            <span className="events-title">
                              Upcoming Events
                            </span>

                            <ul>
                              {charity.upcomingEvents.map(
                                (
                                  event,
                                  index
                                ) => (
                                  <li
                                    key={index}
                                  >
                                    {event}
                                  </li>
                                )
                              )}
                            </ul>

                          </div>
                        )}

                        {/* SELECT */}

                        <button
                          className={
                            isSelected
                              ? "select-charity-btn selected"
                              : "select-charity-btn"
                          }
                          onClick={() =>
                            handleSelectCharity(
                              charity._id
                            )
                          }
                          disabled={saving}
                        >
                          {isSelected
                            ? "✓ Charity Selected"
                            : "Select This Charity"}
                        </button>

                        {/* DONATION */}

                        <div className="donation-box">

                          <div className="donation-heading">
                            <span>
                              ONE-TIME SUPPORT
                            </span>

                            <h4>
                              Make a donation
                            </h4>
                          </div>

                          <div className="donation-controls">

                            <div className="amount-input">
                              <span>₹</span>

                              <input
                                type="number"
                                min="1"
                                value={
                                  donationAmount
                                }
                                onChange={(
                                  event
                                ) =>
                                  setDonationAmount(
                                    event.target.value
                                  )
                                }
                                placeholder="Amount"
                              />
                            </div>

                            <button
                              className="donate-btn"
                              onClick={() =>
                                handleDonate(
                                  charity._id
                                )
                              }
                              disabled={
                                donatingCharity ===
                                charity._id
                              }
                            >
                              {donatingCharity ===
                              charity._id
                                ? "Redirecting..."
                                : "Donate Now"}
                            </button>

                          </div>

                          <p>
                            Secure payment through
                            Stripe.
                          </p>

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          )}

        </section>

        {/* =================================================
            CONTRIBUTION
        ================================================= */}

        <section className="contribution-section">

          <div className="contribution-header">

            <div>
              <span>
                YOUR CHARITY CONTRIBUTION
              </span>

              <h3>
                Decide how much you want to give back.
              </h3>

              <p>
                Choose a contribution between
                10% and 100% for your selected
                charity.
              </p>
            </div>

            <div className="contribution-value">
              {contribution}%
            </div>

          </div>

          <div className="slider-area">

            <input
              type="range"
              min="10"
              max="100"
              step="1"
              value={contribution}
              onChange={
                handleContributionChange
              }
            />

            <div className="slider-labels">
              <span>10% minimum</span>
              <span>100% maximum</span>
            </div>

          </div>

          <div className="contribution-footer">

            <div>
              <strong>
                {contribution}% contribution
              </strong>

              <span>
                You can change this anytime.
              </span>
            </div>

            <button
              className="save-charity-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save Charity Selection"}
            </button>

          </div>

        </section>

      </main>

    </div>
  );
}

export default Charities;
