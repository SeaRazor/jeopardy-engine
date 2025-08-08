'use client';

import Toast from './Toast';
import styles from './ToastContainer.module.css';

const ToastContainer = ({ toasts, onRemoveToast }) => {
  return (
    <div className={styles.container}>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={onRemoveToast}
        />
      ))}
    </div>
  );
};

export default ToastContainer;