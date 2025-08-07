import React, { useState } from 'react';
import styles from './AddPlayerForm.module.css';
import Modal from '../UI/Modal';

const AddPersonModal = ({ isOpen, onClose, onAddPerson }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddPerson({ firstName, lastName, playerType: 'person' });
    setFirstName('');
    setLastName('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Person">
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        <div className={styles.actions}>
          <button type="submit" className={styles.addButton}>Add Person</button>
          <button type="button" onClick={onClose} className={styles.cancelButton}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
};

export default AddPersonModal;
