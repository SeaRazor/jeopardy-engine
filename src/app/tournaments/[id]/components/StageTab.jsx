'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaUsers, FaTrophy, FaInfoCircle, FaFilter, FaTimes } from 'react-icons/fa';
import GameCard from '../../../components/GameCard';
import { getPlayerManagementState } from '../../../util/playerManagementUtils';
import styles from './StageTab.module.css';

const fetchStageGames = async (tournamentId, stageId) => {
  const res = await fetch(`/api/tournaments/${tournamentId}/stages/${stageId}/games`);
  if (!res.ok) throw new Error('Failed to fetch stage games');
  return res.json();
};

const StageTab = ({ stage, stageIndex, tournament }) => {
  // Filtering state
  const [filters, setFilters] = useState({
    bracketType: 'all', // 'all', 'upper', 'lower'
    status: 'all' // 'all', 'ongoing', 'completed'
  });

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
  const allGames = gamesData.sort((a, b) => {
    if (a.stageOrder && b.stageOrder) {
      return a.stageOrder - b.stageOrder;
    }
    return (a.gameNumber || a.id) - (b.gameNumber || b.id);
  });

  // Helper function to check if game is completed
  const isGameCompleted = (game) => {
    if (!game.participants || game.participants.length === 0) return false;
    if (game.completed === true) return true;
    
    const allResolved = game.participants.every(p => p.resolved || !p.sourceReference);
    const hasResults = game.participants.some(p => p.points !== 0 || p.extraResult);
    
    return allResolved && hasResults;
  };

  // Apply filters to games
  const filteredGames = allGames.filter(game => {
    // Bracket type filter
    if (filters.bracketType !== 'all') {
      if (filters.bracketType === 'upper' && game.bracketType !== 'upper') return false;
      if (filters.bracketType === 'lower' && game.bracketType !== 'lower') return false;
    }

    // Status filter
    if (filters.status !== 'all') {
      const completed = isGameCompleted(game);
      if (filters.status === 'completed' && !completed) return false;
      if (filters.status === 'ongoing' && completed) return false;
    }

    return true;
  });

  const games = filteredGames;

  // Filter functions
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const clearFilters = () => {
    setFilters({ bracketType: 'all', status: 'all' });
  };

  const hasActiveFilters = filters.bracketType !== 'all' || filters.status !== 'all';

  // Calculate total participants and promoted
  const totalParticipants = (stage.topGameParticipantsNum || 0) + (stage.bottomGameParticipantsNum || 0);
  const totalPromoted = (stage.topGameWinnersNum || 0) + (stage.bottomGameWinnersNum || 0);
  
  // Calculate bracket game counts for double elimination tournaments
  const getGameCounts = () => {
    if (tournament?.schema?.schemeName !== 'Double Elimination') return null;
    
    const upperGames = allGames.filter(game => game.bracketType === 'upper').length;
    const lowerGames = allGames.filter(game => game.bracketType === 'lower').length;
    const filteredUpperGames = games.filter(game => game.bracketType === 'upper').length;
    const filteredLowerGames = games.filter(game => game.bracketType === 'lower').length;
    
    return { 
      upperGames, 
      lowerGames, 
      filteredUpperGames, 
      filteredLowerGames,
      isFiltered: hasActiveFilters
    };
  };
  
  const bracketGameCounts = getGameCounts();

  // Get player management permissions for this stage
  const playerManagementState = getPlayerManagementState(tournament, stage.order);

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
          <div className={styles.gamesCount}>
            {gamesLoading ? (
              'Загрузка...'
            ) : bracketGameCounts ? (
              <div className={styles.bracketInfo}>
                {bracketGameCounts.upperGames > 0 && (
                  <span className={styles.upperCount}>
                    верхняя сетка: {bracketGameCounts.isFiltered ? bracketGameCounts.filteredUpperGames : bracketGameCounts.upperGames} 
                    {bracketGameCounts.isFiltered && ` из ${bracketGameCounts.upperGames}`} боев
                  </span>
                )}
                {bracketGameCounts.lowerGames > 0 && (
                  <span className={styles.lowerCount}>
                    нижняя сетка: {bracketGameCounts.isFiltered ? bracketGameCounts.filteredLowerGames : bracketGameCounts.lowerGames}
                    {bracketGameCounts.isFiltered && ` из ${bracketGameCounts.lowerGames}`} боев
                  </span>
                )}
              </div>
            ) : (
              `${hasActiveFilters ? `${games.length} из ${allGames.length}` : games.length} боев`
            )}
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filtersSection}>
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <FaFilter className={styles.filterIcon} />
              <span className={styles.filterLabel}>Фильтры:</span>
            </div>
            
            {tournament?.schema?.schemeName === 'Double Elimination' && (
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Сетка:</label>
                <select 
                  value={filters.bracketType} 
                  onChange={(e) => handleFilterChange('bracketType', e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="all">Все</option>
                  <option value="upper">Верхняя</option>
                  <option value="lower">Нижняя</option>
                </select>
              </div>
            )}
            
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Статус:</label>
              <select 
                value={filters.status} 
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">Все</option>
                <option value="ongoing">Идут</option>
                <option value="completed">Завершены</option>
              </select>
            </div>
            
            {hasActiveFilters && (
              <button 
                onClick={clearFilters} 
                className={styles.clearFiltersButton}
                title="Очистить фильтры"
              >
                <FaTimes />
                <span>Очистить</span>
              </button>
            )}
          </div>
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
                stage={stage}
                showActions={true}
                onEdit={(game) => console.log('Edit game:', game)}
                playerManagementState={playerManagementState}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StageTab;