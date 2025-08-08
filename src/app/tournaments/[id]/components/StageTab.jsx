'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaUsers, FaTrophy, FaInfoCircle } from 'react-icons/fa';
import GameCard from '../../../components/GameCard';
import styles from './StageTab.module.css';

const fetchStageGames = async (tournamentId, stageId) => {
  const res = await fetch(`/api/tournaments/${tournamentId}/stages/${stageId}/games`);
  if (!res.ok) throw new Error('Failed to fetch stage games');
  return res.json();
};

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

  // Fetch games for this stage
  const { data: gamesData = [], isLoading: gamesLoading, isError: gamesError } = useQuery({
    queryKey: ['stage-games', tournament.id, stage.id],
    queryFn: () => fetchStageGames(tournament.id, stage.id),
  });

  // Sort games by stageOrder and gameNumber for proper display
  const games = gamesData.sort((a, b) => {
    if (a.stageOrder && b.stageOrder) {
      return a.stageOrder - b.stageOrder;
    }
    return (a.gameNumber || a.id) - (b.gameNumber || b.id);
  });

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

      {/* Games Section */}
      <div className={styles.gamesSection}>
        <div className={styles.gamesSectionHeader}>
          <h3>Бои стадии</h3>
          <span className={styles.gamesCount}>
            {gamesLoading ? 'Загрузка...' : `${games.length} боев`}
          </span>
        </div>

        {gamesLoading && (
          <div className={styles.loading}>
            <p>Загрузка боев...</p>
          </div>
        )}

        {gamesError && (
          <div className={styles.error}>
            <FaInfoCircle className={styles.errorIcon} />
            <p>Ошибка загрузки боев</p>
          </div>
        )}

        {!gamesLoading && !gamesError && games.length === 0 && (
          <div className={styles.noGames}>
            <FaInfoCircle className={styles.errorIcon} />
            <p>Нет боев для этой стадии</p>
            <p>Создайте бои на вкладке "Участники"</p>
          </div>
        )}

        {!gamesLoading && !gamesError && games.length > 0 && (
          <div className={styles.gamesGrid}>
            {games.map((game) => (
              <GameCard 
                key={game.id} 
                game={game} 
                showActions={true}
                onEdit={(game) => console.log('Edit game:', game)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StageTab;