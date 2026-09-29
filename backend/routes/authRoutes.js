const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
findUserByEmail,
findUserById,
createUser,
} = require("../services/userService");

const router = express.Router();

 /*

# SIGNUP

*/
router.post("/signup", async (req, res) => {
try {
const {
name,
email,
password,
role,
subscriptionStatus,
subscriptionPlan,
charityContribution,
} = req.body;

if (!name || !email || !password) {
  return res.status(400).json({
    message: "Name, email and password are required",
  });
}

const normalizedEmail = email.toLowerCase().trim();

const existingUser = await findUserByEmail(normalizedEmail);

if (existingUser) {
  return res.status(400).json({
    message: "User already exists",
  });
}

const hashedPassword = await bcrypt.hash(password, 10);

const user = await createUser({
  name: name.trim(),
  email: normalizedEmail,
  password: hashedPassword,
  role: role || "User",
  subscriptionStatus: subscriptionStatus || "Not Subscribed",
  subscriptionPlan: subscriptionPlan || null,
  charityContribution: charityContribution || 10,
});

res.status(201).json({
  message: "User registered successfully",
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    subscriptionStatus: user.subscription_status,
    subscriptionPlan: user.subscription_plan,
  },
});


} catch (error) {
console.error("Signup Error:", error);


res.status(500).json({
  message: "Server error during signup",
});

}
});



//  LOGIN

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("========== LOGIN START ==========");
    console.log("Email received:", email);
    console.log("Password received:", password ? "YES" : "NO");

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    console.log(
      "Normalized email:",
      normalizedEmail
    );

    // ============================================
    // FIND USER
    // ============================================

    const user = await findUserByEmail(
      normalizedEmail
    );

    console.log(
      "User found:",
      user
        ? {
            id: user.id,
            email: user.email,
            role: user.role,
            hasPassword: !!user.password,
          }
        : null
    );

    if (!user) {
      console.log(
        "LOGIN FAILED: USER NOT FOUND"
      );

      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // ============================================
    // PASSWORD
    // ============================================

    console.log(
      "Password hash exists:",
      !!user.password
    );

    console.log(
      "Password hash prefix:",
      user.password
        ? user.password.substring(0, 7)
        : "NO HASH"
    );

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    console.log(
      "Password match:",
      passwordMatch
    );

    if (!passwordMatch) {
      console.log(
        "LOGIN FAILED: PASSWORD MISMATCH"
      );

      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // ============================================
    // JWT
    // ============================================

    console.log(
      "JWT_SECRET exists:",
      !!process.env.JWT_SECRET
    );

    const token = jwt.sign(
      {
        userId: user.id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    console.log(
      "JWT created successfully"
    );

    // ============================================
    // RESPONSE
    // ============================================

    console.log(
      "LOGIN SUCCESS:",
      user.email,
      user.role
    );

    console.log("========== LOGIN END ==========");

    return res.json({
      message: "Login successful",

      token,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,

        subscriptionStatus:
          user.subscription_status,

        subscriptionPlan:
          user.subscription_plan,

        subscriptionStartDate:
          user.subscription_start_date,

        subscriptionEndDate:
          user.subscription_end_date,

        charityId:
          user.charity_id,

        charityContribution:
          user.charity_contribution,
      },
    });

  } catch (error) {
    console.error(
      "========== LOGIN ERROR =========="
    );

    console.error(error);

    return res.status(500).json({
      message: "Server error during login",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
});

// # GET CURRENT USER

router.get("/me", async (req, res) => {
try {
const authHeader = req.headers.authorization;

if (!authHeader || !authHeader.startsWith("Bearer ")) {
  return res.status(401).json({
    message: "Authorization token required",
  });
}

const token = authHeader.split(" ")[1];

const decoded = jwt.verify(
  token,
  process.env.JWT_SECRET
);

const user = await findUserById(decoded.userId);

if (!user) {
  return res.status(404).json({
    message: "User not found",
  });
}

res.json({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  subscriptionStatus: user.subscription_status,
  subscriptionPlan: user.subscription_plan,
  subscriptionStartDate: user.subscription_start_date,
  subscriptionEndDate: user.subscription_end_date,
  charityId: user.charity_id,
  charityContribution: user.charity_contribution,
});

} catch (error) {
console.error("Get Me Error:", error);

if (
  error.name === "JsonWebTokenError" ||
  error.name === "TokenExpiredError"
) {
  return res.status(401).json({
    message: "Invalid or expired token",
  });
}

res.status(500).json({
  message: "Server error",
});

}
});

module.exports = router;
