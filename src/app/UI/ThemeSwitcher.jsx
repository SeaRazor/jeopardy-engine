'use client';

import { useTheme } from '../util/ThemeContext';
import { MdLightMode, MdDarkMode } from 'react-icons/md';
import styles from './ThemeSwitcher.module.css';

export default function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme} className={styles.switcherButton}>
      {theme === 'light' ? <MdDarkMode size={24} /> : <MdLightMode size={24} />}
    </button>
  );
}
