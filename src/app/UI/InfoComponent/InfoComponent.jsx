'use client';

import { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaInfoCircle } from 'react-icons/fa';
import Card from '../Card/Card';
import styles from './InfoComponent.module.css';

export default function InfoComponent({ 
  title = "Информация", 
  icon: Icon = FaInfoCircle,
  headerContent = null,
  children, 
  defaultCollapsed = false,
  className = ""
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <Card className={`${styles.infoCard} ${className}`}>
      <div className={styles.infoHeader} onClick={toggleCollapse}>
        <div className={styles.infoHeaderContent}>
          <Icon className={styles.infoIcon} />
          <h3 className={styles.infoTitle}>{title}</h3>
          {headerContent && (
            <div className={styles.infoHeaderExtra}>
              {headerContent}
            </div>
          )}
        </div>
        <button 
          className={styles.collapseButton}
          aria-label={isCollapsed ? 'Развернуть' : 'Свернуть'}
        >
          {isCollapsed ? <FaChevronDown /> : <FaChevronUp />}
        </button>
      </div>
      
      {!isCollapsed && (
        <div className={styles.infoContent}>
          {children}
        </div>
      )}
    </Card>
  );
}