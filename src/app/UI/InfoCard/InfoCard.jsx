'use client';

import { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import styles from './InfoCard.module.css';

export default function InfoCard({ title, items = [], children, defaultCollapsed = false, className }) {
  const [expanded, setExpanded] = useState(!defaultCollapsed);

  return (
    <div className={`${styles.card} ${className || ''}`}>
      <button
        className={styles.toggle}
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        <h2 className={styles.title}>{title}</h2>
        <FaChevronDown className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`} />
      </button>

      <div className={`${styles.strip} ${expanded ? styles.stripOpen : styles.stripClosed}`}>
        {items.map((item, i) => (
          <div
            key={i}
            className={`${styles.item} ${item.statusVariant ? styles[item.statusVariant] : ''}`}
          >
            <div className={styles.iconBox} style={item.iconBoxStyle}>
              <item.icon className={styles.icon} style={item.iconStyle} />
            </div>
            <div className={styles.text}>
              <span className={styles.label}>{item.label}</span>
              <span className={styles.value}>{item.value}</span>
            </div>
          </div>
        ))}
        {children}
      </div>
    </div>
  );
}
