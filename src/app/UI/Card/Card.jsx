'use client';

import styles from './Card.module.css';

export default function Card({ children, className = '', ...otherProps }) {
  return (
    <div className={`${styles.card} ${className}`} {...otherProps}>
      {children}
    </div>
  );
}
