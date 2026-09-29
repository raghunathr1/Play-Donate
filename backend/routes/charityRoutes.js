const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const supabase = require("../config/supabase");

// =========================================================
// HELPER - REQUIRE ACTIVE SUBSCRIPTION
// =========================================================

const requireActiveSubscription = async (req, res) => {
  try {
    const {
      data: user,
      error,
    } = await supabase
      .from("users")
      .select(
        `
        id,
        subscription_status,
        subscription_plan
        `
      )
      .eq("id", req.user.id)
      .maybeSingle();

    if (error) {
      console.error(
        "Check charity subscription error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to verify subscription status",
      });

      return false;
    }

    if (!user) {
      res.status(404).json({
        message: "User not found",
      });

      return false;
    }

    const status = String(
      user.subscription_status || ""
    )
      .trim()
      .toLowerCase();

    if (status !== "active") {
      res.status(403).json({
        message:
          "An active subscription is required to select a charity",
      });

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "Charity subscription check error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to verify subscription status",
    });

    return false;
  }
};

// =========================================================
// GET - ACTIVE CHARITIES
// GET /api/charities
// =========================================================
//
// Public directory access.
// Non-subscribers can view the charity directory.
// Selection itself is protected below.

router.get("/", async (req, res) => {
  try {
    const {
      data: charities,
      error,
    } = await supabase
      .from("charities")
      .select("*")
      .eq("is_active", true)
      .order("is_featured", {
        ascending: false,
      })
      .order("name", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Get charities error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch charities",
      });
    }

    return res.json({
      charities: charities || [],
    });
  } catch (error) {
    console.error(
      "Get charities error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
});

// =========================================================
// GET - ALL CHARITIES FOR ADMIN
// GET /api/charities/admin/all
// =========================================================

