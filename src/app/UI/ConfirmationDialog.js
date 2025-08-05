'use client';

import Modal from './Modal';
import styles from './ConfirmationDialog.module.css';

export default function ConfirmationDialog({ isOpen, onClose, onConfirm, message }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className={styles.content}>
        <p>{message}</p>
        <div className={styles.actions}>
          <button onClick={onClose} className={styles.cancelButton}>
            Cancel
          </button>
          <button onClick={onConfirm} className={styles.confirmButton}>
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}
