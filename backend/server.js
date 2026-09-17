const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

// ==================================================
// ROUTES
// ==================================================

const authRoutes = require("./routes/authRoutes");
const scoreRoutes = require("./routes/scoreRoutes");
const charityRoutes = require("./routes/charityRoutes");

const subscriptionRoutes = require("./routes/subscriptionRoutes");
const stripeWebhookRoutes = require("./routes/stripeWebhookRoutes");

const donationRoutes = require("./routes/donationRoutes");

const drawRoutes = require("./routes/drawRoutes");
const winnerRoutes = require("./routes/winnerRoutes");

const adminWinnerRoutes = require("./routes/adminWinnerRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const adminReportRoutes = require("./routes/adminReportRoutes");

// ==================================================
// APP
// ==================================================

const app = express();

// ==================================================
// CORS
// ==================================================

app.use(cors());

// ==================================================
// STRIPE WEBHOOK
// IMPORTANT:
// Webhook must come BEFORE express.json()
// because Stripe requires the raw request body.
// ==================================================

app.use(
  "/api/subscriptions/webhook",
  stripeWebhookRoutes
);

// ==================================================
// JSON BODY PARSER
// ==================================================

app.use(express.json());

// ==================================================
// AUTH ROUTES
// ==================================================

app.use(
  "/api/auth",
  authRoutes
);

// ==================================================
// SCORE ROUTES
// ==================================================

app.use(
  "/api/scores",
  scoreRoutes
);

// ==================================================
// CHARITY ROUTES
// ==================================================

app.use(
  "/api/charities",
  charityRoutes
);

// ==================================================
// SUBSCRIPTION ROUTES
// ==================================================

app.use(
  "/api/subscriptions",
  subscriptionRoutes
);

// ==================================================
// DONATION ROUTES
// ==================================================

app.use(
  "/api/donations",
  donationRoutes
);

// ==================================================
// DRAW ROUTES
// ==================================================

app.use(
  "/api/draws",
  drawRoutes
);

// ==================================================
// USER WINNER ROUTES
// ==================================================

app.use(
  "/api/winners",
  winnerRoutes
);

// ==================================================
// ADMIN WINNER ROUTES
// ==================================================

app.use(
  "/api/admin/winners",
  adminWinnerRoutes
);

// ==================================================
// ADMIN USER ROUTES
// ==================================================

app.use(
  "/api/admin/users",
  adminUserRoutes
);

// ==================================================
// ADMIN REPORT ROUTES
// ==================================================

app.use(
  "/api/admin/reports",
  adminReportRoutes
);

// ==================================================
// ROOT API
// ==================================================

app.get("/", (req, res) => {
  res.json({
    message: "Digital Heroes API is running",
  });
});

// ==================================================
// 404 HANDLER
// ==================================================

app.use((req, res) => {
  res.status(404).json({
    message: "API route not found",
  });
});

// ==================================================
// PORT
// ==================================================

const PORT =
  process.env.PORT || 5000;

// ==================================================
// START SERVER
// ==================================================

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(
        `Server is Running on Port ${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Server Startup Error:",
      error.message
    );
  }
};

startServer();
