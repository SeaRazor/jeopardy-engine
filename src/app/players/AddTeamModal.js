import React, { useState } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';
import styles from './AddPlayerForm.module.css';
import Modal from '../UI/Modal';

const AddTeamModal = ({ isOpen, onClose, onAddTeam }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddTeam({ name, playerType: 'team' });
    setName('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Team">
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <input
            type="text"
            placeholder="Team Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className={styles.actions}>
          <button type="submit" className={styles.addButton} title="Add Team">
            <FaPlus /> <span className={styles.buttonText}>Add Team</span>
          </button>
          <button type="button" onClick={onClose} className={styles.cancelButton} title="Cancel">
            <FaTimes /> <span className={styles.buttonText}>Cancel</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddTeamModal;
