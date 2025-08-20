'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '../util/ThemeContext';
import { MdLightMode, MdDarkMode } from 'react-icons/md';
import styles from './ThemeSwitcher.module.css';

export default function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder that matches the server render
    return (
      <button className={styles.switcherButton}>
        <MdDarkMode size={24} />
      </button>
    );
  }

  return (
    <button onClick={toggleTheme} className={styles.switcherButton}>
      {theme === 'light' ? <MdDarkMode size={24} /> : <MdLightMode size={24} />}
    </button>
  );
}
