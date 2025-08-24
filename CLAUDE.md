# Permissions to run
- Do not run linter
# Apply changes
- apply css changes automatically
- always ask before apply other changes
# Application description
- Application to handle tournaments. 
- Each tournament has schema, participants (persons or teams) and stages
- Stages consist of games. 
- Games consist of themes.
- Theme consists of 5 questions with the value from 10 to 50.
- If player answers correctly, it adds question value to his score. If not correctly, score is decreased.

# Technologies
- NextJs application
- No typescript
- use Tanstack Query
- use pure css only, no UI packages
- use react-icons
- all data changes should be made via api. For the first stage json is used as db. In future PostgreSQL will be used

# Data Management
- Always bear in mind that although now we use local json files as database, they will be replaced by remote postgresql in the future
- Any data interactions must be implemented via API abstraction to make it easier to replace local files with actual db in the future

# UI/UX Guidelines
- any time UI changes are made they should be checked for mobile screens
- all UI elements must be good-looking, modern and UX-friendly.

# Architecture
## Storage
 - Initially local json files
 - Later will be switched to PostgreSQL
## API
 - all data operations (query and manipulation) must be implemented via API
## Authentication/Authorization
 - On the first stage (implementing functional requirements) authorization is not needed
 - On the second stage role-based access functionality to application features must be implemented

## Role-Based Authentication & Authorization 
  │
