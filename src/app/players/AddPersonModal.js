import { useState } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';
import styles from './AddPlayerForm.module.css';
import Modal from '../UI/Modal';
import AdaptiveButton from '../UI/AdaptiveButton';

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
          <AdaptiveButton 
            type="submit" 
            icon={FaPlus} 
            text="Add Person" 
            title="Add Person"
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

export default AddPersonModal;
