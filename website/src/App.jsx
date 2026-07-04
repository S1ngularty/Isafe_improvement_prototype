import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ConfirmEmail from "./pages/ConfirmEmail";
import ProtectedRoute from "./components/ProtectedRoute";
import StatusWidget from "./components/StatusWidget";

export default function App() {
  return (
    <>
      <StatusWidget />
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/hotlines" element={<Navigate to="/dashboard" replace />} />
      <Route path="/confirm" element={<ConfirmEmail />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute redirectAdmins>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
    </>
  );
}
