import { Navigate } from "react-router-dom";

function AdminRoute({ children }) {
  const token = localStorage.getItem("digitalHeroesToken");
  const storedUser = localStorage.getItem("digitalHeroesUser");

  console.log("========== ADMIN ROUTE ==========");
  console.log("Token:", token ? "EXISTS" : "MISSING");
  console.log("Stored User:", storedUser);

  // No token
  if (!token) {
    console.log("ADMIN ROUTE: No token → Login");
    return <Navigate to="/login" replace />;
  }

  let user = null;

  try {
    user = JSON.parse(storedUser);
  } catch (error) {
    console.error("ADMIN ROUTE: Invalid user JSON", error);

    localStorage.removeItem("digitalHeroesToken");
    localStorage.removeItem("digitalHeroesUser");

    return <Navigate to="/login" replace />;
  }

  console.log("Parsed User:", user);
  console.log("User Role:", user?.role);

  // No user
  if (!user) {
    console.log("ADMIN ROUTE: No user → Login");
    return <Navigate to="/login" replace />;
  }

  // Role check
  if (String(user.role).toLowerCase() !== "admin") {
    console.log(
      "ADMIN ROUTE: Not Admin → Dashboard"
    );

    return <Navigate to="/dashboard" replace />;
  }

  console.log("ADMIN ROUTE: ADMIN VERIFIED");

  return children;
}

export default AdminRoute;