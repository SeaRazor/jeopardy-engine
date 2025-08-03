'use client';

import Link from 'next/link';
import Card from '../../UI/Card/Card';
import styles from './TournamentCard.module.css';
import { getTournamentStatus, getTypeLabel } from '../../util/tournament';
import { FaUsers } from 'react-icons/fa';

const statusClassMap = {
  'Планируется': styles.planned,
  'Идет': styles.ongoing,
  'Закончен': styles.finished,
};

export default function TournamentCard({ tournament }) {
  const { id, name, startDate, endDate, type, schema, participants } = tournament;
  const status = getTournamentStatus(startDate, endDate);
  const typeLabel = getTypeLabel(type);

  return (
    <Card className={styles.tournamentCard}>
      <div className={styles.header}>
        <h3 className={styles.name}>{name}</h3>
        {type && (
          <div className={`${styles.typeLabel} ${styles[typeLabel]}`}>
            {typeLabel}
          </div>
        )}
      </div>
      <div className={styles.details}>
        <p className={styles.dates}>
          {new Date(startDate).toLocaleDateString('ru-RU')} - {new Date(endDate).toLocaleDateString('ru-RU')}
        </p>
        <span className={`${styles.status} ${statusClassMap[status]}`}>
          {status}
        </span>
      </div>
      <div className={styles.meta}>
        <span className={styles.schema}>{schema}</span>
        <span className={styles.participants}>
          <FaUsers /> {participants}
        </span>
      </div>
      <div className={styles.actions}>
        <Link href={`/tournaments/${id}`} className={styles.detailsButton}>
          Детали
        </Link>
      </div>
    </Card>
  );
}
