import { BrowserRouter, Routes, Route } from "react-router-dom";

// ==================================================
// PUBLIC PAGES
// ==================================================

import Home from "./pages/public/Home";

// ==================================================
// AUTHENTICATION PAGES
// ==================================================

import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";

// ==================================================
// USER PAGES
// ==================================================

import Dashboard from "./pages/user/Dashboard";
import Subscription from "./pages/user/Subscription";
import Scores from "./pages/user/Scores";
import Charities from "./pages/user/Charities";
import Draws from "./pages/user/Draws";
import Winnings from "./pages/user/Winnings";

// ==================================================
// ROUTE PROTECTION
// ==================================================

import ProtectedRoute from "./components/ProtectedRoute";
import SubscriberRoute from "./components/SubscriberRoute";
import AdminRoute from "./components/AdminRoute";

// ==================================================
// ADMIN PAGES
// ==================================================

import AdminDashboard from "./pages/admin/AdminDashboard";
import Users from "./pages/admin/Users";
import DrawManagement from "./pages/admin/DrawManagement";
import CharityManagement from "./pages/admin/CharityManagement";
import Winners from "./pages/admin/Winners";
import Reports from "./pages/admin/Reports";


function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* ==================================================
            PUBLIC ROUTES
        ================================================== */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />


        {/* ==================================================
            USER ROUTES
            LOGIN REQUIRED
        ================================================== */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/subscription"
          element={
            <ProtectedRoute>
              <Subscription />
            </ProtectedRoute>
          }
        />

        <Route
          path="/charities"
          element={
            <ProtectedRoute>
              <Charities />
            </ProtectedRoute>
          }
        />

        {/* ==================================================
            SCORES
            LOGIN REQUIRED

            IMPORTANT:
            Scores ko SubscriberRoute ke andar mat rakho.
            User "Not Subscribed" hone par bhi scores manage
            kar sakta hai.
        ================================================== */}

        <Route
          path="/scores"
          element={
            <ProtectedRoute>
              <Scores />
            </ProtectedRoute>
          }
        />

        {/* ==================================================
            DRAWS
            LOGIN REQUIRED
        ================================================== */}

        <Route
          path="/draws"
          element={
            <ProtectedRoute>
              <Draws />
            </ProtectedRoute>
          }
        />

        {/* ==================================================
            WINNINGS
            LOGIN REQUIRED
        ================================================== */}

        <Route
          path="/winnings"
          element={
            <ProtectedRoute>
              <Winnings />
            </ProtectedRoute>
          }
        />


        {/* ==================================================
            SUBSCRIBER ONLY ROUTES

            Future mein jis page ko ACTIVE subscription
            required karna ho, usko yahan rakhenge.
        ================================================== */}

        {/* Example:

        <Route
          path="/subscriber-example"
          element={
            <SubscriberRoute>
              <SubscriberExample />
            </SubscriberRoute>
          }
        />

        */}


        {/* ==================================================
            ADMIN ROUTES
            ADMIN ROLE REQUIRED
        ================================================== */}

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <Users />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/draws"
          element={
            <AdminRoute>
              <DrawManagement />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/charities"
          element={
            <AdminRoute>
              <CharityManagement />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/winners"
          element={
            <AdminRoute>
              <Winners />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/reports"
          element={
            <AdminRoute>
              <Reports />
            </AdminRoute>
          }
        />


        {/* ==================================================
            FALLBACK
        ================================================== */}

        <Route
          path="*"
          element={<Home />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;