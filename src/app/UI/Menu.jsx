"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FaTrophy,
  FaUsers,
  FaUsersCog,
  FaGamepad,
  FaSignInAlt,
  FaSignOutAlt
} from 'react-icons/fa';
import { isAuthenticated, getCurrentUser, logout } from '../util/auth';
import ThemeSwitcher from './ThemeSwitcher'; // Import the ThemeSwitcher
import RoleGuard from '../components/auth/RoleGuard';
import styles from './Menu.module.css';

const menuItems = [
  {
    label: 'Турниры',
    href: '/tournaments',
    icon: <FaTrophy className={styles.menuIcon} />
  },
  {
    label: 'Игроки',
    href: '/players',
    icon: <FaUsers className={styles.menuIcon} />
  },
  {
    label: 'Пользователи',
    href: '/users',
    icon: <FaUsersCog className={styles.menuIcon} />
  },
  {
    label: 'Назначенные игры',
    href: '/assigned-games',
    icon: <FaGamepad className={styles.menuIcon} />
  },
];

export default function Menu() {
  const [open, setOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState(null);
  const pathname = usePathname();

  useEffect(() => {
    // Check auth status on component mount and when path changes
    if (isAuthenticated()) {
      setUser(getCurrentUser());
    } else {
      setUser(null);
    }
  }, [pathname]);

  const handleLogout = () => {
    logout();
    setUser(null);
    setOpen(false);
  };

  const handleLoginSuccess = () => {
    setUser(getCurrentUser());
  };

  return (
    <nav className={styles.navbar}>
      <Link href="/" className={styles.logo}>
        <img src="/je_transparent.png" alt="Jeopardy Engine" className={styles.logoImage} />
      </Link>
      <ul className={styles.menuList}>
        {menuItems.map(item => {
          // Define role-based visibility
          let allowedRoles = ['guest', 'presenter', 'tournamentAdmin', 'systemAdmin']; // All roles by default
          
          if (item.href === '/users') {
            allowedRoles = ['systemAdmin']; // Only system admins can access users
          } else if (item.href === '/players') {
            allowedRoles = ['tournamentAdmin', 'systemAdmin']; // Tournament admins and system admins
          } else if (item.href === '/assigned-games') {
            allowedRoles = ['presenter', 'tournamentAdmin', 'systemAdmin']; // No guests
          }

          return (
            <RoleGuard key={item.label} allowedRoles={allowedRoles}>
              <li>
                <Link
                  href={item.href}
                  className={`${styles.menuItem} ${pathname === item.href || (pathname === '/' && item.href === '/tournaments') ? styles.menuItemActive : ''}`}
                >
                  <span className={styles.menuIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            </RoleGuard>
          );
        })}
      </ul>
      <div className={styles.authSection}>
        <ThemeSwitcher /> {/* Add the ThemeSwitcher here */}
        {user ? (
          <div className={styles.userMenu}>
            <div className={styles.userInfo}>
              <img 
                src={user.avatar} 
                alt={user.name} 
                className={styles.avatar}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://ui-avatars.com/api/?name=User&background=random';
                }}
              />
              <span className={styles.userName}>{user.name || user.email}</span>
            </div>
            <button 
              onClick={handleLogout}
              className={styles.logoutButton}
              title="Выйти"
            >
              <FaSignOutAlt className={styles.menuIcon} />
              <span>Выйти</span>
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsModalOpen(true)}
            className={styles.loginButton}
          >
            <FaSignInAlt className={styles.menuIcon} />
            <span>Войти</span>
          </button>
        )}
      </div>
      <button className={styles.hamburger} onClick={() => setOpen(!open)} aria-label="Open menu">
        <span className={styles.bar}></span>
        <span className={styles.bar}></span>
        <span className={styles.bar}></span>
      </button>
      {open && (
        <ul className={styles.mobileMenu}>
          {menuItems.map(item => {
            // Define role-based visibility (same logic as desktop)
            let allowedRoles = ['guest', 'presenter', 'tournamentAdmin', 'systemAdmin']; 
            
            if (item.href === '/users') {
              allowedRoles = ['systemAdmin'];
            } else if (item.href === '/players') {
              allowedRoles = ['tournamentAdmin', 'systemAdmin'];
            } else if (item.href === '/assigned-games') {
              allowedRoles = ['presenter', 'tournamentAdmin', 'systemAdmin'];
            }

            return (
              <RoleGuard key={item.label} allowedRoles={allowedRoles}>
                <li>
                  <Link
                    href={item.href}
                    className={`${styles.menuItem} ${pathname === item.href || (pathname === '/' && item.href === '/tournaments') ? styles.menuItemActive : ''}`}
                    onClick={() => setOpen(false)}
                  >
                    <span className={styles.menuIcon}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              </RoleGuard>
            );
          })}
          {/* Add ThemeSwitcher to mobile menu as well */}
          <li>
            <ThemeSwitcher />
          </li>
          {user ? (
            <li>
              <button 
                onClick={() => {
                  handleLogout();
                  setOpen(false);
                }}
                className={styles.mobileLogout}
              >
                <FaSignOutAlt className={styles.menuIcon} />
                <span>Выйти</span>
              </button>
            </li>
          ) : (
            <li>
              <button 
                onClick={() => {
                  setIsModalOpen(true);
                  setOpen(false);
                }}
                className={styles.mobileLogin}
              >
                <FaSignInAlt className={styles.menuIcon} />
                <span>Войти</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </nav>
  );
}
