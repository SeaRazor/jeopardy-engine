// Auth utility functions (stubbed for now)

// Check if user is authenticated
const isAuthenticated = () => {
  // For now, just check if user data exists in localStorage
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('user');
};

// Get current user data
const getCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Get user role based on email (hardcoded for now)
const getRoleByEmail = (email) => {
  switch (email.toLowerCase()) {
    case 'admin@jeopardy.com':
    case 'system@jeopardy.com':
      return 'systemAdmin';
    case 'tournament@jeopardy.com':
    case 'tournament.manager@jeopardy.com':
      return 'tournamentAdmin';
    case 'presenter@jeopardy.com':
    case 'alex.trebek@jeopardy.com':
    case 'mayim.bialik@jeopardy.com':
      return 'presenter';
    default:
      return 'guest';
  }
};

// Login function (stub)
const login = async (email, password) => {
  // In a real app, this would make an API call to your backend
  console.log('Login attempt with:', { email });
  
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const role = getRoleByEmail(email);
      const user = {
        id: Date.now().toString(),
        email: email,
        name: email.split('@')[0],
        role: role
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user));
      }
      resolve(user);
    }, 500);
  });
};

// Signup function (stub)
const signup = async (email, password, name) => {
  // In a real app, this would make an API call to your backend
  console.log('Signup attempt with:', { email, name });
  
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const role = getRoleByEmail(email);
      const user = {
        id: Date.now().toString(),
        email: email,
        name: name,
        role: role
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user));
      }
      resolve(user);
    }, 500);
  });
};

// Logout function
const logout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
  }
  return true;
};

// Get current user role
const getUserRole = () => {
  const user = getCurrentUser();
  return user?.role || 'guest';
};

// Check if user has specific role
const hasRole = (role) => {
  return getUserRole() === role;
};

// Check if user has any of the specified roles
const hasAnyRole = (roles) => {
  const currentRole = getUserRole();
  return roles.includes(currentRole);
};

// Role hierarchy check (higher roles include lower role permissions)
const hasMinimumRole = (minimumRole) => {
  const currentRole = getUserRole();
  const roleHierarchy = ['guest', 'presenter', 'tournamentAdmin', 'systemAdmin'];
  const currentLevel = roleHierarchy.indexOf(currentRole);
  const minimumLevel = roleHierarchy.indexOf(minimumRole);
  return currentLevel >= minimumLevel;
};

export { 
  isAuthenticated, 
  getCurrentUser, 
  login, 
  signup, 
  logout, 
  getUserRole, 
  hasRole, 
  hasAnyRole, 
  hasMinimumRole 
};
