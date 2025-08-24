import { FaTrash } from 'react-icons/fa';
import styles from './Users.module.css';

const UserCard = ({ user, onDelete }) => {

  const getRoleClass = (role) => {
    switch (role) {
      case 'systemAdmin':
        return styles.systemAdmin;
      case 'tournamentAdmin':
        return styles.tournamentAdmin;
      case 'presenter':
        return styles.presenter;
      default:
        return styles.presenter;
    }
  };

  const formatRoleName = (role) => {
    switch (role) {
      case 'systemAdmin':
        return 'Администратор';
      case 'tournamentAdmin':
        return 'Организатор турнира';
      case 'presenter':
        return 'Ведущий';
      default:
        return role;
    }
  };

  const getInitials = (name) => {
    const words = name.split(' ');
    if (words.length >= 2) {
      return words[0][0] + words[1][0];
    }
    return words[0][0] + (words[0][1] || '');
  };

  return (
    <div className={styles.card}>
      {user.role && (
        <div className={`${styles.roleLabel} ${getRoleClass(user.role)}`}>
          {formatRoleName(user.role)}
        </div>
      )}
      <div className={styles.cardContent}>
        <div className={styles.avatar} style={{ backgroundColor: user.color }}>
          {getInitials(user.name)}
        </div>
        <div className={styles.cardName}>
          {user.name}
          <div className={styles.email}>{user.email}</div>
        </div>
      </div>
      <div className={styles.cardActions}>
        <FaTrash className={styles.deleteIcon} onClick={onDelete} />
      </div>
    </div>
  );
};

export default UserCard;