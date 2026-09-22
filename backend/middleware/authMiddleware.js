const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Authentication token missing",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.userId) {
      return res.status(401).json({
        message: "Invalid authentication token",
      });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", decoded.userId)
      .maybeSingle();

    if (error) {
      console.error("Auth middleware Supabase error:", error);

      return res.status(500).json({
        message: "Failed to fetch user",
      });
    }

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    const {
      password,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      ...safeUser
    } = user;

    req.user = safeUser;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Authentication token expired",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid authentication token",
      });
    }

    return res.status(500).json({
      message: "Authentication failed",
    });
  }
};

module.exports = authMiddleware;