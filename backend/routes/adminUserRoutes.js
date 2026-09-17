const express = require("express");

const User = require("../models/User");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();


// =====================================================
// GET ALL USERS
// Admin only
// =====================================================

router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const users = await User.find()
        .select(
          "-password -stripeCustomerId -stripeSubscriptionId -stripePriceId"
        )
        .populate(
          "charity",
          "name"
        )
        .sort({
          createdAt: -1,
        });

      res.status(200).json({
        users,
      });
    } catch (error) {
      console.error(
        "Get All Users Error:",
        error.message
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);


// =====================================================
// UPDATE USER SUBSCRIPTION STATUS
// Admin only
// =====================================================

router.put(
  "/:id/subscription-status",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { status } = req.body;

      const allowedStatuses = [
        "Not Subscribed",
        "Active",
        "Cancelled",
        "Lapsed",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message:
            "Invalid subscription status",
        });
      }

      const user = await User.findById(
        req.params.id
      );

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      user.subscriptionStatus = status;

      await user.save();

      const updatedUser =
        await User.findById(user._id)
          .select(
            "-password -stripeCustomerId -stripeSubscriptionId -stripePriceId"
          )
          .populate(
            "charity",
            "name"
          );

      res.status(200).json({
        message:
          "Subscription status updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error(
        "Update User Subscription Error:",
        error.message
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);


module.exports = router;