import React from "react";
import { Navigate } from "react-router-dom";

/**
 * AdminLoginPage has been consolidated into the unified single login page at /login.
 * All traffic is seamlessly redirected to /login.
 */
export const AdminLoginPage = () => {
  return <Navigate to="/login" replace />;
};

export default AdminLoginPage;
