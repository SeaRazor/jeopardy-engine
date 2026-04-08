'use client';

import { FaTrash } from 'react-icons/fa';
import Card from '../../UI/Card/Card';
import styles from './TeamCard.module.css';
import { generateColorFromString } from '../../util/color';

const TeamCard = ({ team, onDelete }) => {
  const avatarColor = generateColorFromString(team.id);

  return (
    <Card className={styles.card}>
      <div className={styles.body}>
        <div className={styles.topRow}>
          <span className={styles.typeLabel}>Команда</span>
          <button
            className={styles.deleteButton}
            onClick={onDelete}
            title="Удалить команду"
            aria-label="Удалить команду"
          >
            <FaTrash />
          </button>
        </div>
        <div className={styles.content}>
          <div className={styles.avatar} style={{ backgroundColor: avatarColor }}>
            {team.name.substring(0, 2).toUpperCase()}
          </div>
          <h3 className={styles.name}>{team.name}</h3>
        </div>
      </div>
    </Card>
  );
};

export default TeamCard;
