'use client';

import { FaUsers, FaTrophy, FaInfoCircle } from 'react-icons/fa';
import styles from './StageTab.module.css';

const StageTab = ({ stage, stageIndex, tournament }) => {
  if (!stage) {
    return (
      <div className={styles.container}>
        <div className={styles.errorMessage}>
          <FaInfoCircle className={styles.errorIcon} />
          <p>Информация о стадии недоступна</p>
        </div>
      </div>
    );
  }

  // Calculate total participants and promoted
  const totalParticipants = (stage.topGameParticipantsNum || 0) + (stage.bottomGameParticipantsNum || 0);
  const totalPromoted = (stage.topGameWinnersNum || 0) + (stage.bottomGameWinnersNum || 0);

  return (
    <div className={styles.container}>
      <div className={styles.stageInfo}>
        <div className={styles.details}>
          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              <FaInfoCircle className={styles.detailIcon} />
              <strong>Описание:</strong>
            </div>
            <div className={styles.detailValue}>
              {stage.description}
            </div>
          </div>
          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              <FaUsers className={styles.detailIcon} />
              <strong>Участников:</strong>
            </div>
            <div className={styles.detailValue}>
              {totalParticipants}
            </div>
          </div>
          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              <FaTrophy className={styles.detailIcon} />
              <strong>Проходят далее:</strong>
            </div>
            <div className={styles.detailValue}>
              {totalPromoted}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StageTab;