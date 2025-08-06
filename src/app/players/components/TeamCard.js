import { FaTrash } from 'react-icons/fa';
import styles from '../Players.module.css';

const TeamCard = ({ team, onDelete }) => {
  return (
    <div className={styles.card}>
      <div className={styles.avatar} style={{ backgroundColor: team.color }}>
        {team.name.substring(0, 2).toUpperCase()}
      </div>
      <div className={styles.cardName}>{team.name}</div>
      <FaTrash className={styles.deleteIcon} onClick={onDelete} />
    </div>
  );
};

export default TeamCard;
