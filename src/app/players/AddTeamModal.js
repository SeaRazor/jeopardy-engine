import { useState } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';
import styles from './AddPlayerForm.module.css';
import Modal from '../UI/Modal';
import AdaptiveButton from '../UI/AdaptiveButton';

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
          <AdaptiveButton 
            type="submit" 
            icon={FaPlus} 
            text="Add Team" 
            title="Add Team"
            variant="primary"
          />
          <AdaptiveButton 
            type="button" 
            onClick={onClose} 
            icon={FaTimes} 
            text="Cancel" 
            title="Cancel"
            variant="secondary"
          />
        </div>
      </form>
    </Modal>
  );
};

export default AddTeamModal;
