const express = require("express");

const DrawResult = require("../models/DrawResult");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();


// =====================================================
// GET ALL WINNERS
// Admin only
// =====================================================

router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const winners = await DrawResult.find()
        .populate(
          "user",
          "name email"
        )
        .populate(
          "draw",
          "drawMonth winningNumbers status"
        )
        .sort({
          createdAt: -1,
        });

      res.status(200).json({
        winners,
      });
    } catch (error) {
      console.error(
        "Get All Winners Error:",
        error.message
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);


// =====================================================
// APPROVE WINNER
// Admin only
// =====================================================

router.put(
  "/:id/approve",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const result =
        await DrawResult.findById(
          req.params.id
        );

      if (!result) {
        return res.status(404).json({
          message: "Winner not found",
        });
      }

      result.verificationStatus =
        "Approved";

      result.paymentStatus =
        "Pending";

      await result.save();

      res.status(200).json({
        message:
          "Winner approved successfully",

        winning: result,
      });
    } catch (error) {
      console.error(
        "Approve Winner Error:",
        error.message
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);


// =====================================================
// REJECT WINNER
// Admin only
// =====================================================

router.put(
  "/:id/reject",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const result =
        await DrawResult.findById(
          req.params.id
        );

      if (!result) {
        return res.status(404).json({
          message: "Winner not found",
        });
      }

      result.verificationStatus =
        "Rejected";

      result.paymentStatus =
        "Pending";

      await result.save();

      res.status(200).json({
        message:
          "Winner rejected successfully",

        winning: result,
      });
    } catch (error) {
      console.error(
        "Reject Winner Error:",
        error.message
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);


// =====================================================
// MARK WINNER PAYMENT AS PAID
// Admin only
// =====================================================

router.put(
  "/:id/mark-paid",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const result =
        await DrawResult.findById(
          req.params.id
        );

      if (!result) {
        return res.status(404).json({
          message: "Winner not found",
        });
      }

      if (
        result.verificationStatus !==
        "Approved"
      ) {
        return res.status(400).json({
          message:
            "Winner must be approved before payment",
        });
      }

      result.paymentStatus =
        "Paid";

      await result.save();

      res.status(200).json({
        message:
          "Winner payment marked as paid",

        winning: result,
      });
    } catch (error) {
      console.error(
        "Mark Winner Paid Error:",
        error.message
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);


module.exports = router;