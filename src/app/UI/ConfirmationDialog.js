'use client';

import { FaCheck, FaTimes } from 'react-icons/fa';
import Modal from './Modal';
import styles from './ConfirmationDialog.module.css';

export default function ConfirmationDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Подтверждение",
  message, 
  confirmText = "Подтвердить", 
  cancelText = "Отмена" 
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className={styles.content}>
        <p>{message}</p>
        <div className={styles.actions}>
          <button onClick={onClose} className={styles.cancelButton} title={cancelText}>
            <FaTimes /> <span className={styles.buttonText}>{cancelText}</span>
          </button>
          <button onClick={onConfirm} className={styles.confirmButton} title={confirmText}>
            <FaCheck /> <span className={styles.buttonText}>{confirmText}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
