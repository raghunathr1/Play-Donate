const express = require("express");

const Charity = require("../models/Charity");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();


// ======================================================
// GET ALL ACTIVE CHARITIES
// GET /api/charities
// PUBLIC
// ======================================================

router.get("/", async (req, res) => {
  try {
    const charities = await Charity.find({
      isActive: true,
    }).sort({
      isFeatured: -1,
      name: 1,
    });

    res.status(200).json({
      charities,
    });
  } catch (error) {
    console.error(
      "Get Charities Error:",
      error.message
    );

    res.status(500).json({
      message: "Server error",
    });
  }
});


// ======================================================
// GET ALL CHARITIES FOR ADMIN
// GET /api/charities/admin/all
// ADMIN ONLY
// ======================================================

router.get(
  "/admin/all",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const charities = await Charity.find()
        .sort({
          isActive: -1,
          isFeatured: -1,
          name: 1,
        });

      res.status(200).json({
        charities,
      });
    } catch (error) {
      console.error(
        "Get Admin Charities Error:",
        error.message
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);


// ======================================================
// GET SINGLE CHARITY
// GET /api/charities/:id
// PUBLIC
// ======================================================

router.get("/:id", async (req, res) => {
  try {
    const charity = await Charity.findOne({
      _id: req.params.id,
      isActive: true,
    });

    if (!charity) {
      return res.status(404).json({
        message: "Charity not found",
      });
    }

    res.status(200).json({
      charity,
    });
  } catch (error) {
    console.error(
      "Get Charity Error:",
      error.message
    );

    res.status(500).json({
      message: "Server error",
    });
  }
});


// ======================================================
// SELECT CHARITY FOR LOGGED-IN USER
// PUT /api/charities/select
// USER AUTHENTICATION REQUIRED
// ======================================================

router.put(
  "/select",
  authMiddleware,
  async (req, res) => {
    try {
      const {
        charityId,
        charityContribution,
      } = req.body;


      // ------------------------------------------
      // Validate charity
      // ------------------------------------------

      if (!charityId) {
        return res.status(400).json({
          message: "Charity is required",
        });
      }


      // ------------------------------------------
      // Validate contribution
      // ------------------------------------------

      const contribution = Number(
        charityContribution || 10
      );

      if (
        contribution < 10 ||
        contribution > 100
      ) {
        return res.status(400).json({
          message:
            "Charity contribution must be between 10% and 100%",
        });
      }


      // ------------------------------------------
      // Find active charity
      // ------------------------------------------

      const charity = await Charity.findOne({
        _id: charityId,
        isActive: true,
      });

      if (!charity) {
        return res.status(404).json({
          message: "Charity not found",
        });
      }


      // ------------------------------------------
      // Update logged-in user
      // ------------------------------------------

      const user = req.user;

      user.charity = charity._id;
      user.charityContribution = contribution;

      await user.save();


      // ------------------------------------------
      // Response
      // ------------------------------------------

      res.status(200).json({
        message:
          "Charity selected successfully",

        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          charity: user.charity,
          charityContribution:
            user.charityContribution,
        },
      });

    } catch (error) {
      console.error(
        "Select Charity Error:",
        error.message
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);


// ======================================================
// CREATE CHARITY
// POST /api/charities
// ADMIN ONLY
// ======================================================

router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const {
        name,
        description,
        image,
        upcomingEvents,
        isFeatured,
      } = req.body;


      // ------------------------------------------
      // Validation
      // ------------------------------------------

      if (
        !name ||
        !name.trim() ||
        !description ||
        !description.trim()
      ) {
        return res.status(400).json({
          message:
            "Name and description are required",
        });
      }


      // ------------------------------------------
      // Prepare events
      // ------------------------------------------

      const events = Array.isArray(
        upcomingEvents
      )
        ? upcomingEvents
        : [];


      // ------------------------------------------
      // Create charity
      // ------------------------------------------

      const charity = await Charity.create({
        name: name.trim(),
        description: description.trim(),
        image: image ? image.trim() : "",
        upcomingEvents: events,
        isFeatured: Boolean(isFeatured),
        isActive: true,
      });


      // ------------------------------------------
      // Response
      // ------------------------------------------

      res.status(201).json({
        message:
          "Charity created successfully",
        charity,
      });

    } catch (error) {
      console.error(
        "Create Charity Error:",
        error.message
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);


// ======================================================
// UPDATE CHARITY
// PUT /api/charities/:id
// ADMIN ONLY
// ======================================================

router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const {
        name,
        description,
        image,
        upcomingEvents,
        isFeatured,
        isActive,
      } = req.body;


      // ------------------------------------------
      // Find charity
      // ------------------------------------------

      const charity = await Charity.findById(
        req.params.id
      );

      if (!charity) {
        return res.status(404).json({
          message: "Charity not found",
        });
      }


      // ------------------------------------------
      // Update provided fields
      // ------------------------------------------

      if (name !== undefined) {
        if (!name.trim()) {
          return res.status(400).json({
            message: "Charity name cannot be empty",
          });
        }

        charity.name = name.trim();
      }


      if (description !== undefined) {
        if (!description.trim()) {
          return res.status(400).json({
            message:
              "Charity description cannot be empty",
          });
        }

        charity.description =
          description.trim();
      }


      if (image !== undefined) {
        charity.image = image.trim();
      }


      if (upcomingEvents !== undefined) {
        charity.upcomingEvents =
          Array.isArray(upcomingEvents)
            ? upcomingEvents
            : [];
      }


      if (isFeatured !== undefined) {
        charity.isFeatured =
          Boolean(isFeatured);
      }


      if (isActive !== undefined) {
        charity.isActive =
          Boolean(isActive);
      }


      // ------------------------------------------
      // Save
      // ------------------------------------------

      await charity.save();


      // ------------------------------------------
      // Response
      // ------------------------------------------

      res.status(200).json({
        message:
          "Charity updated successfully",
        charity,
      });

    } catch (error) {
      console.error(
        "Update Charity Error:",
        error.message
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);


// ======================================================
// DELETE CHARITY
// DELETE /api/charities/:id
// ADMIN ONLY
// ======================================================

router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const charity = await Charity.findById(
        req.params.id
      );

      if (!charity) {
        return res.status(404).json({
          message: "Charity not found",
        });
      }


      // ------------------------------------------
      // Soft delete
      // ------------------------------------------

      charity.isActive = false;

      await charity.save();


      // ------------------------------------------
      // Response
      // ------------------------------------------

      res.status(200).json({
        message:
          "Charity deleted successfully",
      });

    } catch (error) {
      console.error(
        "Delete Charity Error:",
        error.message
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);


module.exports = router;