import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiRequest } from "../api";

function SubscriberRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkSubscription = async () => {
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

        setUser(data.user);

        localStorage.setItem(
          "digitalHeroesUser",
          JSON.stringify(data.user)
        );
      } catch (error) {
        console.error(
          "Subscription Check Error:",
          error.message
        );

        localStorage.removeItem(
          "digitalHeroesToken"
        );

        localStorage.removeItem(
          "digitalHeroesUser"
        );

        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, []);

  if (loading) {
    return (
      <div className="route-loading-page">
        <div className="route-loader-brand">
          DH
        </div>

        <div className="route-spinner"></div>

        <p>
          Checking your subscription...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (user.role === "Admin") {
    return children;
  }

  if (
    user.subscriptionStatus !==
    "Active"
  ) {
    return (
      <Navigate
        to="/subscription"
        replace
      />
    );
  }

  return children;
}

export default SubscriberRoute;
