'use client';

import { FaPlus } from 'react-icons/fa';
import styles from './AddTournamentCard.module.css';

export default function AddTournamentCard({ onClick }) {
  return (
    <button className={styles.card} onClick={onClick} aria-label="Добавить турнир">
      <FaPlus className={styles.icon} />
      <span className={styles.label}>Новый турнир</span>
    </button>
  );
}