│                                                                                                                                       │
│ Overview                                                                                                                              │
│                                                                                                                                       │
│ Implement a comprehensive role-based access control system for 4 user types: Guests (no login), Presenters, Tournament Admins, and    │
│ System Admins.                                                                                                                        │
│                                                                                                                                       │
│ 1. Authentication System Updates                                                                                                      │
│                                                                                                                                       │
│ Update auth.js:                                                                                                                       │
│                                                                                                                                       │
│ - Role Determination: Add email-based role mapping in login function                                                                  │
│ - User Object: Include role property in user data                                                                                     │
│ - Role Helper: Add getUserRole() and hasRole() functions                                                                              │
│                                                                                                                                       │
│ Hardcoded Role Mapping (for now):                                                                                                     │
│                                                                                                                                       │
│ // Example email-to-role mapping                                                                                                      │
│ 'admin@jeopardy.com' → 'systemAdmin'                                                                                                  │
│ 'tournament@jeopardy.com' → 'tournamentAdmin'                                                                                         │
│ 'presenter@jeopardy.com' → 'presenter'                                                                                                │
│ // All others → 'guest' (no login required)                                                                                           │
│                                                                                                                                       │
│ 2. Authorization Infrastructure                                                                                                       │
│                                                                                                                                       │
│ Create Authorization Components:                                                                                                      │
│                                                                                                                                       │
│ - RoleGuard: Wrapper component for role-based rendering                                                                               │
│ - ProtectedRoute: Route protection component                                                                                          │
│ - ConditionalRender: Show/hide based on permissions                                                                                   │
│                                                                                                                                       │
│ Create Authorization Hooks:                                                                                                           │
│                                                                                                                                       │
│ - useAuth(): Get current user and role                                                                                                │
│ - usePermissions(): Check specific permissions                                                                                        │
│ - useRoleAccess(): Get access levels for current role                                                                                 │
│                                                                                                                                       │
│ 3. Page Access Control                                                                                                                │
│                                                                                                                                       │
│ Access Matrix Implementation:                                                                                                         │
│                                                                                                                                       │
│ - Guests: Tournaments (read-only), Tournament Details (read-only), Game Details (read-only)                                           │
│ - Presenters: + Assigned Games (own games only)                                                                                       │
│ - Tournament Admins: + Players (read-only), Users (read-only), Assigned Games (all tournament games), Full tournament/game management │
│ - System Admins: Full access to everything                                                                                            │
│                                                                                                                                       │
│ Route Protection:                                                                                                                     │
│                                                                                                                                       │
│ - Protect /users and /players from guests and presenters                                                                              │
│ - Protect /assigned-games from guests                                                                                                 │
│ - Add role checks to all protected pages                                                                                              │
│                                                                                                                                       │
│ 4. UI/UX Conditional Rendering                                                                                                        │
│                                                                                                                                       │
│ Menu System Updates:                                                                                                                  │
│                                                                                                                                       │
│ - Guests: Hide Users, Players, Assigned Games menu items                                                                              │
│ - Presenters: Hide Users, Players menu items                                                                                          │
│ - Tournament Admins: Show all menu items, restrict Users/Players to read-only                                                         │
│ - System Admins: Show all menu items with full access                                                                                 │
│                                                                                                                                       │
│ Control Elements:                                                                                                                     │
│                                                                                                                                       │
│ - Guests: Hide all action buttons (Add, Edit, Delete), show only filters                                                              │
│ - Role-based Actions: Show/hide FAB buttons, edit controls, management features                                                       │
│ - Read-only Mode: Disable forms and buttons for restricted access                                                                     │
│                                                                                                                                       │
│ 5. API Security                                                                                                                       │
│                                                                                                                                       │
│ API Route Protection:                                                                                                                 │
│                                                                                                                                       │
│ - Add role validation middleware to API routes                                                                                        │
│ - Implement role-based data filtering                                                                                                 │
│ - Protect sensitive endpoints (users, players management)                                                                             │
│                                                                                                                                       │
│ Data Filtering:                                                                                                                       │
│                                                                                                                                       │
│ - Assigned Games API: Filter by user role (presenters see only their games)                                                           │
│ - Tournament Data: Apply read-only restrictions where needed                                                                          │
│ - User/Player APIs: Restrict access based on role                                                                                     │
│                                                                                                                                       │
│ 6. Game Assignment Logic                                                                                                              │
│                                                                                                                                       │
│ Presenter-Specific Features:                                                                                                          │
│                                                                                                                                       │
│ - Game Access Control: Check if presenter is assigned to game                                                                         │
│ - Edit Permissions: Full access to assigned games, read-only for others                                                               │
│ - Assigned Games Page: Show only presenter's assigned games                                                                           │
│                                                                                                                                       │
│ Tournament Admin Features:                                                                                                            │
│                                                                                                                                       │
│ - Tournament Management: Full access to tournament games and assignments                                                              │
│ - Presenter Assignment: Ability to assign presenters to games                                                                         │
│ - Game Oversight: View all tournament games with assigned presenters                                                                  │
│                                                                                                                                       │
│ 7. Component-Level Permissions                                                                                                        │
│                                                                                                                                       │
│ Update Existing Components:                                                                                                           │
│                                                                                                                                       │
│ - Tournament Cards: Hide management buttons for guests/presenters                                                                     │
│ - Game Cards: Show edit controls only for authorized users                                                                            │
│ - User/Player Cards: Hide for unauthorized roles                                                                                      │
│ - Form Components: Disable based on permissions                                                                                       │
│                                                                                                                                       │
│ New Permission Components:                                                                                                            │
│                                                                                                                                       │
│ - ReadOnlyWrapper: Convert forms to display-only for restricted users                                                                 │
│ - ActionButton: Conditional action button rendering                                                                                   │
│ - PermissionBoundary: Error boundary for unauthorized access                                                                          │
│                                                                                                                                       │
│ 8. Authentication Flow                                                                                                                │
│                                                                                                                                       │
│ Guest Experience:                                                                                                                     │
│                                                                                                                                       │
│ - No Login Required: Direct access to public pages                                                                                    │
│ - Limited Navigation: Simplified menu with only accessible items                                                                      │
│ - Read-Only Interface: No action buttons or management features                                                                       │
│                                                                                                                                       │
│ Authenticated Users:                                                                                                                  │
│                                                                                                                                       │
│ - Login Required: Redirect to login for protected features                                                                            │
│ - Role-Based Dashboard: Different landing experience per role                                                                         │
│ - Context Persistence: Maintain role context across sessions                                                                          │
│                                                                                                                                       │
│ 9. Testing & Validation                                                                                                               │
│                                                                                                                                       │
│ Role Testing:                                                                                                                         │
│                                                                                                                                       │
│ - Test each role's access permissions                                                                                                 │
│ - Verify UI element visibility/hiding                                                                                                 │
│ - Validate API access restrictions                                                                                                    │
│ - Test route protection effectiveness                                                                                                 │
│                                                                                                                                       │
│ User Experience:                                                                                                                      │
│                                                                                                                                       │
│ - Ensure smooth guest experience                                                                                                      │
│ - Verify role-appropriate functionality                                                                                               │
│ - Test authentication state management                                                                                                │
│ - Validate responsive role-based design                                                                                               │
│                                                                                                                                       │
│ This plan implements a comprehensive role-based access control system while maintaining a smooth user experience for all user types,  │
│ from unauthenticated guests to system administrators.        