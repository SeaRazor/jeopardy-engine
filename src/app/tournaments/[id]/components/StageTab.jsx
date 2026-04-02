'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { FaUsers, FaTrophy, FaInfoCircle, FaGamepad, FaUserSlash, FaEdit } from 'react-icons/fa';
import InfoCard from '../../../UI/InfoCard/InfoCard';
import GameCard from '../../../components/GameCard';
import { getPlayerManagementState } from '../../../util/playerManagementUtils';
import { getStagePollingInterval, getActiveGamesCount, getCompletedGamesCount } from '../../../util/gamePollingUtils';
import ThemeEditModal from './ThemeEditModal';
import styles from './StageTab.module.css';

const fetchStageGames = async (tournamentId, stageId) => {
  const res = await fetch(`/api/tournaments/${tournamentId}/stages/${stageId}/games`);
  if (!res.ok) throw new Error('Failed to fetch stage games');
  return res.json();
};

const fetchAllTournamentGames = async (tournamentId) => {
  const res = await fetch(`/api/tournaments/${tournamentId}/games`);
  if (!res.ok) throw new Error('Failed to fetch all tournament games');
  return res.json();
};

const StageTab = ({ stage, stageIndex, tournament }) => {

  // Filtering state
  const [filters, setFilters] = useState({
    upper: true,
    lower: true,
    ongoing: true,
    completed: true
  });

  
  // Theme names management
  const [stageThemes, setStageThemes] = useState([]);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  
  // React Query
  const queryClient = useQueryClient();

  // Load stage themes on component mount
  useEffect(() => {
    const loadStageThemes = () => {
      // Initialize with existing themes from stage or default themes
      const defaultThemeCount = stage?.numberOfThemesInGame || 6;
      const existingThemes = stage?.stageThemes || stage?.themes || [];
      
      // Handle both string and object formats
      const themes = Array.from({ length: defaultThemeCount }, (_, index) => {
        const existing = existingThemes[index];
        if (existing) {
          if (typeof existing === 'string') {
            return { name: existing, description: '' };
          }
          return existing;
        }
        return { name: `Тема ${index + 1}`, description: '' };
      });
      
      setStageThemes(themes);
    };

    if (stage) {
      loadStageThemes();
    }
  }, [stage]);

  // Theme management functions
  const saveThemesMutation = useMutation({
    mutationFn: async (themes) => {
      const response = await fetch(`/api/tournaments/${tournament.id}/stages/${stage.id}/themes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ themes }),
      });

      if (!response.ok) {
        throw new Error('Failed to save themes');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate tournament query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['tournament', tournament.id] });
    },
    onError: (error) => {
      console.error('Error saving themes:', error);
      // You might want to show a toast error here
    }
  });

  const handleSaveThemes = (themes) => {
    setStageThemes(themes);
    saveThemesMutation.mutate(themes);
  };

  const handleOpenThemeModal = () => {
    setIsThemeModalOpen(true);
  };

  const handleCloseThemeModal = () => {
    setIsThemeModalOpen(false);
  };

  if (!stage) {
    return (
      <div className={styles.errorMessage}>
        <FaInfoCircle className={styles.errorIcon} />
        <p>Информация о стадии недоступна</p>
      </div>
    );
  }

  // Fetch games for this stage with smart polling
  const { data: gamesData = [], isLoading: gamesLoading, isError: gamesError, isFetching } = useQuery({
    queryKey: ['stage-games', tournament.id, stage.id],
    queryFn: () => fetchStageGames(tournament.id, stage.id),
    refetchInterval: (data) => getStagePollingInterval(data?.data || []),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 3000
  });

  // Fetch all tournament games for reference resolution
  const { data: allTournamentGames = [], isLoading: allGamesLoading } = useQuery({
    queryKey: ['all-tournament-games', tournament.id],
    queryFn: () => fetchAllTournamentGames(tournament.id),
  });

  // Sort games by stageOrder, then by bracket type (upper first), then by gameNumber
  const allGames = gamesData.sort((a, b) => {
    // First, sort by stageOrder if available
    if (a.stageOrder && b.stageOrder && a.stageOrder !== b.stageOrder) {
      return a.stageOrder - b.stageOrder;
    }
    
    // Then sort by bracket type: upper bracket games come first
    const bracketOrderA = a.bracketType === 'upper' ? 0 : a.bracketType === 'lower' ? 1 : 2; // null/final = 2
    const bracketOrderB = b.bracketType === 'upper' ? 0 : b.bracketType === 'lower' ? 1 : 2; // null/final = 2
    
    if (bracketOrderA !== bracketOrderB) {
      return bracketOrderA - bracketOrderB;
    }
    
    // Finally, sort by gameNumber within the same bracket
    return (a.gameNumber || a.id) - (b.gameNumber || b.id);
  });

  // Helper function to check if game is completed
  const isGameCompleted = (game) => {
    if (!game.participants || game.participants.length === 0) return false;
    // Only consider a game completed if it has the explicit completed status
    return game.completed === true || game.status === 'completed';
  };

  // Apply filters to games
  const filteredGames = allGames.filter(game => {
    // Bracket type filter - only apply for Double Elimination tournaments and non-final stages
    if (tournament?.schema?.schemeName === 'Double Elimination' && !stage?.isFinal) {
      const bracketFiltersActive = filters.upper || filters.lower;
      if (!bracketFiltersActive) {
        return false; // No bracket filters active = show no games
      }
      const matchesBracket = (filters.upper && game.bracketType === 'upper') || 
                            (filters.lower && game.bracketType === 'lower');
      if (!matchesBracket) return false;
    }

    // Status filter - if no status filters are active, show no games
    const statusFiltersActive = filters.ongoing || filters.completed;
    if (!statusFiltersActive) {
      return false; // No status filters active = show no games
    }
    const completed = isGameCompleted(game);
    const matchesStatus = (filters.ongoing && !completed) || 
                         (filters.completed && completed);
    if (!matchesStatus) return false;

    return true;
  });

  const games = filteredGames;

  // Filter functions
  const handleFilterToggle = (filterKey) => {
    setFilters(prev => ({ ...prev, [filterKey]: !prev[filterKey] }));
  };

  const clearFilters = () => {
    setFilters({ upper: true, lower: true, ongoing: true, completed: true });
  };


  const hasActiveFilters = filters.upper || filters.lower || filters.ongoing || filters.completed;

  // Calculate participants as number of games × players per game
  const calculateTotalParticipants = () => {
    // Get game counts from stage config (with different field name variations)
    const upperGames = stage.topBracketGameNum || stage.topGamesNum || 0;
    const lowerGames = stage.bottomBracketGamesNum || stage.bottomGamesNum || 0;
    
    // Get players per game from stage config
    const upperPlayersPerGame = stage.topGameParticipantsNum || 4;
    const lowerPlayersPerGame = stage.bottomGameParticipantsNum || 4;
    
    // If we have game counts from config, calculate participants
    if (upperGames > 0 || lowerGames > 0) {
      return (upperGames * upperPlayersPerGame) + (lowerGames * lowerPlayersPerGame);
    }
    
    // Otherwise use loaded games data
    const playersPerGame = upperPlayersPerGame || lowerPlayersPerGame || 4;
    return Math.max(allGames.length * playersPerGame, 0);
  };
  
  const totalParticipants = calculateTotalParticipants();

  const calculatePromoted = () => {
    // For double elimination tournaments, understand bracket flow
    if (tournament?.schema?.schemeName === 'Double Elimination') {
      // First stage typically eliminates no one (everyone continues)
      if (stage.order === 1 || (stage.description && stage.description.toLowerCase().includes('все продолжают'))) {
        return totalParticipants; // Everyone is promoted, just redistributed to brackets
      }
      
      // Check description for elimination patterns
      if (stage.description) {
        const desc = stage.description.toLowerCase();
        if (desc.includes('все продолжают') || desc.includes('никто не вылетает')) {
          return totalParticipants; // Everyone is promoted
        }
      }
      
      // Double elimination logic for ALL stages:
      // - Upper bracket players (if any): ALL continue (winners stay upper, losers drop to lower)
      // - Lower bracket players (if any): only WINNERS continue, losers are eliminated (2nd loss)
      
      const upperParticipants = stage.topGameParticipantsNum || 0;
      const upperWinners = stage.topGameWinnersNum || 0;
      const lowerParticipants = stage.bottomGameParticipantsNum || 0;
      const lowerWinners = stage.bottomGameWinnersNum || 0;
      
      // For stages with actual games, try to count from game data
      if (allGames.length > 0) {
        const upperGames = allGames.filter(game => game.bracketType === 'upper');
        const lowerGames = allGames.filter(game => game.bracketType === 'lower');
        
        if (upperGames.length > 0 || lowerGames.length > 0) {
          // Upper bracket: ALL participants continue (winners + losers)
          let upperTotal = 0;
          upperGames.forEach(game => {
            if (game.participants) {
              upperTotal += game.participants.length;
            }
          });
          
          // Lower bracket: only winners continue
          let lowerWinnersCount = 0;
          lowerGames.forEach(game => {
            if (game.participants) {
              const winnersCount = lowerWinners || stage.gameWinnersNum || Math.max(1, Math.floor(game.participants.length / 2));
              lowerWinnersCount += winnersCount;
            }
          });
          
          return upperTotal + lowerWinnersCount;
        }
      }
      
      // Fallback to stage configuration
      // Handle different stage types:
      // - Stages with both brackets: upperParticipants + lowerWinners  
      // - Upper-only stages: upperWinners
      // - Lower-only stages: lowerWinners
      
      if (upperParticipants > 0 && lowerParticipants > 0) {
        // Both brackets: all upper + lower winners
        return upperParticipants + lowerWinners;
      } else if (upperParticipants > 0) {
        // Upper bracket only: winners advance
        return upperWinners;
      } else if (lowerParticipants > 0) {
        // Lower bracket only: winners advance
        return lowerWinners;
      }
      
      return 0;
    }
    
    // For other tournament types (Olympic, etc.)
    // For stages with game results, count actual winners
    if (allGames.length > 0) {
      let promoted = 0;
      allGames.forEach(game => {
        if (game.participants) {
          const winnersCount = stage.gameWinnersNum || stage.topGameWinnersNum || Math.max(1, Math.floor(game.participants.length / 2));
          promoted += winnersCount;
        }
      });
      return promoted;
    }
    
    // For Olympic and other tournament types, calculate based on stage configuration
    if (tournament?.schema?.schemeName === 'Олимпийская' || tournament?.schema?.schemeName === 'Olympic') {
      // Calculate total games and promoted players
      const participantsPerGame = stage.topGameParticipantsNum || 4;
      const winnersPerGame = stage.topGameWinnersNum || 2;
      
      if (participantsPerGame > 0) {
        const totalGames = Math.ceil(totalParticipants / participantsPerGame);
        return totalGames * winnersPerGame;
      }
    }
    
    return (stage.gameWinnersNum || stage.topGameWinnersNum || 0) * Math.max(1, allGames.length);
  };

  const calculateEliminated = () => {
    // For double elimination tournaments, understand bracket elimination rules for ALL stages
    if (tournament?.schema?.schemeName === 'Double Elimination') {
      // First stage typically eliminates no one (everyone continues)
      if (stage.order === 1 || (stage.description && stage.description.toLowerCase().includes('все продолжают'))) {
        return 0;
      }
      
      // Check description for elimination patterns
      if (stage.description) {
        const desc = stage.description.toLowerCase();
        if (desc.includes('все продолжают') || desc.includes('никто не вылетает')) {
          return 0;
        }
      }
      
      // Double elimination rules for ALL stages:
      // - Upper bracket players NEVER get eliminated (they just drop to lower bracket)
      // - Lower bracket players get eliminated if they lose (2nd loss)
      // - Final stages may have special elimination rules
      
      const upperParticipants = stage.topGameParticipantsNum || 0;
      const lowerParticipants = stage.bottomGameParticipantsNum || 0;
      const lowerWinners = stage.bottomGameWinnersNum || 0;
      
      if (stage.isFinal) {
        // Final stage - calculate based on total participants vs promoted
        const totalPromoted = calculatePromoted();
        return Math.max(0, totalParticipants - totalPromoted);
      }
      
      // For all non-final stages:
      // - Upper bracket: 0 eliminations (players just move to lower bracket)
      // - Lower bracket: participants - winners = eliminated
      
      const eliminated = lowerParticipants - lowerWinners;
      
      // Ensure the number makes sense
      if (eliminated < 0) {
        return 0;
      }
      
      return eliminated;
    }
    
    // For other tournament types, simple calculation
    const totalPromoted = calculatePromoted();
    return Math.max(0, totalParticipants - totalPromoted);
  };

  const totalPromoted = calculatePromoted();
  const totalNotPromoted = calculateEliminated();
  
  // Calculate bracket game counts for double elimination tournaments
  const getGameCounts = () => {
    if (tournament?.schema?.schemeName !== 'Double Elimination') return null;
    
    // Use stage config for game counts to prevent flashing, fall back to actual games
    const upperGames = stage.topBracketGameNum || stage.topGamesNum || allGames.filter(game => game.bracketType === 'upper').length;
    const lowerGames = stage.bottomBracketGamesNum || stage.bottomGamesNum || allGames.filter(game => game.bracketType === 'lower').length;
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
    <>
      <InfoCard
        title={stage.name || `Стадия ${stageIndex + 1}`}
        defaultCollapsed={true}
        className={styles.stageInfoCard}
        items={[
          stage.description && {
            icon: FaInfoCircle,
            label: 'Описание',
            value: stage.description,
          },
          ...(!stage.isFinal ? [
            {
              icon: FaUsers,
              label: 'Участников',
              value: totalParticipants,
            },
            {
              icon: FaGamepad,
              label: 'Игр',
              value: tournament?.schema?.schemeName === 'Double Elimination' && bracketGameCounts
                ? <>
                    {bracketGameCounts.upperGames + bracketGameCounts.lowerGames}
                    {(bracketGameCounts.upperGames > 0 || bracketGameCounts.lowerGames > 0) && (
                      <span className={styles.infoSub}>
                        {bracketGameCounts.upperGames > 0 && <span className={styles.upperBracket}>В: {bracketGameCounts.upperGames}</span>}
                        {bracketGameCounts.lowerGames > 0 && <span className={styles.lowerBracket}>Н: {bracketGameCounts.lowerGames}</span>}
                      </span>
                    )}
                  </>
                : (stage.topBracketGameNum || stage.topGamesNum || 0) + (stage.bottomBracketGamesNum || stage.bottomGamesNum || 0) || allGames.length,
            },
            {
              icon: FaTrophy,
              label: 'Проходят далее',
              value: totalPromoted,
            },
            totalNotPromoted > 0 && {
              icon: FaUserSlash,
              label: 'Выбывают',
              value: totalNotPromoted,
            },
          ] : []),
        ].filter(Boolean)}
      >
        <div className={styles.themesSection}>
          <div className={styles.themesSectionHeader}>
            <span className={styles.themesSectionLabel}>Темы стадии</span>
            <button onClick={handleOpenThemeModal} className={styles.editThemesIconButton} title="Редактировать темы">
              <FaEdit />
            </button>
          </div>
          <div className={styles.themesList}>
            {stageThemes.map((theme, index) => (
              <div key={index} className={styles.themeRow}>
                <span className={styles.themeRowNum}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.themeRowName}>{theme.name || `Тема ${index + 1}`}</span>
                {theme.description && (
                  <span className={styles.themeRowDesc}>{theme.description}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </InfoCard>

      <ThemeEditModal
        isOpen={isThemeModalOpen}
        onClose={handleCloseThemeModal}
        onSave={handleSaveThemes}
        initialThemes={stageThemes}
        maxThemes={stage?.numberOfThemesInGame || 6}
        isSaving={saveThemesMutation.isPending}
      />

      {/* Games Section */}
      <div className={styles.gamesSection}>
        <div className={styles.gamesSectionHeader}>
          <div className={styles.headerMeta}>
            <span className={styles.sectionTitle}>Бои стадии</span>
            {!gamesLoading && (
              <span className={styles.countBadge}>{allGames.length}</span>
            )}
            {!gamesLoading && getActiveGamesCount(allGames) > 0 && (
              <span className={`${styles.liveBadge} ${isFetching ? styles.liveBadgeUpdating : ''}`}>
                <span className={styles.liveDot} />
                {getActiveGamesCount(allGames)} live
              </span>
            )}
          </div>

          <div className={styles.headerFilters}>
            {tournament?.schema?.schemeName === 'Double Elimination' && (
              <div className={styles.filterTags}>
                <button
                  onClick={() => handleFilterToggle('upper')}
                  className={`${styles.filterTag} ${styles.bracketTag} ${styles.upperBracketTag} ${filters.upper ? styles.active : ''}`}
                >
                  Верхняя
                </button>
                <button
                  onClick={() => handleFilterToggle('lower')}
                  className={`${styles.filterTag} ${styles.bracketTag} ${styles.lowerBracketTag} ${filters.lower ? styles.active : ''}`}
                >
                  Нижняя
                </button>
              </div>
            )}
            <div className={styles.filterTags}>
              <button
                onClick={() => handleFilterToggle('ongoing')}
                className={`${styles.filterTag} ${styles.statusTag} ${styles.ongoingTag} ${filters.ongoing ? styles.active : ''}`}
              >
                Идут
              </button>
              <button
                onClick={() => handleFilterToggle('completed')}
                className={`${styles.filterTag} ${styles.statusTag} ${styles.completedTag} ${filters.completed ? styles.active : ''}`}
              >
                Завершены
              </button>
            </div>
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
          <div className={`${styles.gamesGrid} ${games.length === 1 ? styles.finalGameCentered : ''}`}>
            {games.map((game) => (
              <GameCard 
                key={game.id} 
                game={game} 
                stage={stage}
                showActions={true}
                onEdit={(game) => console.log('Edit game:', game)}
                playerManagementState={playerManagementState}
                tournamentData={tournament}
                allTournamentGames={allTournamentGames}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default StageTab;