'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaCalendarAlt, FaMapMarkerAlt, FaMicrophone, FaUsers, FaTrophy, FaMedal, FaArrowUp, FaArrowDown, FaEdit, FaCheck, FaLink, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import GameEditModal from './GameEditModal';
import Card from '../UI/Card/Card';
import ConfirmationDialog from '../UI/ConfirmationDialog';
import { getReferenceDisplayText, needsResolution, parsePlayerReference, getPositionText } from '../util/referenceSystem';
import { useToast } from '../util/ToastContext';
import { isGameActive, isGameCompleted } from '../util/gamePollingUtils';
import styles from './GameCard.module.css';

export default function GameCard({ game, stage, showActions = false, onEdit, onDelete, playerManagementState, tournamentData = null, allTournamentGames = [] }) {
  const { showError, showSuccess } = useToast();
  const [presenter, setPresenter] = useState(null);
  const [players, setPlayers] = useState([]);
  const [currentGame, setCurrentGame] = useState(() => game);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
  const [isFinishingGame, setIsFinishingGame] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);

  
  // Update local state when prop changes
  useEffect(() => {
    setCurrentGame(game);
    setGameCompleted(isGameCompleted(game));
  }, [game]);

  // Check if game is completed
  const isGameCompleted = (gameData) => {
    if (!gameData.participants || gameData.participants.length === 0) {
      return false;
    }
    
    // Only consider a game completed if it has the explicit completed status
    return gameData.completed === true || gameData.status === 'completed';
  };
  
  
  // Determine tournament type and final status
  const isDoubleElimination = currentGame.tournamentType === 'DoubleElimination';
  const isOlympic = currentGame.tournamentType === 'Olympic';
  const isFinalStage = stage?.isFinal === true;

  // Fetch presenter data
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (currentGame.presenterId) {
      fetch('/api/presenters')
        .then(res => res.json())
        .then(presenters => {
          const gamePresenter = presenters.find(p => p.id === currentGame.presenterId);
          setPresenter(gamePresenter);
        })
        .catch(err => console.error('Error fetching presenter:', err));
    }
  }, [currentGame.presenterId]);

  // Fetch player data
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (currentGame.participants?.length > 0) {
      fetch('/api/players')
        .then(res => res.json())
        .then(playersData => {
          const gameParticipants = currentGame.participants.map(participant => {
            const player = playersData.find(p => p.id === participant.playerId);
            return {
              ...participant,
              playerInfo: player
            };
          }).filter(p => p.playerInfo);

          // Sort by points descending, then by tieBreakResult as tiebreaker
          gameParticipants.sort((a, b) => {
            // Primary sort: points (higher is better)
            if (b.points !== a.points) {
              return b.points - a.points;
            }
            
            // Secondary sort: tieBreakResult as tiebreaker
            const aTieBreak = a.tieBreakResult || 0;
            const bTieBreak = b.tieBreakResult || 0;
            
            // tieBreakResult is always a number (higher is better)
            return bTieBreak - aTieBreak;
          });
          
          setPlayers(gameParticipants);
        })
        .catch(err => console.error('Error fetching players:', err));
    }
  }, [currentGame.participants]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    // Use a consistent format that works the same on server and client
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const getRankIcon = (index) => {
    switch (index) {
      case 0: return <FaTrophy className={styles.goldTrophy} />;
      case 1: return <FaMedal className={styles.silverMedal} />;
      case 2: return <FaMedal className={styles.bronzeMedal} />;
      default: return null;
    }
  };

  const getPlayerName = (playerInfo) => {
    // Handle team participants
    if (playerInfo.name) return playerInfo.name;
    
    // Handle person participants
    if (playerInfo.firstName && playerInfo.lastName) {
      return `${playerInfo.firstName} ${playerInfo.lastName}`;
    }
    
    // Handle person participants with only firstName
    if (playerInfo.firstName) return playerInfo.firstName;
    
    // Fallback
    return playerInfo.name || 'Неизвестный участник';
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleEditAction = () => {
    if (gameCompleted) {
      showError('Игра завершена. Редактирование недоступно.');
      return;
    }
    if (playerManagementState && !playerManagementState.canEdit) {
      showError(playerManagementState.restrictionReason || 'Редактирование недоступно');
      return;
    }
    setIsEditModalOpen(true);
  };

  const handleGameSaved = (updatedGame) => {
    setCurrentGame(updatedGame);
  };

  const handleFinishAction = () => {
    if (gameCompleted) {
      showError('Игра уже завершена');
      return;
    }
    setIsFinishDialogOpen(true);
  };

  const handleFinishGame = async () => {
    setIsFinishingGame(true);
    try {
      // Validate that game has results
      if (!currentGame.participants || currentGame.participants.length === 0) {
        showError('Нельзя завершить игру без участников');
        return;
      }

      const hasResults = currentGame.participants.some(p => p.points !== 0 || p.tieBreakResult);
      if (!hasResults) {
        showError('Нельзя завершить игру без результатов. Введите очки хотя бы одному участнику.');
        return;
      }

      // Call API to complete the game and resolve dependent references
      const response = await fetch(`/api/tournaments/${currentGame.tournamentId}/stages/${currentGame.stageId}/games/${currentGame.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: true,
          finishedAt: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to finish game: ${errorData}`);
      }

      const result = await response.json();
      
      // Update local state
      setCurrentGame({
        ...currentGame,
        completed: true,
        finishedAt: result.game?.completedAt || new Date().toISOString()
      });
      setGameCompleted(true);
      
      // Show success message with progression info
      let successMessage = 'Игра завершена успешно!';
      if (result.progression?.success && result.progression.resolvedGames > 0) {
        successMessage += ` Автоматически продвинуто ${result.progression.resolvedReferences} участников в ${result.progression.resolvedGames} играх следующих стадий.`;
      } else if (result.progression?.resolvedReferences > 0) {
        successMessage += ` Автоматически продвинуто ${result.progression.resolvedReferences} участников.`;
      }
      
      showSuccess(successMessage);
      
      // Trigger a refresh of parent component data
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gameCompleted', { 
          detail: { 
            gameId: currentGame.id, 
            stageId: currentGame.stageId,
            tournamentId: currentGame.tournamentId,
            resolvedGames: result.resolvedGames || 0
          } 
        }));
      }
    } catch (error) {
      console.error('Error finishing game:', error);
      showError(`Ошибка при завершении игры: ${error.message}`);
    } finally {
      setIsFinishingGame(false);
      setIsFinishDialogOpen(false);
    }
  };

  return (
    <Card 
      className={`${styles.gameCard} ${isDoubleElimination ? styles.doubleElimCard : ''} ${isExpanded ? styles.expanded : ''}`}
      data-bracket={isDoubleElimination ? currentGame.bracketType : undefined}
    >
      {/* Mobile Accordion Header */}
      <div className={styles.mobileAccordionHeader} onClick={toggleExpanded}>
        <div className={styles.accordionTitleSection}>
          <h4 className={styles.accordionTitle}>
            <Link
              href={`/tournaments/${currentGame.tournamentId}/stages/${currentGame.stageId}/games/${currentGame.id}`}
              className={styles.gameNameLink}
              onClick={(e) => e.stopPropagation()}
            >
              {isFinalStage ? 'Финал' : `Бой ${currentGame.gameNumber || currentGame.id}`}
            </Link>
            {isGameActive(currentGame) && (
              <span className={`${styles.liveBadge} ${styles.active}`}>
                <span className={styles.liveDot}></span>
                LIVE
              </span>
            )}
          </h4>
          <div className={styles.accordionSummary}>
            <span className={styles.accordionLocation}>{currentGame.gamePlace}</span>
            <span className={styles.accordionParticipants}>
              {players.length} игроков
            </span>
          </div>
        </div>
        <div className={styles.accordionHeaderActions}>
          {showActions && (
            gameCompleted ? (
              <div className={styles.completionIndicator}>
                <FaCheck />
              </div>
            ) : (
              <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={handleEditAction}
                  className={styles.cardActionButton}
                  title={playerManagementState && !playerManagementState.canEdit ? playerManagementState.restrictionReason : 'Редактировать'}
                  disabled={playerManagementState && !playerManagementState.canEdit}
                >
                  <FaEdit />
                </button>
                <button
                  onClick={handleFinishAction}
                  className={`${styles.cardActionButton} ${styles.cardActionButtonFinish}`}
                  title="Завершить игру"
                >
                  <FaCheck />
                </button>
              </div>
            )
          )}
          <div className={styles.accordionToggle}>
            {isExpanded ? <FaArrowUp /> : <FaArrowDown />}
          </div>
        </div>
      </div>


      {/* Desktop Card Title */}
      <div className={styles.desktopCardTitle}>
        <div className={styles.desktopTitleContent}>
          <h4>
            <Link
              href={`/tournaments/${currentGame.tournamentId}/stages/${currentGame.stageId}/games/${currentGame.id}`}
              className={styles.gameNameLink}
            >
              {isFinalStage ? 'Финал' : `Бой ${currentGame.gameNumber || currentGame.id}`}
            </Link>
            {isGameActive(currentGame) && (
              <span className={`${styles.liveBadge} ${styles.active}`}>
                <span className={styles.liveDot}></span>
                LIVE
              </span>
            )}
          </h4>
          {showActions && (
            gameCompleted ? (
              <div className={styles.completionIndicator}>
                <FaCheck />
              </div>
            ) : (
              <div className={styles.cardActions}>
                <button
                  onClick={handleEditAction}
                  className={styles.cardActionButton}
                  title={playerManagementState && !playerManagementState.canEdit ? playerManagementState.restrictionReason : 'Редактировать'}
                  disabled={playerManagementState && !playerManagementState.canEdit}
                >
                  <FaEdit />
                </button>
                <button
                  onClick={handleFinishAction}
                  className={`${styles.cardActionButton} ${styles.cardActionButtonFinish}`}
                  title="Завершить игру"
                >
                  <FaCheck />
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* Expandable Content */}
      <div className={`${styles.accordionContent} ${isExpanded ? styles.contentExpanded : styles.contentCollapsed}`}>

      {/* Game Info Section - Compact */}
      <div className={styles.gameInfoSection}>
        <div className={styles.gameInfoInline}>
          <div className={styles.dateTime}>
            <FaCalendarAlt className={styles.icon} />
            <span>{formatDate(currentGame.gameDate)}</span>
          </div>
          <div className={styles.location}>
            <FaMapMarkerAlt className={styles.icon} />
            <span>{currentGame.gamePlace}</span>
          </div>
          {presenter && (
            <div className={styles.presenter}>
              <FaMicrophone className={styles.icon} />
              <span>
                {presenter.firstName} {presenter.lastName}
              </span>
            </div>
          )}
        </div>
      </div>


      {/* Participants */}
      <div className={styles.participants}>
        <div className={styles.participantsList}>
          {/* Show resolved participants */}
          {players.map((participant, index) => {
            // Determine bracket type based on stage and gameWinnersNum
            let participantClass = styles.participant;

            if (!isFinalStage && gameCompleted) {
              // Non-final stage: add border colors only if game is completed
              // Use gameWinnersNum from stage, fallback to half of players, minimum 1
              const winnersCount = stage?.gameWinnersNum || Math.max(1, Math.floor(players.length / 2));
              if (index < winnersCount) {
                participantClass += ` ${styles.participantWinner}`;
              } else {
                participantClass += ` ${styles.participantEliminated}`;
              }
            }

            // Add colored borders for final stage placement (1st, 2nd, 3rd)
            if (isFinalStage && gameCompleted) {
              if (index === 0) {
                participantClass += ` ${styles.participantFirst}`;
              } else if (index === 1) {
                participantClass += ` ${styles.participantSecond}`;
              } else if (index === 2) {
                participantClass += ` ${styles.participantThird}`;
              }
            }

            return (
              <div key={participant.playerId} className={participantClass}>
                <div className={styles.participantRank}>
                  <span className={styles.rankNumber}>{index + 1}</span>
                </div>
                <div className={styles.participantInfo}>
                  <span className={styles.participantName}>
                    {getPlayerName(participant.playerInfo)}
                  </span>
                  {participant.sourceReference && (
                    <span className={styles.participantReference}>
                      <FaLink className={styles.referenceIcon} />
                      {getReferenceDisplayText(participant.sourceReference)}
                    </span>
                  )}
                </div>
                <div className={styles.participantScore}>
                  <span className={styles.points}>
                    {participant.tieBreakResult !== null && participant.tieBreakResult !== "" && (
                      <span className={styles.tieBreakResultInline}>({participant.tieBreakResult}) </span>
                    )}
                    {participant.points}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Show unresolved references */}
          {currentGame.participants?.filter(p => needsResolution(p)).map((participant, index) => (
            <div key={`unresolved-${index}`} className={`${styles.participant} ${styles.participantUnresolved}`}>
              <div className={styles.participantRank}>
                <FaClock className={styles.unresolvedIcon} />
              </div>
              <div className={styles.participantInfo}>
                <span className={styles.participantName}>
                  {getReferenceDisplayText(participant.sourceReference)}
                </span>
                <span className={styles.participantStatus}>
                  <FaExclamationTriangle className={styles.warningIcon} />
                  Ожидает завершения предыдущих игр
                </span>
              </div>
              <div className={styles.participantScore}>
                <span className={styles.points}>—</span>
              </div>
            </div>
          ))}

          {/* Show empty state for games with no participants */}
          {players.length === 0 && (!currentGame.participants || currentGame.participants.filter(p => needsResolution(p)).length === 0) && (
            <div className={styles.noParticipants}>
              <FaUsers className={styles.noParticipantsIcon} />
              <p>Участники не назначены</p>
              {stage?.order === 1 ? (
                <p className={styles.noParticipantsHint}>Добавьте участников в режиме редактирования</p>
              ) : (
                <p className={styles.noParticipantsHint}>Участники будут добавлены автоматически после завершения предыдущих игр</p>
              )}
            </div>
          )}
        </div>
      </div>
      
      </div> {/* End accordionContent */}

      {/* Edit Modal */}
      <GameEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        game={currentGame}
        stage={stage}
        tournamentData={tournamentData}
        allTournamentGames={allTournamentGames}
        onSaved={handleGameSaved}
      />

      {/* Finish Game Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isFinishDialogOpen}
        onClose={() => setIsFinishDialogOpen(false)}
        onConfirm={handleFinishGame}
        title="Завершение игры"
        message={`Вы уверены, что хотите завершить эту игру? После завершения участники будут автоматически переведены в соответствующие игры следующих стадий на основе их мест в турнирной таблице.`}
        confirmText={isFinishingGame ? "Завершение..." : "Завершить игру"}
        cancelText="Отмена"
        isLoading={isFinishingGame}
      />
    </Card>
  );
}