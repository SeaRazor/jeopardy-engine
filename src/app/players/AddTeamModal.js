'use client';

import { useState } from 'react';
import Modal from '../UI/Modal';
import styles from './AddPlayerModal.module.css';

export default function AddTeamModal({ isOpen, onClose, onAddTeam }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Team name is required.');
      return;
    }
    onAddTeam({ name });
    setName('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Add New Team</h2>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.formGroup}>
        <label htmlFor="name">Team Name</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
