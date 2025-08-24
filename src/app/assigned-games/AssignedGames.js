'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import styles from './AssignedGames.module.css';

const fetchAssignedGames = async (tournamentFilter = 'all', presenterFilter = '') => {
  const params = new URLSearchParams();
  if (tournamentFilter !== 'all') params.append('tournament', tournamentFilter);
  if (presenterFilter.trim()) params.append('presenter', presenterFilter.trim());
  
  const url = `/api/assigned-games?${params.toString()}`;
  const res = await fetch(url);
  return res.json();
};

const fetchTournaments = async () => {
  const res = await fetch('/api/tournaments');
  return res.json();
};

export default function AssignedGames() {
  const [tournamentFilter, setTournamentFilter] = useState('all');
  const [presenterFilter, setPresenterFilter] = useState('');

  const { data: tournaments = [] } = useQuery({
    queryKey: ['tournaments'],
    queryFn: fetchTournaments
  });

  const { data: assignedGames = [], isLoading } = useQuery({
    queryKey: ['assigned-games', tournamentFilter, presenterFilter],
    queryFn: () => fetchAssignedGames(tournamentFilter, presenterFilter)
  });

  const getInitials = (name) => {
    if (!name) return '';
    const words = name.split(' ');
    if (words.length >= 2) {
      return words[0][0] + words[1][0];
    }
    return words[0][0] + (words[0][1] || '');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Поиск по ведущему..."
          value={presenterFilter}
          onChange={(e) => setPresenterFilter(e.target.value)}
          className={styles.input}
        />
        <select
          value={tournamentFilter}
          onChange={(e) => setTournamentFilter(e.target.value)}
          className={styles.select}
        >
          <option value="all">Все турниры</option>
          {tournaments.map((tournament) => (
            <option key={tournament.id} value={tournament.id}>
              {tournament.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p>Загрузка...</p>
      ) : (
        <div className={styles.tableContainer}>
          {assignedGames.length === 0 ? (
            <div className={styles.noGames}>
              Нет игр с назначенными ведущими
            </div>
          ) : (
            <table className={styles.table}>
              <thead className={styles.tableHeader}>
                <tr>
                  <th>Дата</th>
                  <th>Турнир</th>
                  <th>Место</th>
                  <th>Игра</th>
                  <th>Ведущий</th>
                </tr>
              </thead>
              <tbody>
                {assignedGames.map((game) => (
                  <tr key={game.id} className={styles.tableRow}>
                    <td className={`${styles.tableCell} ${styles.dateCell}`}>
                      {formatDate(game.gameDate)}
                    </td>
                    <td className={styles.tableCell}>
                      {game.tournamentName}
                    </td>
                    <td className={styles.tableCell}>
                      {game.gamePlace || 'TBD'}
                    </td>
                    <td className={styles.tableCell}>
                      <Link 
                        href={`/tournaments/${game.tournamentId}/stages/${game.stageId}/games/${game.id}`}
                        className={styles.gameLink}
                      >
                        Игра #{game.id}
                      </Link>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.presenterInfo}>
                        <div 
                          className={styles.presenterAvatar}
                          style={{ backgroundColor: game.presenterColor }}
                        >
                          {getInitials(game.presenterName)}
                        </div>
                        <div className={styles.presenterDetails}>
                          <span className={styles.presenterName}>
                            {game.presenterName}
                          </span>
                          <span className={styles.presenterEmail}>
                            {game.presenterEmail}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}