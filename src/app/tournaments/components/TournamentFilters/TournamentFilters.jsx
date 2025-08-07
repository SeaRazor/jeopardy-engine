'use client';

import { FaBroom } from 'react-icons/fa';
import styles from './TournamentFilters.module.css';

export default function TournamentFilters({ filters, onFilterChange, onClear }) {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onFilterChange(name, value);
  };

  return (
    <div className={styles.filtersContainer}>
      <input
        type="text"
        name="name"
        placeholder="Поиск по названию..."
        value={filters.name}
        onChange={handleInputChange}
        className={styles.input}
      />
      <select
        name="type"
        value={filters.type}
        onChange={handleInputChange}
        className={styles.select}
      >
        <option value="">Все типы</option>
        <option value="Своя игра">Своя игра</option>
        <option value="Эрудит-Квартет">Эрудит-Квартет</option>
      </select>
      <select
        name="status"
        value={filters.status}
        onChange={handleInputChange}
        className={styles.select}
      >
        <option value="">Все статусы</option>
        <option value="Планируется">Планируется</option>
        <option value="Идет">Идет</option>
        <option value="Закончен">Закончен</option>
      </select>
      <button onClick={onClear} className={styles.clearButton} title="Очистить все">
        <FaBroom /> <span className={styles.buttonText}>Очистить все</span>
      </button>
    </div>
  );
}