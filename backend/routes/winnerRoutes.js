
const express = require("express");

const DrawResult = require("../models/DrawResult");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const cloudinary = require("../config/cloudinary");

const router = express.Router();


// =====================================================
// GET CURRENT USER'S WINNINGS
// GET /api/winners/my
// =====================================================

router.get(
  "/my",
  authMiddleware,
  async (req, res) => {
    try {
      const results =
        await DrawResult.find({
          user: req.user._id,
        })
          .populate(
            "draw",
            "drawMonth winningNumbers status"
          )
          .sort({
            createdAt: -1,
          });

      res.status(200).json({
        winnings: results,
      });
    } catch (error) {
      console.error(
        "Get My Winnings Error:",
        error.message
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);


// =====================================================
// GET SINGLE WINNING RESULT
// GET /api/winners/:id
// =====================================================

router.get(
  "/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const result =
        await DrawResult.findOne({
          _id: req.params.id,
          user: req.user._id,
        }).populate(
          "draw",
          "drawMonth winningNumbers status"
        );

      if (!result) {
        return res.status(404).json({
          message:
            "Winning result not found",
        });
      }

      res.status(200).json({
        winning: result,
      });
    } catch (error) {
      console.error(
        "Get Winning Error:",
        error.message
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);


// =====================================================
// SUBMIT WINNER PROOF
// PUT /api/winners/:id/proof
//
// FormData:
// proofScreenshot = image file
// =====================================================

router.put(
  "/:id/proof",
  authMiddleware,
  upload.single("proofScreenshot"),
  async (req, res) => {
    try {

      // =================================================
      // CHECK FILE
      // =================================================

      if (!req.file) {
        return res.status(400).json({
          message:
            "Please select a screenshot image",
        });
      }


      // =================================================
      // FIND WINNING RESULT
      // =================================================

      const result =
        await DrawResult.findOne({
          _id: req.params.id,
          user: req.user._id,
        });

      if (!result) {
        return res.status(404).json({
          message:
            "Winning result not found",
        });
      }


      // =================================================
      // CLOUDINARY UPLOAD
      // =================================================

      const uploadToCloudinary =
        () => {
          return new Promise(
            (resolve, reject) => {

              const uploadStream =
                cloudinary.uploader.upload_stream(
                  {
                    folder:
                      "digital-heroes/winner-proofs",

                    resource_type:
                      "image",
                  },
                  (
                    error,
                    result
                  ) => {
                    if (error) {
                      reject(error);
                    } else {
                      resolve(result);
                    }
                  }
                );

              uploadStream.end(
                req.file.buffer
              );
            }
          );
        };


      const uploadedImage =
        await uploadToCloudinary();


      // =================================================
      // SAVE CLOUDINARY URL
      // =================================================

      result.proofScreenshot =
        uploadedImage.secure_url;

      // New proof requires fresh verification
      result.verificationStatus =
        "Pending";

      // Payment goes back to pending
      result.paymentStatus =
        "Pending";

      await result.save();


      // =================================================
      // RESPONSE
      // =================================================

      res.status(200).json({
        message:
          "Winner proof uploaded successfully",

        winning: result,
      });

    } catch (error) {

      console.error(
        "Submit Winner Proof Error:",
        error.message
      );

      res.status(500).json({
        message:
          "Unable to upload winner proof",
      });
    }
  }
);


module.exports = router;
