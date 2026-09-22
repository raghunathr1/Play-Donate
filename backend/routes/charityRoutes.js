const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const supabase = require("../config/supabase");

// =========================================================
// GET - Active charities
// =========================================================
router.get("/", async (req, res) => {
  try {
    const { data: charities, error } = await supabase
      .from("charities")
      .select("*")
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("Get charities error:", error);

      return res.status(500).json({
        message: "Failed to fetch charities",
      });
    }

    return res.json({
      charities: charities || [],
    });
  } catch (error) {
    console.error("Get charities error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

// =========================================================
// GET - All charities for admin
// =========================================================
router.get(
  "/admin/all",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { data: charities, error } = await supabase
        .from("charities")
        .select("*")
        .order("is_featured", { ascending: false })
        .order("name", { ascending: true });

      if (error) {
        console.error("Get all charities error:", error);

        return res.status(500).json({
          message: "Failed to fetch charities",
        });
      }

      return res.json({
        charities: charities || [],
      });
    } catch (error) {
      console.error("Get all charities error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================================================
// GET - Single active charity
// =========================================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: charity, error } = await supabase
      .from("charities")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("Get charity error:", error);

      return res.status(500).json({
        message: "Failed to fetch charity",
      });
    }

    if (!charity) {
      return res.status(404).json({
        message: "Charity not found",
      });
    }

    return res.json({
      charity,
    });
  } catch (error) {
    console.error("Get charity error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

// =========================================================
// PUT - Select charity and contribution percentage
// =========================================================
router.put("/select", authMiddleware, async (req, res) => {
  try {
    const { charityId, contribution } = req.body;

    if (!charityId) {
      return res.status(400).json({
        message: "Charity ID is required",
      });
    }

    const contributionPercentage = Number(contribution);

    if (
      !Number.isInteger(contributionPercentage) ||
      contributionPercentage < 10 ||
      contributionPercentage > 100
    ) {
      return res.status(400).json({
        message: "Contribution must be between 10% and 100%",
      });
    }

    const { data: charity, error: charityError } = await supabase
      .from("charities")
      .select("id, name, is_active")
      .eq("id", charityId)
      .eq("is_active", true)
      .maybeSingle();

    if (charityError) {
      console.error(
        "Charity selection check error:",
        charityError
      );

      return res.status(500).json({
        message: "Failed to verify charity",
      });
    }

    if (!charity) {
      return res.status(404).json({
        message: "Active charity not found",
      });
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({
        charity_id: charityId,
        charity_contribution: contributionPercentage,
      })
      .eq("id", req.user.id)
      .select(
        `
        id,
        name,
        email,
        role,
        subscription_status,
        subscription_plan,
        charity_id,
        charity_contribution
        `
      )
      .single();

    if (updateError) {
      console.error(
        "Update user charity error:",
        updateError
      );

      return res.status(500).json({
        message: "Failed to select charity",
      });
    }

    return res.json({
      message: "Charity selected successfully",
      charity,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Select charity error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

// =========================================================
// POST - Create charity
// =========================================================
router.post(
  "/admin",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const {
        name,
        description,
        image,
        upcomingEvents,
        featured,
        active,
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          message: "Charity name is required",
        });
      }

      const events = Array.isArray(upcomingEvents)
        ? upcomingEvents
        : [];

      const { data: charity, error } = await supabase
        .from("charities")
        .insert({
          name: name.trim(),
          description: description || "",
          image: image || "",
          upcoming_events: events,
          is_featured: featured === true,
          is_active: active !== false,
        })
        .select("*")
        .single();

      if (error) {
        console.error("Create charity error:", error);

        return res.status(500).json({
          message: "Failed to create charity",
        });
      }

      return res.status(201).json({
        message: "Charity created successfully",
        charity,
      });
    } catch (error) {
      console.error("Create charity error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================================================
// PUT - Update charity
// =========================================================
router.put(
  "/admin/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        name,
        description,
        image,
        upcomingEvents,
        featured,
        active,
      } = req.body;

      const updates = {};

      if (name !== undefined) {
        if (!name.trim()) {
          return res.status(400).json({
            message: "Charity name cannot be empty",
          });
        }

        updates.name = name.trim();
      }

      if (description !== undefined) {
        updates.description = description;
      }

      if (image !== undefined) {
        updates.image = image;
      }

      if (upcomingEvents !== undefined) {
        updates.upcoming_events = Array.isArray(upcomingEvents)
          ? upcomingEvents
          : [];
      }

      if (featured !== undefined) {
        updates.is_featured = Boolean(featured);
      }

      if (active !== undefined) {
        updates.is_active = Boolean(active);
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          message: "No fields to update",
        });
      }

      const { data: charity, error } = await supabase
        .from("charities")
        .update(updates)
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("Update charity error:", error);

        return res.status(500).json({
          message: "Failed to update charity",
        });
      }

      if (!charity) {
        return res.status(404).json({
          message: "Charity not found",
        });
      }

      return res.json({
        message: "Charity updated successfully",
        charity,
      });
    } catch (error) {
      console.error("Update charity error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================================================
// DELETE - Soft delete charity
// =========================================================
router.delete(
  "/admin/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      const { data: charity, error } = await supabase
        .from("charities")
        .update({
          is_active: false,
        })
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("Delete charity error:", error);

        return res.status(500).json({
          message: "Failed to delete charity",
        });
      }

      if (!charity) {
        return res.status(404).json({
          message: "Charity not found",
        });
      }

      return res.json({
        message: "Charity deleted successfully",
        charity,
      });
    } catch (error) {
      console.error("Delete charity error:", error);

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

module.exports = router;