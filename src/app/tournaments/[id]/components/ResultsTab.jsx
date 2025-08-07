'use client';

import { useState } from 'react';
import { FaMedal, FaTrophy, FaAward } from 'react-icons/fa';
import styles from './ResultsTab.module.css';

const ResultsTab = ({ tournament }) => {
  // Mock results data - in real app this would come from tournament state
  const [results, setResults] = useState([
    { place: 1, participant: { name: 'Команда А' }, points: 150, matches: { won: 5, lost: 0 } },
    { place: 2, participant: { name: 'Команда Б' }, points: 120, matches: { won: 4, lost: 1 } },
    { place: 3, participant: { name: 'Команда В' }, points: 100, matches: { won: 3, lost: 2 } },
    { place: 4, participant: { name: 'Команда Г' }, points: 80, matches: { won: 2, lost: 3 } },
  ]);

  const getParticipantName = (participant) => {
    if (participant.isManual) return participant.name;
    if (participant.name) return participant.name; // team
    return `${participant.firstName} ${participant.lastName}`; // person
  };

  const getPlaceIcon = (place) => {
    switch (place) {
      case 1: return <FaTrophy className={styles.goldIcon} />;
      case 2: return <FaMedal className={styles.silverIcon} />;
      case 3: return <FaAward className={styles.bronzeIcon} />;
      default: return <span className={styles.placeNumber}>{place}</span>;
    }
  };

  const getPlaceClass = (place) => {
    switch (place) {
      case 1: return styles.firstPlace;
      case 2: return styles.secondPlace;
      case 3: return styles.thirdPlace;
      default: return '';
    }
  };

  if (!tournament) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h3>Результаты турнира</h3>
          <p>Турнир еще не завершен</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Результаты турнира</h3>
        <div className={styles.tournamentInfo}>
          <p><strong>Турнир:</strong> {tournament.name}</p>
          <p><strong>Тип:</strong> {tournament.type}</p>
          <p><strong>Схема:</strong> {tournament.schema?.schemeName}</p>
          <p><strong>Статус:</strong> <span className={styles.status}>Завершен</span></p>
        </div>
      </div>

      <div className={styles.podium}>
        <div className={styles.podiumItem}>
          <div className={`${styles.podiumPlace} ${styles.second}`}>
            <div className={styles.podiumIcon}>
              <FaMedal className={styles.silverIcon} />
            </div>
            <div className={styles.podiumInfo}>
              <h4>{getParticipantName(results[1]?.participant) || 'TBD'}</h4>
              <p>{results[1]?.points || 0} очков</p>
            </div>
          </div>
          <div className={styles.podiumBar}>2</div>
        </div>

        <div className={styles.podiumItem}>
          <div className={`${styles.podiumPlace} ${styles.first}`}>
            <div className={styles.podiumIcon}>
              <FaTrophy className={styles.goldIcon} />
            </div>
            <div className={styles.podiumInfo}>
              <h4>{getParticipantName(results[0]?.participant) || 'TBD'}</h4>
              <p>{results[0]?.points || 0} очков</p>
            </div>
          </div>
          <div className={styles.podiumBar}>1</div>
        </div>

        <div className={styles.podiumItem}>
          <div className={`${styles.podiumPlace} ${styles.third}`}>
            <div className={styles.podiumIcon}>
              <FaAward className={styles.bronzeIcon} />
            </div>
            <div className={styles.podiumInfo}>
              <h4>{getParticipantName(results[2]?.participant) || 'TBD'}</h4>
              <p>{results[2]?.points || 0} очков</p>
            </div>
          </div>
          <div className={styles.podiumBar}>3</div>
        </div>
      </div>

      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <h4>Полная таблица результатов</h4>
        </div>
        <div className={styles.tableContent}>
          <div className={styles.tableRow}>
            <div className={styles.tableCell}><strong>Место</strong></div>
            <div className={styles.tableCell}><strong>Участник</strong></div>
            <div className={styles.tableCell}><strong>Очки</strong></div>
            <div className={styles.tableCell}><strong>Матчи</strong></div>
            <div className={styles.tableCell}><strong>Процент побед</strong></div>
          </div>
          {results.map((result, index) => (
            <div key={index} className={`${styles.tableRow} ${getPlaceClass(result.place)}`}>
              <div className={styles.tableCell}>
                <div className={styles.place}>
                  {getPlaceIcon(result.place)}
                </div>
              </div>
              <div className={styles.tableCell}>
                <strong>{getParticipantName(result.participant)}</strong>
              </div>
              <div className={styles.tableCell}>
                <span className={styles.points}>{result.points}</span>
              </div>
              <div className={styles.tableCell}>
                <span className={styles.matches}>
                  {result.matches.won}W - {result.matches.lost}L
                </span>
              </div>
              <div className={styles.tableCell}>
                <span className={styles.winRate}>
                  {Math.round((result.matches.won / (result.matches.won + result.matches.lost)) * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResultsTab;