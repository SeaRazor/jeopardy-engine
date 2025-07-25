"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FaTrophy,
  FaUsers,
  FaMicrophone,
  FaSignInAlt,
  FaUserCircle,
  FaSignOutAlt
} from 'react-icons/fa';
import LoginModal from './LoginModal/LoginModal';
import { isAuthenticated, getCurrentUser, logout } from '../util/auth';
import styles from './Menu.module.css';

const menuItems = [
  {
    label: 'Tournaments',
    href: '/tournaments',
    icon: <FaTrophy className={styles.menuIcon} />
  },
  {
    label: 'Players',
    href: '/players',
    icon: <FaUsers className={styles.menuIcon} />
  },
  {
    label: 'Presenters',
    href: '/presenters',
    icon: <FaMicrophone className={styles.menuIcon} />
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
        {menuItems.map(item => (
          <li key={item.label}>
            <Link
              href={item.href}
              className={`${styles.menuItem} ${pathname === item.href || (pathname === '/' && item.href === '/tournaments') ? styles.menuItemActive : ''}`}
            >
              <span className={styles.menuIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className={styles.authSection}>
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
              title="Logout"
            >
              <FaSignOutAlt className={styles.menuIcon} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsModalOpen(true)}
            className={styles.loginButton}
          >
            <FaSignInAlt className={styles.menuIcon} />
            <span>Login</span>
          </button>
        )}
      </div>
      <LoginModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
      <button className={styles.hamburger} onClick={() => setOpen(!open)} aria-label="Open menu">
        <span className={styles.bar}></span>
        <span className={styles.bar}></span>
        <span className={styles.bar}></span>
      </button>
      {open && (
        <ul className={styles.mobileMenu}>
          {menuItems.map(item => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`${styles.menuItem} ${pathname === item.href || (pathname === '/' && item.href === '/tournaments') ? styles.menuItemActive : ''}`}
                onClick={() => setOpen(false)}
              >
                <span className={styles.menuIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
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
                <span>Logout</span>
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
                <span>Login</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </nav>
  );
}
