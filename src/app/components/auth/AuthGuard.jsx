'use client';

import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * AuthGuard - Controls rendering and navigation based on authentication status
 * 
 * @param {boolean} requireAuth - Whether authentication is required to see content
 * @param {React.ReactNode} children - Content to show when condition is met
 * @param {React.ReactNode} fallback - Content to show when condition is not met
 * @param {string} redirectTo - URL to redirect to if condition is not met
 * @param {boolean} showLoading - Whether to show loading state
 */
export default function AuthGuard({ 
  requireAuth = true, 
  children, 
  fallback = null,
  redirectTo = null,
  showLoading = true 
}) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect during loading
    if (loading) return;

    // Handle redirect logic
    if (redirectTo) {
      if (requireAuth && !isAuthenticated) {
        router.push(redirectTo);
        return;
      }
      if (!requireAuth && isAuthenticated) {
        router.push(redirectTo);
        return;
      }
    }
  }, [isAuthenticated, loading, requireAuth, redirectTo, router]);

  // Show loading state
  if (loading && showLoading) {
    return <div>Loading...</div>;
  }

  // Check authentication requirement
  const shouldShow = requireAuth ? isAuthenticated : !isAuthenticated;

  // If redirecting, don't show anything
  if (redirectTo && !shouldShow) {
    return null;
  }

  return shouldShow ? children : fallback;
}