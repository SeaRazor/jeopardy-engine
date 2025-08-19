'use client';

import { useState, useEffect, useRef } from 'react';
import { FaCalendarAlt, FaMapMarkerAlt, FaMicrophone, FaUsers, FaTrophy, FaMedal, FaArrowUp, FaArrowDown, FaEllipsisV, FaEdit, FaCheck, FaPlay, FaLink, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import Card from '../UI/Card/Card';
import ConfirmationDialog from '../UI/ConfirmationDialog';
import { getReferenceDisplayText, needsResolution, parsePlayerReference, getPositionText } from '../util/referenceSystem';
import { useToast } from '../util/ToastContext';
import styles from './GameCard.module.css';

export default function GameCard({ game, stage, showActions = false, onEdit, onDelete, playerManagementState, tournamentData = null, allTournamentGames = [] }) {
  const { showError, showSuccess } = useToast();
  const [presenter, setPresenter] = useState(null);
  const [players, setPlayers] = useState([]);
  const [currentGame, setCurrentGame] = useState(game);
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editForm, setEditForm] = useState({
    gamePlace: game.gamePlace || '',
    gameDate: game.gameDate || '',
    presenterId: game.presenterId || '',
    participants: game.participants || []
  });
  const [availablePresenters, setAvailablePresenters] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  // Tournament data now comes from props instead of state
  const [isSaving, setIsSaving] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false);
  const [isFinishingGame, setIsFinishingGame] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const menuRef = useRef(null);
  const desktopMenuRef = useRef(null);

  
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
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if ((menuRef.current && !menuRef.current.contains(event.target)) &&
          (desktopMenuRef.current && !desktopMenuRef.current.contains(event.target))) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Determine tournament type and final status
  const isDoubleElimination = currentGame.tournamentType === 'DoubleElimination';
  const isOlympic = currentGame.tournamentType === 'Olympic';
  const isFinalStage = stage?.isFinal === true;

  // Fetch presenter data
  useEffect(() => {
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

  // Fetch available presenters for editing
  useEffect(() => {
    if (isEditing) {
      fetch('/api/presenters')
        .then(res => res.json())
        .then(setAvailablePresenters)
        .catch(err => console.error('Error fetching presenters:', err));
    }
  }, [isEditing]);

  // Fetch available players only when editing
  useEffect(() => {
    if (isEditing && tournamentData) {
      setAvailablePlayers(tournamentData.participants || []);
    }
  }, [isEditing, tournamentData]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  // Get players that are already assigned to other games in the same stage
  const getPlayersInOtherGames = () => {
    const playersInOtherGames = new Set();
    
    allTournamentGames.forEach(otherGame => {
      // Skip current game being edited
      if (otherGame.id === currentGame.id) return;
      
      // Add all players from other games to the set
      if (otherGame.participants) {
        otherGame.participants.forEach(participant => {
          if (participant.playerId && participant.resolved !== false) {
            playersInOtherGames.add(participant.playerId);
          }
        });
      }
    });
    
    return playersInOtherGames;
  };

  // Get available players filtering out those already in other games
  const getFilteredAvailablePlayers = () => {
    const playersInOtherGames = getPlayersInOtherGames();
    
    return availablePlayers.filter(player => {
      // Exclude players already assigned to other games
      if (playersInOtherGames.has(player.id)) return false;
      
      // Exclude players already selected in current form (to avoid duplicates)
      const alreadyInCurrentGame = editForm.participants.some(p => p.playerId === player.id) ||
                                    currentGame.participants?.some(p => p.playerId === player.id);
      
      return !alreadyInCurrentGame;
    });
  };

  // Get available players for stage 1 dropdowns (more permissive - allows current game players)
  const getFilteredPlayersForStage1 = (currentIndex) => {
    const playersInOtherGames = getPlayersInOtherGames();
    
    return availablePlayers.filter(player => {
      // Exclude players already assigned to other games
      if (playersInOtherGames.has(player.id)) return false;
      
      // Allow players already in current game OR current selection, but exclude duplicates within the form
      const alreadySelectedInForm = editForm.participants.some((p, index) => 
        index !== currentIndex && p.playerId === player.id
      );
      
      return !alreadySelectedInForm;
    });
  };

  const handleEditClick = () => {
    // Convert ISO date to datetime-local format for the input
    let localDateTimeString = '';
    if (currentGame.gameDate) {
      const date = new Date(currentGame.gameDate);
      // Convert to YYYY-MM-DDTHH:MM format for datetime-local input
      localDateTimeString = date.getFullYear() + '-' + 
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0') + 'T' +
        String(date.getHours()).padStart(2, '0') + ':' +
        String(date.getMinutes()).padStart(2, '0');
    }

    setEditForm({
      gamePlace: currentGame.gamePlace || '',
      gameDate: localDateTimeString,
      presenterId: currentGame.presenterId || '',
      participants: currentGame.participants || []
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      gamePlace: currentGame.gamePlace || '',
      gameDate: currentGame.gameDate || '',
      presenterId: currentGame.presenterId || '',
      participants: currentGame.participants || []
    });
  };

  const handleFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePlayerSelect = (playerId, index) => {
    setEditForm(prev => {
      const newParticipants = [...prev.participants];
      if (playerId) {
        newParticipants[index] = {
          playerId: playerId,
          points: 0,
          tieBreakResult: 0
        };
      } else {
        newParticipants.splice(index, 1);
      }
      return {
        ...prev,
        participants: newParticipants
      };
    });
  };

  const handleParticipantUpdate = (index, field, value) => {
    setEditForm(prev => {
      // Use current participants if editForm.participants is empty
      const currentParticipants = prev.participants.length > 0 ? prev.participants : currentGame.participants || [];
      const newParticipants = [...currentParticipants];
      
      if (newParticipants[index]) {
        newParticipants[index] = {
          ...newParticipants[index],
          [field]: value
        };
      }
      return {
        ...prev,
        participants: newParticipants
      };
    });
  };

  const handleRemoveParticipant = (index) => {
    setEditForm(prev => {
      // Use current participants if editForm.participants is empty
      const currentParticipants = prev.participants.length > 0 ? prev.participants : currentGame.participants || [];
      const newParticipants = [...currentParticipants];
      newParticipants.splice(index, 1); // Remove participant at index
      return {
        ...prev,
        participants: newParticipants
      };
    });
  };

  const handleAddPlayer = (playerId) => {
    if (!playerId) return;
    
    // Check player limit
    const maxPlayers = stage?.numberOfPlayers || 4;
    const currentParticipants = editForm.participants.length > 0 ? editForm.participants : currentGame.participants || [];
    
    if (currentParticipants.length >= maxPlayers) {
      showError(`Максимальное количество игроков в игре: ${maxPlayers}`);
      return;
    }
    
    setEditForm(prev => {
      // Use current participants if editForm.participants is empty
      const currentParticipants = prev.participants.length > 0 ? prev.participants : currentGame.participants || [];
      const newParticipants = [...currentParticipants];
      
      // Add new participant
      newParticipants.push({
        playerId: playerId,
        points: 0,
        tieBreakResult: 0
      });
      
      return {
        ...prev,
        participants: newParticipants
      };
    });
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleMenuItemClick = (action) => {
    setIsMenuOpen(false);
    
    switch (action) {
      case 'edit':
        if (gameCompleted) {
          showError('Игра завершена. Редактирование недоступно.');
          return;
        }
        if (playerManagementState && !playerManagementState.canEdit) {
          showError(playerManagementState.restrictionReason || 'Редактирование недоступно');
          return;
        }
        handleEditClick();
        break;
      case 'finish':
        if (gameCompleted) {
          showError('Игра уже завершена');
          return;
        }
        setIsFinishDialogOpen(true);
        break;
      case 'play':
        // TODO: Implement play functionality
        console.log('Play game:', currentGame.id);
        break;
      default:
        break;
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Handle date to preserve local timezone
      let gameDate = currentGame.gameDate;
      if (editForm.gameDate) {
        // datetime-local gives us YYYY-MM-DDTHH:MM format
        // We want to store this exact time, treating it as the user's intended local time
        // Add timezone offset to make sure the stored UTC time represents the same local time
        const [datePart, timePart] = editForm.gameDate.split('T');
        const [year, month, day] = datePart.split('-');
        const [hour, minute] = timePart.split(':');
        
        // Create date object with explicit local components
        const localDate = new Date(
          parseInt(year), 
          parseInt(month) - 1, // Month is 0-indexed
          parseInt(day), 
          parseInt(hour), 
          parseInt(minute)
        );
        gameDate = localDate.toISOString();
      }

      const updatedGameData = {
        ...currentGame,
        gamePlace: editForm.gamePlace,
        gameDate: gameDate,
        presenterId: parseInt(editForm.presenterId) || null,
        participants: editForm.participants.length > 0 ? editForm.participants : currentGame.participants || []
      };

      const response = await fetch(`/api/tournaments/${currentGame.tournamentId}/stages/${currentGame.stageId}/games/${currentGame.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedGameData),
      });

      if (!response.ok) {
        throw new Error('Failed to update game');
      }

      const updatedGame = await response.json();
      
      // Update local state with the saved data
      setCurrentGame(updatedGame);
      
      // Exit edit mode and show success
      setIsEditing(false);
      
      // Trigger a refresh of parent component data if needed
      if (typeof window !== 'undefined') {
        // Dispatch a custom event to notify parent components
        window.dispatchEvent(new CustomEvent('gameUpdated', { 
          detail: { gameId: currentGame.id, updatedData: updatedGame } 
        }));
      }
    } catch (error) {
      console.error('Error saving game:', error);
      showError('Ошибка при сохранении изменений');
    } finally {
      setIsSaving(false);
    }
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

      // Call API to finish the game and resolve dependent references
      const response = await fetch(`/api/tournaments/${currentGame.tournamentId}/stages/${currentGame.stageId}/games/${currentGame.id}/finish`, {
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
        finishedAt: result.finishedAt
      });
      setGameCompleted(true);
      
      // Show success message with resolution info
      let successMessage = 'Игра завершена успешно!';
      if (result.resolvedGames && result.resolvedGames > 0) {
        successMessage += ` Автоматически обновлено участников в ${result.resolvedGames} играх следующих стадий.`;
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
            <a 
              href={`/tournaments/${currentGame.tournamentId}/stages/${currentGame.stageId}/games/${currentGame.id}`} 
              className={styles.gameNameLink}
              onClick={(e) => e.stopPropagation()}
            >
              {isFinalStage ? 'Финал' : `Бой ${currentGame.gameNumber || currentGame.id}`}
            </a>
          </h4>
          <div className={styles.accordionSummary}>
            <span className={styles.accordionLocation}>{currentGame.gamePlace}</span>
            <span className={styles.accordionParticipants}>
              {players.length} игроков
            </span>
          </div>
        </div>
        <div className={styles.accordionHeaderActions}>
          {showActions && !isEditing && (
            gameCompleted ? (
              <div className={styles.completionIndicator}>
                <FaCheck />
              </div>
            ) : (
              <div className={styles.menuContainer} ref={menuRef} onClick={(e) => e.stopPropagation()}>
                <button onClick={toggleMenu} className={styles.menuButton}>
                  <FaEllipsisV />
                </button>
                {isMenuOpen && (
                  <div className={styles.popupMenu}>
                    <button 
                      className={`${styles.menuItem} ${(playerManagementState && !playerManagementState.canEdit) ? styles.menuItemDisabled : ''}`}
                      onClick={() => handleMenuItemClick('edit')}
                      disabled={playerManagementState && !playerManagementState.canEdit}
                      title={playerManagementState && !playerManagementState.canEdit ? playerManagementState.restrictionReason : undefined}
                    >
                      <FaEdit className={styles.menuIcon} />
                      <span>Редактировать</span>
                    </button>
                    <button 
                      className={styles.menuItem}
                      onClick={() => handleMenuItemClick('finish')}
                      title="Завершить игру и перевести участников в следующие стадии"
                    >
                      <FaCheck className={styles.menuIcon} />
                      <span>Закончить</span>
                    </button>
                  </div>
                )}
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
            <a 
              href={`/tournaments/${currentGame.tournamentId}/stages/${currentGame.stageId}/games/${currentGame.id}`} 
              className={styles.gameNameLink}
            >
              {isFinalStage ? 'Финал' : `Бой ${currentGame.gameNumber || currentGame.id}`}
            </a>
          </h4>
          {showActions && !isEditing && (
            gameCompleted ? (
              <div className={styles.completionIndicator}>
                <FaCheck />
              </div>
            ) : (
              <div className={styles.menuContainer} ref={desktopMenuRef}>
                <button onClick={toggleMenu} className={styles.menuButton}>
                  <FaEllipsisV />
                </button>
                {isMenuOpen && (
                  <div className={styles.popupMenu}>
                    <button 
                      className={`${styles.menuItem} ${(playerManagementState && !playerManagementState.canEdit) ? styles.menuItemDisabled : ''}`}
                      onClick={() => handleMenuItemClick('edit')}
                      disabled={playerManagementState && !playerManagementState.canEdit}
                      title={playerManagementState && !playerManagementState.canEdit ? playerManagementState.restrictionReason : undefined}
                    >
                      <FaEdit className={styles.menuIcon} />
                      <span>Редактировать</span>
                    </button>
                    <button 
                      className={styles.menuItem}
                      onClick={() => handleMenuItemClick('finish')}
                      title="Завершить игру и перевести участников в следующие стадии"
                    >
                      <FaCheck className={styles.menuIcon} />
                      <span>Закончить</span>
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* Expandable Content */}
      <div className={`${styles.accordionContent} ${isExpanded ? styles.contentExpanded : styles.contentCollapsed}`}>

      {/* Game Info Section - Compact */}
      <div className={styles.gameInfoSection}>
        {!isEditing ? (
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
        ) : (
          <div className={styles.editSection}>
            <div className={styles.editForm}>
              <div className={styles.formGroup}>
                <label>Место проведения:</label>
                <input
                  type="text"
                  value={editForm.gamePlace}
                  onChange={(e) => handleFormChange('gamePlace', e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Дата и время:</label>
                <input
                  type="datetime-local"
                  value={editForm.gameDate}
                  onChange={(e) => handleFormChange('gameDate', e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Ведущий:</label>
                <select
                  value={editForm.presenterId}
                  onChange={(e) => handleFormChange('presenterId', e.target.value)}
                  className={styles.select}
                >
                  <option value="">Выберите ведущего</option>
                  {availablePresenters.map(presenter => (
                    <option key={presenter.id} value={presenter.id}>
                      {presenter.firstName} {presenter.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.editActions}>
              <button onClick={handleSave} disabled={isSaving} className={styles.saveButton}>
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button onClick={handleCancelEdit} className={styles.cancelButton}>
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Participants */}
      <div className={styles.participants}>
        
        {!isEditing && (
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
              
              return (
                <div key={participant.playerId} className={participantClass}>
                  <div className={styles.participantRank}>
                    {isFinalStage ? (
                      <>
                        {getRankIcon(index)}
                        <span className={styles.rankNumber}>{index + 1}</span>
                      </>
                    ) : (
                      <span className={styles.rankNumber}>{index + 1}</span>
                    )}
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
                      {participant.tieBreakResult !== null && (
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
        )}

        {isEditing && (
          <div className={styles.participantsEdit}>
            {/* Show participant selection only if no participants exist yet */}
            {(editForm.participants.length === 0 && !currentGame.participants?.length) ? (
              // No participants: Player selection for stage 1
              stage?.order === 1 && Array.from({ length: stage?.numberOfPlayers || 4 }, (_, index) => (
                <div key={index} className={styles.formGroup}>
                  <label>Игрок {index + 1}:</label>
                  <select
                    value={editForm.participants[index]?.playerId || ''}
                    onChange={(e) => handlePlayerSelect(e.target.value, index)}
                    className={styles.select}
                  >
                    <option value="">Выберите игрока</option>
                    {getFilteredPlayersForStage1(index).map(player => (
                      <option key={player.id} value={player.id}>
                        {getPlayerName(player)}
                      </option>
                    ))}
                  </select>
                </div>
              ))
            ) : (
              // Participants exist: Points and tieBreakResult editing for ALL stages
              <>
                {(editForm.participants.length > 0 ? editForm.participants : currentGame.participants || []).map((participant, index) => (
                  <div key={participant.playerId || index} className={styles.participantEditRow}>
                    <div className={styles.participantEditInfo}>
                      <span className={styles.editParticipantName}>
                        {(() => {
                          // First try to find in players array (has playerInfo)
                          const playerWithInfo = players.find(p => p.playerId === participant.playerId);
                          if (playerWithInfo?.playerInfo) {
                            return getPlayerName(playerWithInfo.playerInfo);
                          }
                          
                          // Fallback: try to find in availablePlayers array (direct player data)
                          const directPlayer = availablePlayers.find(p => p.id === participant.playerId);
                          if (directPlayer) {
                            return getPlayerName(directPlayer);
                          }
                          
                          return 'Игрок не найден';
                        })()}
                      </span>
                    </div>
                    <div className={styles.participantEditControls}>
                      <div className={styles.formGroup}>
                        <label>Очки:</label>
                        <input
                          type="number"
                          value={participant.points || 0}
                          onChange={(e) => handleParticipantUpdate(index, 'points', parseInt(e.target.value) || 0)}
                          className={styles.pointsInput}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Доп. результат:</label>
                        <input
                          type="number"
                          value={participant.tieBreakResult || 0}
                          onChange={(e) => handleParticipantUpdate(index, 'tieBreakResult', parseInt(e.target.value) || 0)}
                          className={styles.extraInput}
                          placeholder="Доп. очки (может быть отрицательным)"
                        />
                      </div>
                      <div className={styles.removeParticipantContainer}>
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(index)}
                          className={styles.removeParticipantButton}
                          title="Убрать игрока"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Add Player Section */}
                {(() => {
                  const maxPlayers = stage?.numberOfPlayers || 4;
                  const currentParticipants = editForm.participants.length > 0 ? editForm.participants : currentGame.participants || [];
                  const canAddPlayer = currentParticipants.length < maxPlayers;
                  
                  return (
                    <div className={styles.addPlayerSection}>
                      <label className={styles.addPlayerLabel}>
                        Добавить игрока ({currentParticipants.length}/{maxPlayers}):
                      </label>
                      <div className={styles.addPlayerControls}>
                        {canAddPlayer ? (
                          <select
                            value=""
                            onChange={(e) => handleAddPlayer(e.target.value)}
                            className={styles.select}
                          >
                            <option value="">Выберите игрока...</option>
                            {getFilteredAvailablePlayers().map(player => (
                              <option key={player.id} value={player.id}>
                                {getPlayerName(player)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className={styles.maxPlayersReached}>
                            Максимальное количество игроков достигнуто
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {isEditing && stage?.order !== 1 && editForm.participants.length === 0 && !currentGame.participants?.length && (
          <div className={styles.noParticipants}>
            <p>Участники будут добавлены автоматически по результатам предыдущих игр</p>
          </div>
        )}
      </div>
      
      </div> {/* End accordionContent */}

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