router.get(
  "/admin/all",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const {
        data: charities,
        error,
      } = await supabase
        .from("charities")
        .select("*")
        .order("is_featured", {
          ascending: false,
        })
        .order("name", {
          ascending: true,
        });

      if (error) {
        console.error(
          "Get all charities error:",
          error
        );

        return res.status(500).json({
          message:
            "Failed to fetch charities",
        });
      }

      return res.json({
        charities: charities || [],
      });
    } catch (error) {
      console.error(
        "Get all charities error:",
        error
      );

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================================================
// GET - SINGLE ACTIVE CHARITY
// GET /api/charities/:id
// =========================================================

router.get(
  "/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        data: charity,
        error,
      } = await supabase
        .from("charities")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error(
          "Get charity error:",
          error
        );

        return res.status(500).json({
          message:
            "Failed to fetch charity",
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
      console.error(
        "Get charity error:",
        error
      );

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================================================
// PUT - SELECT CHARITY + CONTRIBUTION
// PUT /api/charities/select
// =========================================================
//
// Active subscription required.
//
// Supports both:
// contribution
//
// and:
// charityContribution
//
// so existing frontend code does not break.

router.put(
  "/select",
  authMiddleware,
  async (req, res) => {
    try {
      // -----------------------------------------------------
      // CHECK ACTIVE SUBSCRIPTION
      // -----------------------------------------------------

      const hasActiveSubscription =
        await requireActiveSubscription(
          req,
          res
        );

      if (!hasActiveSubscription) {
        return;
      }

      // -----------------------------------------------------
      // GET BODY
      // -----------------------------------------------------

      const {
        charityId,
        contribution,
        charityContribution,
      } = req.body;

      // -----------------------------------------------------
      // SUPPORT BOTH FRONTEND FIELD NAMES
      // -----------------------------------------------------

      const rawContribution =
        contribution !== undefined
          ? contribution
          : charityContribution;

      // -----------------------------------------------------
      // VALIDATE CHARITY ID
      // -----------------------------------------------------

      if (!charityId) {
        return res.status(400).json({
          message:
            "Charity ID is required",
        });
      }

      // -----------------------------------------------------
      // VALIDATE CONTRIBUTION
      // -----------------------------------------------------

      const contributionPercentage =
        Number(rawContribution);

      if (
        !Number.isInteger(
          contributionPercentage
        ) ||
        contributionPercentage < 10 ||
        contributionPercentage > 100
      ) {
        return res.status(400).json({
          message:
            "Contribution must be between 10% and 100%",
        });
      }

      // -----------------------------------------------------
      // CHECK CHARITY EXISTS + ACTIVE
      // -----------------------------------------------------

      const {
        data: charity,
        error: charityError,
      } = await supabase
        .from("charities")
        .select(
          `
          id,
          name,
          description,
          image,
          upcoming_events,
          is_featured,
          is_active
          `
        )
        .eq("id", charityId)
        .eq("is_active", true)
        .maybeSingle();

      if (charityError) {
        console.error(
          "Charity selection check error:",
          charityError
        );

        return res.status(500).json({
          message:
            "Failed to verify charity",
        });
      }

      if (!charity) {
        return res.status(404).json({
          message:
            "Active charity not found",
        });
      }

      // -----------------------------------------------------
      // UPDATE USER
      // -----------------------------------------------------

      const {
        data: updatedUser,
        error: updateError,
      } = await supabase
        .from("users")
        .update({
          charity_id: charityId,
          charity_contribution:
            contributionPercentage,
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
          message:
            "Failed to select charity",
        });
      }

      // -----------------------------------------------------
      // SUCCESS
      // -----------------------------------------------------

      return res.json({
        message:
          "Charity selected successfully",

        charity,

        user: updatedUser,
      });
    } catch (error) {
      console.error(
        "Select charity error:",
        error
      );

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================================================
// POST - CREATE CHARITY
// POST /api/charities/admin
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

      // -----------------------------------------------------
      // VALIDATE NAME
      // -----------------------------------------------------

      if (
        !name ||
        typeof name !== "string" ||
        !name.trim()
      ) {
        return res.status(400).json({
          message:
            "Charity name is required",
        });
      }

      // -----------------------------------------------------
      // NORMALIZE EVENTS
      // -----------------------------------------------------

      const events = Array.isArray(
        upcomingEvents
      )
        ? upcomingEvents
        : [];

      // -----------------------------------------------------
      // INSERT
      // -----------------------------------------------------

      const {
        data: charity,
        error,
      } = await supabase
        .from("charities")
        .insert({
          name: name.trim(),

          description:
            typeof description === "string"
              ? description
              : "",

          image:
            typeof image === "string"
              ? image
              : "",

          upcoming_events: events,

          is_featured:
            featured === true,

          is_active:
            active !== false,
        })
        .select("*")
        .single();

      if (error) {
        console.error(
          "Create charity error:",
          error
        );

        return res.status(500).json({
          message:
            "Failed to create charity",
        });
      }

      return res.status(201).json({
        message:
          "Charity created successfully",

        charity,
      });
    } catch (error) {
      console.error(
        "Create charity error:",
        error
      );

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================================================
// PUT - UPDATE CHARITY
// PUT /api/charities/admin/:id
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

      // -----------------------------------------------------
      // NAME
      // -----------------------------------------------------

      if (name !== undefined) {
        if (
          typeof name !== "string" ||
          !name.trim()
        ) {
          return res.status(400).json({
            message:
              "Charity name cannot be empty",
          });
        }

        updates.name = name.trim();
      }

      // -----------------------------------------------------
      // DESCRIPTION
      // -----------------------------------------------------

      if (
        description !== undefined
      ) {
        updates.description =
          typeof description ===
          "string"
            ? description
            : "";
      }

      // -----------------------------------------------------
      // IMAGE
      // -----------------------------------------------------

      if (
        image !== undefined
      ) {
        updates.image =
          typeof image === "string"
            ? image
            : "";
      }

      // -----------------------------------------------------
      // UPCOMING EVENTS
      // -----------------------------------------------------

      if (
        upcomingEvents !==
        undefined
      ) {
        updates.upcoming_events =
          Array.isArray(
            upcomingEvents
          )
            ? upcomingEvents
            : [];
      }

      // -----------------------------------------------------
      // FEATURED
      // -----------------------------------------------------

      if (
        featured !== undefined
      ) {
        updates.is_featured =
          Boolean(featured);
      }

      // -----------------------------------------------------
      // ACTIVE
      // -----------------------------------------------------

      if (
        active !== undefined
      ) {
        updates.is_active =
          Boolean(active);
      }

      // -----------------------------------------------------
      // NOTHING TO UPDATE
      // -----------------------------------------------------

      if (
        Object.keys(updates)
          .length === 0
      ) {
        return res.status(400).json({
          message:
            "No fields to update",
        });
      }

      // -----------------------------------------------------
      // UPDATE
      // -----------------------------------------------------

      const {
        data: charity,
        error,
      } = await supabase
        .from("charities")
        .update(updates)
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (error) {
        console.error(
          "Update charity error:",
          error
        );

        return res.status(500).json({
          message:
            "Failed to update charity",
        });
      }

      if (!charity) {
        return res.status(404).json({
          message:
            "Charity not found",
        });
      }

      return res.json({
        message:
          "Charity updated successfully",

        charity,
      });
    } catch (error) {
      console.error(
        "Update charity error:",
        error
      );

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================================================
// DELETE - SOFT DELETE CHARITY
// DELETE /api/charities/admin/:id
// =========================================================

router.delete(
  "/admin/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        data: charity,
        error,
      } = await supabase
        .from("charities")
        .update({
          is_active: false,
        })
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (error) {
        console.error(
          "Delete charity error:",
          error
        );

        return res.status(500).json({
          message:
            "Failed to delete charity",
        });
      }

      if (!charity) {
        return res.status(404).json({
          message:
            "Charity not found",
        });
      }

      return res.json({
        message:
          "Charity deleted successfully",

        charity,
      });
    } catch (error) {
      console.error(
        "Delete charity error:",
        error
      );

      return res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================================================
// EXPORT ROUTER
// =========================================================

module.exports = router;