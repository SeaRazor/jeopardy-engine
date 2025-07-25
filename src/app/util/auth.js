// Auth utility functions (stubbed for now)

// Check if user is authenticated
const isAuthenticated = () => {
  // For now, just check if user data exists in localStorage
  return !!localStorage.getItem('user');
};

// Get current user data
const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Login function (stub)
const login = async (email, password) => {
  // In a real app, this would make an API call to your backend
  console.log('Login attempt with:', { email });
  
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const user = {
        id: '1',
        email: email,
        name: email.split('@')[0],
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=random`
      };
      localStorage.setItem('user', JSON.stringify(user));
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
      const user = {
        id: '1',
        email: email,
        name: name,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
      };
      localStorage.setItem('user', JSON.stringify(user));
      resolve(user);
    }, 500);
  });
};

// Logout function
const logout = () => {
  localStorage.removeItem('user');
  return true;
};

export { isAuthenticated, getCurrentUser, login, signup, logout };
