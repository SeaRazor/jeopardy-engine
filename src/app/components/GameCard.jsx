'use client';

import { useState, useEffect } from 'react';
import { FaCalendarAlt, FaMapMarkerAlt, FaMicrophone, FaUsers, FaTrophy, FaMedal, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import Card from '../UI/Card/Card';
import styles from './GameCard.module.css';

export default function GameCard({ game, stage, showActions = false, onEdit, onDelete }) {
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
  const [isSaving, setIsSaving] = useState(false);
  
  // Update local state when prop changes
  useEffect(() => {
    setCurrentGame(game);
  }, [game]);
  
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

          // Sort by points descending, then by extraResult as tiebreaker
          gameParticipants.sort((a, b) => {
            // Primary sort: points (higher is better)
            if (b.points !== a.points) {
              return b.points - a.points;
            }
            
            // Secondary sort: extraResult as tiebreaker
            // If extraResult is numeric (like +1, -2), sort numerically
            // Otherwise sort alphabetically
            const aExtra = a.extraResult || '';
            const bExtra = b.extraResult || '';
            
            // Try to parse as numbers
            const aNum = parseFloat(aExtra);
            const bNum = parseFloat(bExtra);
            
            if (!isNaN(aNum) && !isNaN(bNum)) {
              return bNum - aNum; // Higher numeric extraResult wins
            }
            
            // Fall back to string comparison
            return aExtra.localeCompare(bExtra);
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

  // Fetch tournament participants for editing (all stages)
  useEffect(() => {
    if (isEditing) {
      fetch(`/api/tournaments/${currentGame.tournamentId}`)
        .then(res => res.json())
        .then(tournamentData => {
          setAvailablePlayers(tournamentData.participants || []);
        })
        .catch(err => console.error('Error fetching tournament participants:', err));
    }
  }, [isEditing, currentGame.tournamentId]);

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
          extraResult: ""
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
      alert(`Максимальное количество игроков в игре: ${maxPlayers}`);
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
        extraResult: ""
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
      alert('Ошибка при сохранении изменений');
    } finally {
      setIsSaving(false);
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
            {isFinalStage ? 'Финал' : `Бой ${currentGame.gameNumber || currentGame.id}`}
          </h4>
          <div className={styles.accordionSummary}>
            <span className={styles.accordionLocation}>{currentGame.gamePlace}</span>
            <span className={styles.accordionParticipants}>
              {players.length} игроков
            </span>
          </div>
        </div>
        <div className={styles.accordionToggle}>
          {isExpanded ? <FaArrowUp /> : <FaArrowDown />}
        </div>
      </div>

      {/* Desktop Card Title */}
      <div className={styles.desktopCardTitle}>
        <h4>{isFinalStage ? 'Финал' : `Бой ${currentGame.gameNumber || currentGame.id}`}</h4>
      </div>

      {/* Expandable Content */}
      <div className={`${styles.accordionContent} ${isExpanded ? styles.contentExpanded : styles.contentCollapsed}`}>

      {/* Game Header */}
      <div className={styles.header}>
        <div className={styles.gameInfo}>
          {!isEditing ? (
            <>
              <div className={styles.dateTime}>
                <FaCalendarAlt className={styles.icon} />
                <span>{formatDate(currentGame.gameDate)}</span>
              </div>
              <div className={styles.location}>
                <FaMapMarkerAlt className={styles.icon} />
                <span>{currentGame.gamePlace}</span>
              </div>
            </>
          ) : (
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
            </div>
          )}
        </div>
        {showActions && !isEditing && (
          <div className={styles.actions}>
            <button onClick={handleEditClick} className={styles.editButton}>
              Редактировать
            </button>
          </div>
        )}
        {isEditing && (
          <div className={styles.actions}>
            <button onClick={handleSave} disabled={isSaving} className={styles.saveButton}>
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button onClick={handleCancelEdit} className={styles.cancelButton}>
              Отмена
            </button>
          </div>
        )}
      </div>

      {/* Presenter Info */}
      {!isEditing && presenter && (
        <div className={styles.presenter}>
          <FaMicrophone className={styles.icon} />
          <span className={styles.presenterName}>
            {presenter.firstName} {presenter.lastName}
          </span>
        </div>
      )}
      {isEditing && (
        <div className={styles.presenter}>
          <FaMicrophone className={styles.icon} />
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
      )}

      {/* Participants */}
      <div className={styles.participants}>
        <div className={styles.participantsHeader}>
          <FaUsers className={styles.icon} />
          <span>Участники ({isEditing ? editForm.participants.length : players.length})</span>
        </div>
        
        {!isEditing && (
          <div className={styles.participantsList}>
            {players.map((participant, index) => {
              // Determine bracket type based on stage and gameWinnersNum
              let participantClass = styles.participant;
              
              if (!isFinalStage) {
                // Non-final stage: add border colors
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
                  </div>
                  <div className={styles.participantScore}>
                    <span className={styles.points}>
                      {participant.points}
                      {participant.extraResult && (
                        <span className={styles.extraResultInline}>({participant.extraResult})</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
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
                    {availablePlayers.map(player => (
                      <option key={player.id} value={player.id}>
                        {getPlayerName(player)}
                      </option>
                    ))}
                  </select>
                </div>
              ))
            ) : (
              // Participants exist: Points and extraResult editing for ALL stages
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
                          min="0"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Доп. результат:</label>
                        <input
                          type="text"
                          value={participant.extraResult || ''}
                          onChange={(e) => handleParticipantUpdate(index, 'extraResult', e.target.value)}
                          className={styles.extraInput}
                          placeholder="Например: +1, -2"
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
                            {availablePlayers.filter(player => 
                              !editForm.participants.some(p => p.playerId === player.id) &&
                              !currentGame.participants?.some(p => p.playerId === player.id)
                            ).map(player => (
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
    </Card>
  );
}