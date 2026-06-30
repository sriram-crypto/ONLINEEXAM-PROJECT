import React from "react";
import { Navigate } from "react-router-dom";

export default function PrivateRoute({ children, requiredRole }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole) {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userRole = (user.role || "").toLowerCase();
    if (userRole !== requiredRole.toLowerCase()) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
