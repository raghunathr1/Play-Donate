const dns = require("dns");

// =====================================================
// DNS
// =====================================================

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// =====================================================
// LOAD ENVIRONMENT VARIABLES
// =====================================================

dotenv.config({ override: true });

const app = express();

// =====================================================
// CORS
// =====================================================

app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      "http://localhost:5173",
      "https://play-donate-six.vercel.app",
    ],
    credentials: true,
  })
);

// =====================================================
// ROUTES
// =====================================================

const webhookRoutes = require("./routes/webhookRoutes");

const authRoutes = require("./routes/authRoutes");
const scoreRoutes = require("./routes/scoreRoutes");
const charityRoutes = require("./routes/charityRoutes");
const donationRoutes = require("./routes/donationRoutes");
const drawRoutes = require("./routes/drawRoutes");

const adminUserRoutes = require("./routes/adminUserRoutes");
const adminWinnerRoutes = require("./routes/adminWinnerRoutes");
const adminReportRoutes = require("./routes/adminReportRoutes");

const subscriptionRoutes = require("./routes/subscriptionRoutes");
const winnerRoutes = require("./routes/winnerRoutes");

// =====================================================
// STRIPE WEBHOOK
// IMPORTANT:
//
// This MUST come BEFORE express.json()
//
// Stripe needs the RAW request body to verify
// the webhook signature.
// =====================================================

app.use(
  "/api/stripe/webhook",
  webhookRoutes
);

// =====================================================
// JSON BODY PARSER
// =====================================================

app.use(express.json());

// =====================================================
// API ROUTES
// =====================================================

// Authentication
app.use(
  "/api/auth",
  authRoutes
);

// Scores
app.use(
  "/api/scores",
  scoreRoutes
);

// Charities
app.use(
  "/api/charities",
  charityRoutes
);

// Donations
app.use(
  "/api/donations",
  donationRoutes
);

// Draws
app.use(
  "/api/draws",
  drawRoutes
);

// Admin Users
app.use(
  "/api/admin/users",
  adminUserRoutes
);

// Admin Winners
app.use(
  "/api/admin/winners",
  adminWinnerRoutes
);

// Admin Reports
app.use(
  "/api/admin/reports",
  adminReportRoutes
);

// Subscriptions
app.use(
  "/api/subscriptions",
  subscriptionRoutes
);

// Winners
app.use(
  "/api/winners",
  winnerRoutes
);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {
  res.json({
    message: "Play-Donate API is running",
    database: "Supabase",
    status: "OK",
  });
});

// =====================================================
// 404 HANDLER
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    message: "API route not found",
    path: req.originalUrl,
  });
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use((error, req, res, next) => {
  console.error(
    "Global Error:",
    error
  );

  res.status(500).json({
    message: "Internal server error",
  });
});

// =====================================================
// START SERVER
// =====================================================

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server is Running on Port ${PORT}`
  );

  console.log(
    "Database: Supabase"
  );

  console.log(
    "Stripe Webhook: /api/stripe/webhook"
  );
});