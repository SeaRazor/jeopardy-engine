'use client';

import React from 'react';
import styles from './AdaptiveButton.module.css';

export default function AdaptiveButton({ 
  icon: Icon, 
  text, 
  title, 
  onClick, 
  variant = 'primary', 
  className = '', 
  type = 'button',
  ...props 
}) {
  const buttonClass = `${styles.adaptiveButton} ${styles[variant]} ${className}`;

  return (
    <button
      type={type}
      onClick={onClick}
      className={buttonClass}
      title={title}
      {...props}
    >
      {Icon && <Icon className={styles.icon} />}
      {text && <span className={styles.text}>{text}</span>}
    </button>
  );
}