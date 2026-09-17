import { Link } from "react-router-dom";
import "./Home.css";

function Home() {
  return (
    <div className="home-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="home-header">

        <Link
          to="/"
          className="home-brand"
        >
          <div className="home-brand-mark">
            DH
          </div>

          <div className="home-brand-text">
            <span>Digital</span>
            <strong>Heroes</strong>
          </div>
        </Link>

        <nav className="home-nav">
          <Link to="/login">
            Login
          </Link>

          <Link
            to="/signup"
            className="home-nav-signup"
          >
            Get Started
          </Link>
        </nav>

      </header>


      {/* =====================================================
          HERO
      ===================================================== */}

      <main>

        <section className="home-hero">

          <div className="home-hero-content">

            <span className="home-eyebrow">
              GOLF • REWARDS • IMPACT
            </span>

            <h1>
              Play your game.
              <br />
              <span>Make an impact.</span>
            </h1>

            <p>
              Track your golf performance, take part
              in monthly prize draws, and support a
              charity you care about.
            </p>

            <div className="home-hero-actions">

              <Link
                to="/signup"
                className="home-primary-btn"
              >
                Start Your Journey
                <span>→</span>
              </Link>

              <Link
                to="/login"
                className="home-secondary-btn"
              >
                Already a member?
              </Link>

            </div>

            <div className="home-trust-row">

              <div>
                <strong>01</strong>
                <span>
                  Track Scores
                </span>
              </div>

              <div>
                <strong>02</strong>
                <span>
                  Monthly Draws
                </span>
              </div>

              <div>
                <strong>03</strong>
                <span>
                  Support Charity
                </span>
              </div>

            </div>

          </div>


          <div className="home-hero-visual">

            <div className="hero-impact-card">

              <div className="impact-card-top">
                <span>
                  YOUR IMPACT
                </span>

                <span className="impact-dot"></span>
              </div>

              <div className="impact-main-number">
                10%
              </div>

              <p>
                Minimum contribution
                towards your chosen charity.
              </p>

              <div className="impact-progress">
                <span></span>
              </div>

              <div className="impact-footer">
                <span>
                  Play
                </span>

                <strong>
                  → Impact
                </strong>
              </div>

            </div>


            <div className="hero-floating-card hero-score-card">

              <span>
                LATEST SCORE
              </span>

              <strong>
                36
              </strong>

              <small>
                Stableford points
              </small>

            </div>


            <div className="hero-floating-card hero-draw-card">

              <span>
                MONTHLY DRAW
              </span>

              <strong>
                01 — 12 — 24
              </strong>

              <small>
                Your chance to win
              </small>

            </div>

          </div>

        </section>


        {/* =====================================================
            HOW IT WORKS
        ===================================================== */}

        <section className="home-section how-section">

          <div className="home-section-heading">

            <span className="home-eyebrow">
              SIMPLE BY DESIGN
            </span>

            <h2>
              How it works
            </h2>

            <p>
              A simple journey that connects
              your golf performance with rewards
              and meaningful impact.
            </p>

          </div>


          <div className="how-grid">

            <article className="how-card">

              <span className="how-number">
                01
              </span>

              <div className="how-icon">
                ✦
              </div>

              <h3>
                Subscribe
              </h3>

              <p>
                Choose a monthly or yearly
                subscription that works for you.
              </p>

            </article>


            <article className="how-card">

              <span className="how-number">
                02
              </span>

              <div className="how-icon">
                +
              </div>

              <h3>
                Add Your Scores
              </h3>

              <p>
                Enter your latest Stableford
                golf scores and keep your
                performance history updated.
              </p>

            </article>


            <article className="how-card">

              <span className="how-number">
                03
              </span>

              <div className="how-icon">
                #
              </div>

              <h3>
                Enter the Draw
              </h3>

              <p>
                Your participation gives you
                access to the monthly prize draw.
              </p>

            </article>


            <article className="how-card">

              <span className="how-number">
                04
              </span>

              <div className="how-icon">
                ♥
              </div>

              <h3>
                Support Charity
              </h3>

              <p>
                Choose a charity and decide
                how much of your contribution
                you want to give.
              </p>

            </article>

          </div>

        </section>


        {/* =====================================================
            WHY DIGITAL HEROES
        ===================================================== */}

        <section className="home-impact-section">

          <div className="home-impact-content">

            <span className="home-eyebrow">
              MORE THAN A GAME
            </span>

            <h2>
              Your game can
              <span> create change.</span>
            </h2>

            <p>
              Digital Heroes brings together
              golf, rewards and charitable giving
              in one experience. Every part of
              your journey is designed to turn
              participation into meaningful impact.
            </p>

            <Link
              to="/signup"
              className="home-primary-btn"
            >
              Become a Digital Hero
              <span>→</span>
            </Link>

          </div>


          <div className="home-impact-visual">

            <div className="impact-quote-card">

              <div className="quote-mark">
                “
              </div>

              <p>
                Play for yourself.
                Give something back.
              </p>

              <span>
                DIGITAL HEROES
              </span>

            </div>

          </div>

        </section>


        {/* =====================================================
            FINAL CTA
        ===================================================== */}

        <section className="home-final-cta">

          <span className="home-eyebrow">
            READY TO BEGIN?
          </span>

          <h2>
            Your next round could
            make a difference.
          </h2>

          <p>
            Join Digital Heroes and connect
            your golf journey with rewards
            and charity.
          </p>

          <Link
            to="/signup"
            className="home-primary-btn home-final-btn"
          >
            Get Started
            <span>→</span>
          </Link>

        </section>

      </main>


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="home-footer">

        <div>
          <strong>
            Digital Heroes
          </strong>

          <span>
            Golf. Rewards. Charity.
          </span>
        </div>

        <p>
          © {new Date().getFullYear()} Digital Heroes
        </p>

      </footer>

    </div>
  );
}

export default Home;

