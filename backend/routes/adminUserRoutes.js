const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const supabase = require("../config/supabase");

// GET - All users
router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { data: users, error } = await supabase
        .from("users")
        .select(`
          id,
          name,
          email,
          role,
          subscription_status,
          subscription_plan,
          subscription_start_date,
          subscription_end_date,
          charity_id,
          charity_contribution,
          created_at,
          charities (
            id,
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Get admin users error:", error);

        return res.status(500).json({
          message: "Failed to fetch users",
        });
      }

      const formattedUsers = (users || []).map((user) => ({
        ...user,
        charity: user.charities || null,
        charities: undefined,
      }));

      return res.json({
        users: formattedUsers,
      });
    } catch (error) {
      console.error("Get admin users error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// PUT - Update subscription status
router.put(
  "/:id/subscription-status",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const allowedStatuses = [
        "Not Subscribed",
        "Active",
        "Cancelled",
        "Lapsed",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid subscription status",
        });
      }

      const { data: existingUser, error: findError } =
        await supabase
          .from("users")
          .select("id")
          .eq("id", id)
          .maybeSingle();

      if (findError) {
        console.error("Find user error:", findError);

        return res.status(500).json({
          message: "Failed to find user",
        });
      }

      if (!existingUser) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const { data: updatedUser, error: updateError } =
        await supabase
          .from("users")
          .update({
            subscription_status: status,
          })
          .eq("id", id)
          .select(`
            id,
            name,
            email,
            role,
            subscription_status,
            subscription_plan,
            subscription_start_date,
            subscription_end_date,
            charity_id,
            charity_contribution,
            created_at,
            charities (
              id,
              name
            )
          `)
          .single();

      if (updateError) {
        console.error(
          "Update subscription status error:",
          updateError
        );

        return res.status(500).json({
          message: "Failed to update subscription status",
        });
      }

      return res.json({
        message: "Subscription status updated successfully",
        user: {
          ...updatedUser,
          charity: updatedUser.charities || null,
          charities: undefined,
        },
      });
    } catch (error) {
      console.error(
        "Update subscription status error:",
        error
      );

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

module.exports = router;