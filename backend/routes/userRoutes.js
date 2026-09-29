const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const supabase = require("../config/supabase");

// =====================================================
// GET - ALL USERS
// =====================================================

router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const {
        data: users,
        error,
      } = await supabase
        .from("users")
        .select(`
          id,
          name,
          email,
          role,
          subscription_plan,
          subscription_status,
          created_at,
          updated_at
        `)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Get users error:",
          error
        );

        return res.status(500).json({
          message:
            "Failed to fetch users",
        });
      }

      return res.json({
        users: users || [],
      });
    } catch (error) {
      console.error(
        "Get users server error:",
        error
      );

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// GET - SINGLE USER
// =====================================================

router.get(
  "/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        data: user,
        error,
      } = await supabase
        .from("users")
        .select(`
          id,
          name,
          email,
          role,
          subscription_plan,
          subscription_status,
          created_at,
          updated_at
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error(
          "Get user error:",
          error
        );

        return res.status(500).json({
          message:
            "Failed to fetch user",
        });
      }

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      return res.json({
        user,
      });
    } catch (error) {
      console.error(
        "Get single user server error:",
        error
      );

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// PUT - UPDATE USER SUBSCRIPTION STATUS
// =====================================================

router.put(
  "/:id/subscription",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        subscription_plan,
        subscription_status,
      } = req.body;

      const allowedPlans = [
        "Monthly",
        "Yearly",
        null,
      ];

      const allowedStatuses = [
        "Active",
        "Cancelled",
        "Inactive",
        "Not Subscribed",
        null,
      ];

      if (
        subscription_plan !== undefined &&
        !allowedPlans.includes(
          subscription_plan
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid subscription plan",
        });
      }

      if (
        subscription_status !== undefined &&
        !allowedStatuses.includes(
          subscription_status
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid subscription status",
        });
      }

      const updateData = {};

      if (
        subscription_plan !== undefined
      ) {
        updateData.subscription_plan =
          subscription_plan;
      }

      if (
        subscription_status !== undefined
      ) {
        updateData.subscription_status =
          subscription_status;
      }

      if (
        Object.keys(updateData).length === 0
      ) {
        return res.status(400).json({
          message:
            "No subscription data provided",
        });
      }

      const {
        data: updatedUser,
        error,
      } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", id)
        .select(`
          id,
          name,
          email,
          role,
          subscription_plan,
          subscription_status,
          created_at,
          updated_at
        `)
        .single();

      if (error) {
        console.error(
          "Update user subscription error:",
          error
        );

        return res.status(500).json({
          message:
            "Failed to update subscription",
        });
      }

      return res.json({
        message:
          "User subscription updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error(
        "Update subscription server error:",
        error
      );

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

module.exports = router;