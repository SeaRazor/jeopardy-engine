'use client';

import { useState } from 'react';
import Modal from '../UI/Modal';
import styles from './AddPresenterForm.module.css';

export default function AddPresenterModal({ isOpen, onClose, onAddPresenter }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('All fields are required.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    onAddPresenter({ firstName, lastName, email });
    setFirstName('');
    setLastName('');
    setEmail('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Add New Presenter</h2>
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
      <div className={styles.formGroup}>
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
