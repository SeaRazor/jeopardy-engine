'use client';

import { FaCheck, FaTimes } from 'react-icons/fa';
import Modal from './Modal';
import AdaptiveButton from './AdaptiveButton';
import styles from './ConfirmationDialog.module.css';

export default function ConfirmationDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Подтверждение",
  message, 
  confirmText = "Подтвердить", 
  cancelText = "Отмена",
  confirmDisabled = false,
  cancelDisabled = false
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className={styles.content}>
        <p>{message}</p>
        <div className={styles.actions}>
          <AdaptiveButton 
            onClick={onClose} 
            icon={FaTimes} 
            text={cancelText} 
            title={cancelText}
            variant="secondary"
            disabled={cancelDisabled}
          />
          <AdaptiveButton 
            onClick={onConfirm} 
            icon={FaCheck} 
            text={confirmText} 
            title={confirmText}
            variant="primary"
            disabled={confirmDisabled}
          />
        </div>
      </div>
    </Modal>
  );
}
