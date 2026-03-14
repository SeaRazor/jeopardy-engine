'use client';

import { useAuth } from '../../hooks/useAuth';

/**
 * ConditionalRender - Flexible permission wrapper with custom condition logic
 * 
 * @param {Function} condition - Function that receives (user, role, isAuthenticated) and returns boolean
 * @param {React.ReactNode} children - Content to show when condition is true
 * @param {React.ReactNode} fallback - Content to show when condition is false
 * @param {boolean} showLoading - Whether to show loading state
 */
export default function ConditionalRender({ 
  condition, 
  children, 
fallback = null,
  showLoading = false 
}) {
  const { user, role, isAuthenticated, loading } = useAuth();

  // Show loading state if requested
  if (loading && showLoading) {
    return <div>Loading...</div>;
  }

  // Evaluate custom condition
  let shouldShow = false;
  try {
    shouldShow = typeof condition === 'function' 
      ? condition(user, role, isAuthenticated)
      : Boolean(condition);
  } catch (error) {
    console.error('ConditionalRender condition error:', error);
    shouldShow = false;
  }

  return shouldShow ? children : fallback;
}