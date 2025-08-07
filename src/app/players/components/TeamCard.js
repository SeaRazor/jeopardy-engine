import { FaTrash } from 'react-icons/fa';
import styles from '../Players.module.css';
import { generateColorFromString } from '../../util/color';

const TeamCard = ({ team, onDelete }) => {
  const avatarColor = generateColorFromString(team.id);

  return (
    <div className={styles.card}>
      <div className={styles.avatar} style={{ backgroundColor: avatarColor }}>
        {team.name.substring(0, 2).toUpperCase()}
      </div>
      <div className={styles.cardName}>{team.name}</div>
      <FaTrash className={styles.deleteIcon} onClick={onDelete} />
    </div>
  );
};

export default TeamCard;
