// src/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ user, allowedRoles, children }) => {
  // If no user is logged in, redirect to login
  if (!user) return <Navigate to="/login" />;

  // If allowedRoles is specified and user doesn't have the right role
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Instead of redirecting to login, redirect to dashboard
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default ProtectedRoute;
