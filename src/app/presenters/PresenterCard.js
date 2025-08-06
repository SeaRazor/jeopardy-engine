import { FaTrash } from 'react-icons/fa';
import styles from '../players/Players.module.css';

const PresenterCard = ({ presenter, onDelete }) => {
  return (
    <div className={styles.card}>
      <div className={styles.avatar} style={{ backgroundColor: presenter.color }}>
        {presenter.firstName[0]}{presenter.lastName[0]}
      </div>
      <div className={styles.cardName}>
        {presenter.firstName} {presenter.lastName}
        <div className={styles.email}>{presenter.email}</div>
      </div>
      <FaTrash className={styles.deleteIcon} onClick={onDelete} />
    </div>
  );
};

export default PresenterCard;
