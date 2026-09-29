const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// =====================================================
// LOAD ENVIRONMENT VARIABLES
// =====================================================

dotenv.config({
  override: true,
});

// =====================================================
// APP
// =====================================================

const app = express();

// =====================================================
// ROUTES
// =====================================================

// AUTH + USER
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

// USER FEATURES
const drawRoutes = require("./routes/drawRoutes");
const charityRoutes = require("./routes/charityRoutes");
const winnerRoutes = require("./routes/winnerRoutes");
const scoreRoutes = require("./routes/scoreRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const donationRoutes = require("./routes/donationRoutes");

// STRIPE WEBHOOK
const stripeWebhookRoutes = require("./routes/stripeWebhookRoutes");

// ADMIN ROUTES
const adminRoutes = require("./routes/adminRoutes");
const adminReportRoutes = require("./routes/adminReportRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");

// =====================================================
// MIDDLEWARE
// =====================================================

// -----------------------------------------------------
// CORS
// -----------------------------------------------------

app.use(
  cors({
    origin:
      process.env.FRONTEND_URL ||
      "http://localhost:5173",

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

// =====================================================
// STRIPE WEBHOOK
// IMPORTANT:
// MUST COME BEFORE express.json()
// =====================================================

app.use(
  "/api/stripe/webhook",
  stripeWebhookRoutes
);

// -----------------------------------------------------
// JSON BODY
// -----------------------------------------------------

app.use(express.json());

// -----------------------------------------------------
// URL ENCODED BODY
// -----------------------------------------------------

app.use(
  express.urlencoded({
    extended: true,
  })
);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Digital Heroes API is running",
  });
});

// =====================================================
// API ROUTES
// =====================================================

// -----------------------------------------------------
// AUTH
// -----------------------------------------------------

app.use(
  "/api/auth",
  authRoutes
);

// -----------------------------------------------------
// USERS
// -----------------------------------------------------

app.use(
  "/api/users",
  userRoutes
);

// -----------------------------------------------------
// DRAWS
// -----------------------------------------------------

app.use(
  "/api/draws",
  drawRoutes
);

// -----------------------------------------------------
// CHARITIES
// -----------------------------------------------------

app.use(
  "/api/charities",
  charityRoutes
);

// -----------------------------------------------------
// WINNERS
// -----------------------------------------------------

app.use(
  "/api/winners",
  winnerRoutes
);

// -----------------------------------------------------
// SCORES
// -----------------------------------------------------

app.use(
  "/api/scores",
  scoreRoutes
);

// -----------------------------------------------------
// SUBSCRIPTIONS
// -----------------------------------------------------

app.use(
  "/api/subscriptions",
  subscriptionRoutes
);

// -----------------------------------------------------
// DONATIONS
// -----------------------------------------------------

app.use(
  "/api/donations",
  donationRoutes
);

// =====================================================
// ADMIN ROUTES
// =====================================================

// -----------------------------------------------------
// GENERAL ADMIN
// -----------------------------------------------------

app.use(
  "/api/admin",
  adminRoutes
);

// -----------------------------------------------------
// ADMIN REPORTS
// adminReportRoutes.js has router.get("/")
// -----------------------------------------------------

app.use(
  "/api/admin/reports",
  adminReportRoutes
);

// -----------------------------------------------------
// ADMIN USERS
// -----------------------------------------------------

app.use(
  "/api/admin/users",
  adminUserRoutes
);

// =====================================================
// 404 HANDLER
// =====================================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
  (error, req, res, next) => {
    console.error(
      "Global server error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
);

// =====================================================
// SERVER
// =====================================================

const PORT =
  process.env.PORT || 5000;

app.listen(
  PORT,
  () => {
    console.log(
      `Server is Running on Port ${PORT}`
    );

    console.log(
      `Frontend URL: ${
        process.env.FRONTEND_URL ||
        "http://localhost:5173"
      }`
    );
  }
);