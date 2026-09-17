import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
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

    if (!formData.email || !formData.password) {
      setError(
        "Please enter your email and password."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message ||
            "Invalid email or password."
        );
        return;
      }

      localStorage.setItem(
        "digitalHeroesToken",
        data.token
      );

      localStorage.setItem(
        "digitalHeroesUser",
        JSON.stringify(data.user)
      );

      // =========================================
      // ROLE BASED REDIRECTION
      // =========================================

      if (data.user.role === "Admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }

    } catch (error) {
      console.error(
        "Login Error:",
        error
      );

      setError(
        "Unable to connect to server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page login-page">
      <div className="auth-background-shape shape-one"></div>
      <div className="auth-background-shape shape-two"></div>

      <div className="auth-container">

        {/* BRAND */}
        <div className="auth-brand">
          <div className="auth-brand-mark">
            DH
          </div>

          <div>
            <h2>Digital Heroes</h2>
            <span>
              Play. Win. Give.
            </span>
          </div>
        </div>

        {/* LOGIN CARD */}
        <div className="auth-card">

          <div className="auth-card-header">
            <span className="auth-eyebrow">
              WELCOME BACK
            </span>

            <h1>
              Welcome Back
            </h1>

            <p>
              Sign in to continue your Digital Heroes
              journey.
            </p>
          </div>

          {/* ERROR */}
          {error && (
            <div className="auth-message auth-error">
              {error}
            </div>
          )}

          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >

            {/* EMAIL */}
            <div className="form-group">
              <label htmlFor="login-email">
                Email Address
              </label>

              <input
                id="login-email"
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
              <label htmlFor="login-password">
                Password
              </label>

              <input
                id="login-password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                autoComplete="current-password"
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
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* SIGNUP LINK */}
          <div className="auth-footer">
            <p>
              Don't have an account?
              {" "}
              <Link to="/signup">
                Create Account
              </Link>
            </p>
          </div>
        </div>

        {/* BOTTOM TEXT */}
        <p className="auth-bottom-text">
          Your journey can make an impact.
        </p>

      </div>
    </div>
  );
}

export default Login;
