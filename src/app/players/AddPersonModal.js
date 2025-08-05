'use client';

import { useState } from 'react';
import Modal from '../UI/Modal';
import styles from './AddPlayerModal.module.css';

export default function AddPersonModal({ isOpen, onClose, onAddPerson }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last names are required.');
      return;
    }
    onAddPerson({ firstName, lastName });
    setFirstName('');
    setLastName('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Add New Person</h2>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.formGroup}>
        <label htmlFor="firstName">First Name</label>
        <input
          type="text"
          id="firstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="lastName">Last Name</label>
        <input
          type="text"
          id="lastName"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>
      <div className={styles.actions}>
        <button onClick={onClose} className={styles.cancelButton}>
          Cancel
        </button>
        <button onClick={handleSubmit} className={styles.addButton}>
          Add
        </button>
      </div>
    </Modal>
  );
}
