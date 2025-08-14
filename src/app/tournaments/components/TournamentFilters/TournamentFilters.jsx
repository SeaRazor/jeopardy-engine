'use client';

import { useState } from 'react';
import { FaBroom, FaFilter, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import styles from './TournamentFilters.module.css';

export default function TournamentFilters({ filters, onFilterChange, onClear }) {
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onFilterChange(name, value);
  };

  // Count active filters
  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value && value.trim() !== '').length;
  };

  // Get summary text for active filters
  const getFilterSummary = () => {
    const count = getActiveFiltersCount();
    if (count === 0) return 'Все турниры';
    if (count === 1) return '1 фильтр';
    if (count < 5) return `${count} фильтра`;
    return `${count} фильтров`;
  };

  const toggleFilters = () => {
    setIsFilterExpanded(!isFilterExpanded);
  };

  return (
    <div className={styles.filtersWrapper}>
      {/* Desktop filters - always visible */}
      <div className={styles.desktopFilters}>
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
            <option value="1">Своя Игра</option>
            <option value="2">Эрудит-квартет</option>
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
      </div>

      {/* Mobile collapsible filters */}
      <div className={styles.mobileFilters}>
        <div className={styles.compactFilterBar}>
          <div 
            className={styles.filterSummary} 
            onClick={toggleFilters}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && toggleFilters()}
          >
            <FaFilter className={styles.filterIcon} />
            <span className={styles.summaryText}>{getFilterSummary()}</span>
            <div className={styles.chevronContainer}>
              {isFilterExpanded ? <FaChevronUp /> : <FaChevronDown />}
            </div>
          </div>
          
          {isFilterExpanded && (
            <div className={styles.expandedFilters}>
              <div className={styles.mobileFiltersGrid}>
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
                  <option value="1">Своя Игра</option>
                  <option value="2">Эрудит-квартет</option>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}