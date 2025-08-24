'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser, getUserRole, hasRole, hasAnyRole, hasMinimumRole, isAuthenticated } from '../util/auth';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('guest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateAuthState = () => {
      const currentUser = getCurrentUser();
      const currentRole = getUserRole();
      setUser(currentUser);
      setRole(currentRole);
      setLoading(false);
    };

    updateAuthState();

    // Listen for storage changes (login/logout in other tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'user') {
        updateAuthState();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    user,
    role,
    loading,
    isAuthenticated: isAuthenticated(),
    hasRole: (roleToCheck) => hasRole(roleToCheck),
    hasAnyRole: (roles) => hasAnyRole(roles),
    hasMinimumRole: (minimumRole) => hasMinimumRole(minimumRole),
    isGuest: role === 'guest',
    isPresenter: role === 'presenter',
    isTournamentAdmin: role === 'tournamentAdmin',
    isSystemAdmin: role === 'systemAdmin',
  };
}