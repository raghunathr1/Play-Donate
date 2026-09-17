const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// ======================================================
// SIGNUP
// ======================================================

router.post("/signup", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
    } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message:
          "Name, email and password are required",
      });
    }

    // Check existing user
    const existingUser =
      await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message:
          "User already exists with this email",
      });
    }

    // Hash password
    const hashedPassword =
      await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "Signup successful",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscriptionStatus:
          user.subscriptionStatus,
        subscriptionPlan:
          user.subscriptionPlan,
      },
    });

  } catch (error) {

    console.error(
      "Signup Error:",
      error.message
    );

    res.status(500).json({
      message: "Server error",
    });
  }
});


// ======================================================
// LOGIN
// ======================================================

router.post("/login", async (req, res) => {
  try {

    const {
      email,
      password,
    } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        message:
          "Email and password are required",
      });
    }

    // Find user
    const user =
      await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message:
          "Invalid email or password",
      });
    }

    // Compare password
    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatch) {
      return res.status(401).json({
        message:
          "Invalid email or password",
      });
    }

    // Create JWT
    const token = jwt.sign(
      {
        userId: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    // Login response
    res.status(200).json({

      message:
        "Login successful",

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,

        // IMPORTANT
        role: user.role,

        subscriptionStatus:
          user.subscriptionStatus,

        subscriptionPlan:
          user.subscriptionPlan,

        subscriptionStartDate:
          user.subscriptionStartDate,

        subscriptionEndDate:
          user.subscriptionEndDate,

        charity:
          user.charity,

        charityContribution:
          user.charityContribution,
      },
    });

  } catch (error) {

    console.error(
      "Login Error:",
      error.message
    );

    res.status(500).json({
      message: "Server error",
    });
  }
});


// ======================================================
// GET CURRENT USER
// ======================================================

router.get(
  "/me",
  authMiddleware,
  async (req, res) => {

    try {

      res.status(200).json({
        message:
          "Authenticated user",

        user: req.user,
      });

    } catch (error) {

      console.error(
        "Get Current User Error:",
        error.message
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);


module.exports = router;