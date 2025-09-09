'use client';

import { useAuth } from '../../hooks/useAuth';

/**
 * RoleGuard - Controls rendering based on user roles
 * 
 * @param {string[]} allowedRoles - Array of roles that can see the content
 * @param {React.ReactNode} children - Content to show when authorized
 * @param {React.ReactNode} fallback - Content to show when not authorized (optional)
 * @param {boolean} requireAuth - Whether authentication is required (default: true)
 * @param {boolean} showLoading - Whether to show loading state (default: false)
 */
export default function RoleGuard({ 
  allowedRoles = [], 
  children, 
  fallback = null, 
  requireAuth = true,
  showLoading = false 
}) {
  const { role, loading, isAuthenticated } = useAuth();

  // Show loading state if requested
  if (loading && showLoading) {
    return <div>Loading...</div>;
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return fallback;
  }

  // If no roles specified, just check authentication requirement
  if (allowedRoles.length === 0) {
    return requireAuth ? (isAuthenticated ? children : fallback) : children;
  }

  // Check if current role is in allowed roles
  const hasPermission = allowedRoles.includes(role);

  return hasPermission ? children : fallback;
}