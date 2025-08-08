'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaExclamationTriangle, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';
import styles from './Toast.module.css';

const Toast = ({ id, message, type = 'error', duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300); // Allow time for fade-out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className={styles.icon} />;
      case 'info':
        return <FaInfoCircle className={styles.icon} />;
      case 'error':
      default:
        return <FaExclamationTriangle className={styles.icon} />;
    }
  };

  return (
    <div className={`${styles.toast} ${styles[type]} ${!isVisible ? styles.fadeOut : ''}`}>
      {getIcon()}
      <span className={styles.message}>{message}</span>
      <button
        className={styles.closeButton}
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose(id), 300);
        }}
        aria-label="Close notification"
      >
        <FaTimes />
      </button>
    </div>
  );
};

export default Toast;