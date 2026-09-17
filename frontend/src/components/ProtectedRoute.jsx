import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiRequest } from "../api";

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] =
    useState(false);

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const token =
          localStorage.getItem(
            "digitalHeroesToken"
          );

        if (!token) {
          setLoading(false);
          return;
        }

        const data = await apiRequest(
          "/auth/me"
        );

        if (data.user) {
          localStorage.setItem(
            "digitalHeroesUser",
            JSON.stringify(data.user)
          );

          setAuthenticated(true);
        }
      } catch (error) {
        console.error(
          "Authentication Check Error:",
          error.message
        );

        localStorage.removeItem(
          "digitalHeroesToken"
        );

        localStorage.removeItem(
          "digitalHeroesUser"
        );

        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    verifyUser();
  }, []);

  if (loading) {
    return (
      <div className="route-loading-page">
        <div className="route-loader-brand">
          DH
        </div>

        <div className="route-spinner"></div>

        <p>
          Checking your account...
        </p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;
