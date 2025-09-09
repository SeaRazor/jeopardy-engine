/**
 * Permission utilities for role-based access control
 */

// Role hierarchy (higher index = more permissions)
const ROLE_HIERARCHY = ['guest', 'presenter', 'tournamentAdmin', 'systemAdmin'];

// Page access permissions
const PAGE_PERMISSIONS = {
  '/tournaments': ['guest', 'presenter', 'tournamentAdmin', 'systemAdmin'],
  '/players': ['tournamentAdmin', 'systemAdmin'],
  '/users': ['systemAdmin'],
  '/assigned-games': ['presenter', 'tournamentAdmin', 'systemAdmin']
};

// Action permissions
const ACTION_PERMISSIONS = {
  // Tournament actions
  'tournament.create': ['tournamentAdmin', 'systemAdmin'],
  'tournament.edit': ['tournamentAdmin', 'systemAdmin'], 
  'tournament.delete': ['systemAdmin'],
  'tournament.view': ['guest', 'presenter', 'tournamentAdmin', 'systemAdmin'],
  
  // Player actions
  'player.create': ['tournamentAdmin', 'systemAdmin'],
  'player.edit': ['tournamentAdmin', 'systemAdmin'],
  'player.delete': ['tournamentAdmin', 'systemAdmin'],
  'player.view': ['tournamentAdmin', 'systemAdmin'],
  
  // User actions
  'user.create': ['systemAdmin'],
  'user.edit': ['systemAdmin'], 
  'user.delete': ['systemAdmin'],
  'user.view': ['systemAdmin'],
  
  // Game actions
  'game.view': ['guest', 'presenter', 'tournamentAdmin', 'systemAdmin'],
  'game.edit': ['tournamentAdmin', 'systemAdmin'], // General edit permission
  'game.edit.assigned': ['presenter', 'tournamentAdmin', 'systemAdmin'], // Edit assigned games
  'game.create': ['tournamentAdmin', 'systemAdmin'],
  'game.delete': ['tournamentAdmin', 'systemAdmin'],
  'game.assign': ['tournamentAdmin', 'systemAdmin'],
};

/**
 * Check if user can access a specific page
 * @param {string} page - Page path
 * @param {string} role - User role
 * @returns {boolean}
 */
export function canAccessPage(page, role = 'guest') {
  const allowedRoles = PAGE_PERMISSIONS[page];
  if (!allowedRoles) return true; // Allow access to undefined pages
  return allowedRoles.includes(role);
}

/**
 * Check if user can perform a specific action
 * @param {string} action - Action identifier
 * @param {string} role - User role
 * @param {object} context - Additional context (e.g., { isAssigned: true })
 * @returns {boolean}
 */
export function canPerformAction(action, role = 'guest', context = {}) {
  const allowedRoles = ACTION_PERMISSIONS[action];
  if (!allowedRoles) return false; // Deny access to undefined actions
  
  // Special case for game editing - check if user is assigned to the game
  if (action === 'game.edit' && role === 'presenter') {
    return context.isAssigned === true;
  }
  
  return allowedRoles.includes(role);
}

/**
 * Get visible menu items based on user role
 * @param {string} role - User role
 * @returns {string[]} Array of allowed page paths
 */
export function getVisibleMenuItems(role = 'guest') {
  return Object.keys(PAGE_PERMISSIONS).filter(page => 
    canAccessPage(page, role)
  );
}

/**
 * Check if role has minimum permission level
 * @param {string} currentRole - Current user role
 * @param {string} minimumRole - Minimum required role
 * @returns {boolean}
 */
export function hasMinimumRole(currentRole, minimumRole) {
  const currentLevel = ROLE_HIERARCHY.indexOf(currentRole);
  const minimumLevel = ROLE_HIERARCHY.indexOf(minimumRole);
  return currentLevel >= minimumLevel;
}

/**
 * Get role display name
 * @param {string} role - Role identifier
 * @returns {string} Human-readable role name
 */
export function getRoleDisplayName(role) {
  const roleNames = {
    guest: 'Гость',
    presenter: 'Ведущий',
    tournamentAdmin: 'Организатор турнира',
    systemAdmin: 'Администратор'
  };
  return roleNames[role] || role;
}

/**
 * Check if user can edit a specific game
 * @param {string} role - User role
 * @param {object} game - Game object
 * @param {object} user - User object
 * @returns {boolean}
 */
export function canEditGame(role, game, user) {
  // System admin and tournament admin can edit any game
  if (['systemAdmin', 'tournamentAdmin'].includes(role)) {
    return true;
  }
  
  // Presenter can edit only assigned games
  if (role === 'presenter') {
    return game?.presenterId === user?.id;
  }
  
  return false;
}

/**
 * Filter games based on user role and permissions
 * @param {Array} games - Array of game objects
 * @param {string} role - User role
 * @param {object} user - User object
 * @returns {Array} Filtered games array
 */
export function filterGamesByRole(games, role, user) {
  if (!Array.isArray(games)) return [];
  
  // System admin and tournament admin see all games
  if (['systemAdmin', 'tournamentAdmin'].includes(role)) {
    return games;
  }
  
  // Presenter sees only assigned games
  if (role === 'presenter') {
    return games.filter(game => game?.presenterId === user?.id);
  }
  
  // Guests see all games (read-only)
  return games;
}