import { FaTrash } from 'react-icons/fa';
import styles from '../Players.module.css';
import { generateColorFromString } from '../../util/color';

const PersonCard = ({ person, onDelete }) => {
  const avatarColor = generateColorFromString(person.id);

  return (
    <div className={styles.card}>
      <div className={styles.avatar} style={{ backgroundColor: avatarColor }}>
        {person.firstName[0]}{person.lastName[0]}
      </div>
      <div className={styles.cardName}>
        {person.firstName[0]}. {person.lastName}
      </div>
      <FaTrash className={styles.deleteIcon} onClick={onDelete} />
    </div>
  );
};

export default PersonCard;
