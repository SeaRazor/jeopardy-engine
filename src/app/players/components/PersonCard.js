import { FaTrash } from 'react-icons/fa';
import styles from '../Players.module.css';

const PersonCard = ({ person, onDelete }) => {
  return (
    <div className={styles.card}>
      <div className={styles.avatar} style={{ backgroundColor: person.color }}>
        {person.firstName[0]}{person.lastName[0]}
      </div>
      <div className={styles.cardName}>
        {person.firstName} {person.lastName}
      </div>
      <FaTrash className={styles.deleteIcon} onClick={onDelete} />
    </div>
  );
};

export default PersonCard;
