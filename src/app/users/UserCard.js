'use client';

import { FaTrash } from 'react-icons/fa';
import Card from '../UI/Card/Card';
import styles from './UserCard.module.css';

const roleColors = {
  systemAdmin: '#dc2626',
  tournamentAdmin: '#f97316',
  presenter: '#10b981',
};

const formatRoleName = (role) => {
  switch (role) {
    case 'systemAdmin': return 'Администратор';
    case 'tournamentAdmin': return 'Организатор';
    case 'presenter': return 'Ведущий';
    default: return role;
  }
};

const getInitials = (name) => {
  const words = name.split(' ');
  if (words.length >= 2) return words[0][0] + words[1][0];
  return words[0][0] + (words[0][1] || '');
};

const UserCard = ({ user, onDelete }) => {
  const accentColor = roleColors[user.role] ?? 'var(--primary-color)';

  return (
    <Card className={styles.card} style={{ '--accent-color': accentColor }}>
      <div className={styles.body}>
        <div className={styles.topRow}>
          {user.role && (
            <span className={styles.typeLabel}>{formatRoleName(user.role)}</span>
          )}
          <button
            className={styles.deleteButton}
            onClick={onDelete}
            title="Удалить пользователя"
            aria-label="Удалить пользователя"
          >
            <FaTrash />
          </button>
        </div>
        <div className={styles.content}>
          <div className={styles.avatar} style={{ backgroundColor: user.color || accentColor }}>
            {getInitials(user.name)}
          </div>
          <div className={styles.info}>
            <h3 className={styles.name}>{user.name}</h3>
            <span className={styles.email}>{user.email}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UserCard;
