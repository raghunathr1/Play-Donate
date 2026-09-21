import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../../api";
import "./Signup.css";

function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Please fill in all fields.");
      return;
    }

    if (formData.password.length < 6) {
      setError(
        "Password must be at least 6 characters long."
      );
      return;
    }

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const data = await apiRequest("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      navigate("/login");
    } catch (error) {
      console.error("Signup Error:", error);

      setError(
        error.message ||
          "Unable to connect to server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page signup-page">

      {/* BACKGROUND DECORATION */}
      <div className="auth-background-shape shape-one"></div>

      <div className="auth-background-shape shape-two"></div>

      <div className="auth-container">

        {/* BRAND */}
        <Link
          to="/"
          className="auth-brand"
        >

          <div className="auth-brand-mark">
            DH
          </div>

          <div className="auth-brand-copy">

            <h2>
              Digital Heroes
            </h2>

            <span>
              Play. Win. Give.
            </span>

          </div>

        </Link>

        {/* SIGNUP CARD */}
        <div className="auth-card signup-card">

          <div className="auth-card-header">

            <span className="auth-eyebrow">
              JOIN DIGITAL HEROES
            </span>

            <h1>
              Create your account.
            </h1>

            <p>
              Start your journey with golf,
              rewards and meaningful impact.
            </p>

          </div>

          {/* ERROR */}
          {error && (
            <div className="auth-message auth-error">

              <span>!</span>

              {error}

            </div>
          )}

          {/* FORM */}
          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >

            {/* NAME */}
            <div className="form-group">

              <label htmlFor="signup-name">
                Full Name
              </label>

              <input
                id="signup-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                autoComplete="name"
              />

            </div>

            {/* EMAIL */}
            <div className="form-group">

              <label htmlFor="signup-email">
                Email Address
              </label>

              <input
                id="signup-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                autoComplete="email"
              />

            </div>

            {/* PASSWORD */}
            <div className="form-group">

              <label htmlFor="signup-password">
                Password
              </label>

              <input
                id="signup-password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                autoComplete="new-password"
              />

              <small className="input-hint">
                Minimum 6 characters
              </small>

            </div>

            {/* CONFIRM PASSWORD */}
            <div className="form-group">

              <label htmlFor="signup-confirm-password">
                Confirm Password
              </label>

              <input
                id="signup-confirm-password"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                autoComplete="new-password"
              />

            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >

              {loading ? (
                <>
                  <span className="button-spinner"></span>
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account

                  <span className="submit-arrow">
                    →
                  </span>
                </>
              )}

            </button>

          </form>

          {/* LOGIN LINK */}
          <div className="auth-footer">

            <p>
              Already have an account?
              {" "}

              <Link to="/login">
                Sign in
              </Link>
            </p>

          </div>

        </div>

        {/* BOTTOM TEXT */}
        <p className="auth-bottom-text">
          Every journey starts with one step.
        </p>

      </div>

    </div>
  );
}

export default Signup;