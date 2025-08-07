'use client';

import { useState } from 'react';
import { FaUsers, FaTrophy, FaMedal, FaGamepad, FaChevronRight, FaStar } from 'react-icons/fa';
import styles from './TournamentTabs.module.css';

const TournamentTabs = ({ tournament, onTabChange, activeTab }) => {
  const tabs = [
    { id: 'participants', label: 'Участники', icon: <FaUsers /> },
    { id: 'bracket', label: 'Сетка', icon: <FaTrophy /> },
    { id: 'results', label: 'Результаты', icon: <FaMedal /> },
  ];

  // Add stage tabs based on tournament schema
  if (tournament?.schema?.stages) {
    tournament.schema.stages.forEach((stage, index) => {
      tabs.splice(1 + index, 0, {
        id: `stage-${index}`,
        label: stage.name || `Стадия ${index + 1}`,
        icon: <span className={`${styles.stageNumber} ${styles[`stageNumber${index}`]}`}>{index + 1}</span>
      });
    });
  }

  return (
    <div className={styles.tabsContainer}>
      <div className={styles.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          >
            <span className={styles.icon}>{tab.icon}</span>
            <span className={styles.label}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TournamentTabs;