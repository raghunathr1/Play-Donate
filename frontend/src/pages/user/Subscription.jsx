import { useEffect, useState } from "react";
import { apiRequest } from "../../api";
import "./Subscription.css";

function Subscription() {
  const [subscription, setSubscription] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("Monthly");

  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const plans = [
    {
      name: "Monthly",
      price: "₹500",
      period: "/ month",
      description: "Flexible monthly access to Digital Heroes.",
      features: [
        "Access to monthly draws",
        "Enter and manage scores",
        "Choose your charity",
        "Track winnings",
      ],
    },
    {
      name: "Yearly",
      price: "₹5,500",
      period: "/ year",
      description: "One year of access with a single subscription.",
      features: [
        "Everything in Monthly",
        "12 months of access",
        "Long-term charity contribution",
        "Full dashboard access",
      ],
      popular: true,
    },
  ];

  const loadSubscription = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest(
        "/subscriptions/me"
      );

      setSubscription(data.subscription || null);

      if (data.subscription?.plan) {
        setSelectedPlan(data.subscription.plan);
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to load subscription details"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();

    const params = new URLSearchParams(
      window.location.search
    );

    if (params.get("success") === "true") {
      setMessage(
        "Payment successful. Your subscription status will update shortly."
      );
    }

    if (params.get("cancelled") === "true") {
      setMessage(
        "Subscription checkout was cancelled."
      );
    }
  }, []);

  const handleSubscribe = async () => {
    try {
      setSubscribing(true);
      setMessage("");
      setError("");

      const data = await apiRequest(
        "/subscriptions/create-checkout",
        {
          method: "POST",
          body: JSON.stringify({
            plan: selectedPlan,
          }),
        }
      );

      if (data.checkoutUrl) {
        window.location.href =
          data.checkoutUrl;
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to start subscription"
      );
      setSubscribing(false);
    }
  };

  const handleCancel = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel your subscription?"
    );

    if (!confirmed) return;

    try {
      setCancelling(true);
      setMessage("");
      setError("");

      const data = await apiRequest(
        "/subscriptions/cancel",
        {
          method: "PUT",
        }
      );

      setMessage(
        data.message ||
          "Subscription cancelled successfully."
      );

      await loadSubscription();
    } catch (err) {
      setError(
        err.message ||
          "Unable to cancel subscription"
      );
    } finally {
      setCancelling(false);
    }
  };

  const getStatusClass = (status) => {
    if (status === "Active") return "status-active";
    if (status === "Cancelled")
      return "status-cancelled";
    if (status === "Lapsed")
      return "status-lapsed";

    return "status-default";
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  if (loading) {
    return (
      <div className="subscription-page">
        <div className="subscription-loading">
          <div className="subscription-spinner"></div>
          <p>Loading subscription...</p>
        </div>
      </div>
    );
  }

  const isActive =
    subscription?.status === "Active";

  return (
    <div className="subscription-page">

      {/* HEADER */}
      <header className="subscription-header">
        <div className="subscription-brand">
          <div className="subscription-brand-mark">
            DH
          </div>

          <span>Digital Heroes</span>
        </div>

        <a
          href="/dashboard"
          className="subscription-back"
        >
          ← Dashboard
        </a>
      </header>

      {/* HERO */}
      <section className="subscription-hero">
        <div className="subscription-hero-content">
          <span className="subscription-label">
            SUPPORT • PLAY • IMPACT
          </span>

          <h1>
            Your subscription
            <br />
            creates an impact.
          </h1>

          <p>
            Join Digital Heroes to participate
            in draws, manage your scores, support
            charities and track your journey.
          </p>
        </div>

        <div className="subscription-hero-icon">
          ✦
        </div>
      </section>

      {/* MESSAGES */}
      {error && (
        <div className="subscription-message error">
          {error}
        </div>
      )}

      {message && (
        <div className="subscription-message success">
          {message}
        </div>
      )}

      {/* CURRENT SUBSCRIPTION */}
      {subscription && (
        <section className="current-subscription">
          <div className="current-subscription-heading">
            <div>
              <span className="section-label">
                YOUR PLAN
              </span>

              <h2>
                Current subscription
              </h2>
            </div>

            <span
              className={`subscription-status ${getStatusClass(
                subscription.status
              )}`}
            >
              {subscription.status}
            </span>
          </div>

          <div className="subscription-details">
            <div className="subscription-detail">
              <span>Plan</span>
              <strong>
                {subscription.plan || "—"}
              </strong>
            </div>

            <div className="subscription-detail">
              <span>Amount</span>
              <strong>
                ₹{subscription.amount || "—"}
              </strong>
            </div>

            <div className="subscription-detail">
              <span>Started</span>
              <strong>
                {formatDate(
                  subscription.startDate
                )}
              </strong>
            </div>

            <div className="subscription-detail">
              <span>Renews / Ends</span>
              <strong>
                {formatDate(
                  subscription.endDate
                )}
              </strong>
            </div>
          </div>

          {isActive && (
            <div className="subscription-cancel-area">
              <div>
                <strong>
                  Want to stop your subscription?
                </strong>

                <p>
                  You can cancel your active
                  subscription from here.
                </p>
              </div>

              <button
                className="cancel-btn"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling
                  ? "Cancelling..."
                  : "Cancel Subscription"}
              </button>
            </div>
          )}
        </section>
      )}

      {/* PLANS */}
      {!isActive && (
        <section className="plans-section">
          <div className="plans-heading">
            <span className="section-label">
              CHOOSE YOUR PLAN
            </span>

            <h2>
              Keep your journey going
            </h2>

            <p>
              Select a subscription that works
              for you. You can change your choice
              whenever your current subscription
              is no longer active.
            </p>
          </div>

          <div className="plans-grid">
            {plans.map((plan) => {
              const selected =
                selectedPlan === plan.name;

              return (
                <button
                  key={plan.name}
                  type="button"
                  className={`plan-card ${
                    selected
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedPlan(
                      plan.name
                    )
                  }
                >
                  {plan.popular && (
                    <span className="popular-badge">
                      POPULAR
                    </span>
                  )}

                  <div className="plan-top">
                    <div>
                      <h3>{plan.name}</h3>

                      <p>
                        {plan.description}
                      </p>
                    </div>

                    <div className="plan-check">
                      {selected ? "✓" : ""}
                    </div>
                  </div>

                  <div className="plan-price">
                    <strong>
                      {plan.price}
                    </strong>

                    <span>
                      {plan.period}
                    </span>
                  </div>

                  <div className="plan-divider"></div>

                  <ul className="plan-features">
                    {plan.features.map(
                      (feature) => (
                        <li key={feature}>
                          <span>✓</span>
                          {feature}
                        </li>
                      )
                    )}
                  </ul>
                </button>
              );
            })}
          </div>

          <div className="subscribe-area">
            <div>
              <strong>
                Selected plan: {selectedPlan}
              </strong>

              <p>
                You will continue to Stripe's
                secure checkout to complete payment.
              </p>
            </div>

            <button
              className="subscribe-btn"
              onClick={handleSubscribe}
              disabled={subscribing}
            >
              {subscribing
                ? "Opening Checkout..."
                : `Subscribe to ${selectedPlan}`}
            </button>
          </div>
        </section>
      )}

      {/* BENEFITS */}
      <section className="subscription-benefits">
        <div className="benefit-item">
          <span>01</span>
          <div>
            <h3>Play with purpose</h3>
            <p>
              Your participation supports a
              broader community impact.
            </p>
          </div>
        </div>

        <div className="benefit-item">
          <span>02</span>
          <div>
            <h3>Stay connected</h3>
            <p>
              Manage scores, draws, charity
              choices and winnings in one place.
            </p>
          </div>
        </div>

        <div className="benefit-item">
          <span>03</span>
          <div>
            <h3>Track your impact</h3>
            <p>
              Keep an eye on your contribution
              and donation journey.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}

export default Subscription;
