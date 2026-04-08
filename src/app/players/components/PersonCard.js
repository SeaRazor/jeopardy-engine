'use client';

import { FaTrash } from 'react-icons/fa';
import Card from '../../UI/Card/Card';
import styles from './PersonCard.module.css';
import { generateColorFromString } from '../../util/color';

const PersonCard = ({ person, onDelete }) => {
  const avatarColor = generateColorFromString(person.id);

  return (
    <Card className={styles.card}>
      <div className={styles.body}>
        <div className={styles.topRow}>
          <span className={styles.typeLabel}>Игрок</span>
          <button
            className={styles.deleteButton}
            onClick={onDelete}
            title="Удалить игрока"
            aria-label="Удалить игрока"
          >
            <FaTrash />
          </button>
        </div>
        <div className={styles.content}>
          <div className={styles.avatar} style={{ backgroundColor: avatarColor }}>
            {person.firstName[0]}{person.lastName[0]}
          </div>
          <div className={styles.nameBlock}>
            <span className={styles.firstName}>{person.firstName}</span>
            <span className={styles.lastName}>{person.lastName}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PersonCard;
