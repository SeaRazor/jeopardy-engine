'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaPlus, FaTrash, FaRandom, FaSave, FaBroom, FaCheck, FaChevronDown, FaChevronUp, FaGamepad } from 'react-icons/fa';
import Modal from '../../../UI/Modal';
import ConfirmationDialog from '../../../UI/ConfirmationDialog';
import { useToast } from '../../../util/ToastContext';
import { drawTournament } from '../../../util/draw';
import styles from './ParticipantsTab.module.css';

const fetchAvailablePlayers = async (type) => {
  const playerType = type === 'team' ? 'team' : 'person';
  const res = await fetch(`/api/players?type=${playerType}`);
  if (!res.ok) throw new Error('Failed to fetch players');
  return res.json();
};

const calculateGamesForStage = (stage, totalParticipants) => {
  // For Olympic system, calculate based on stage progression
  // Each stage eliminates players, reducing the number of games needed
  const participantsPerGame = stage.topGameParticipantsNum || 4;
  
  // Estimate participants for this stage based on elimination pattern
  // This is a simplified calculation - in real implementation you'd track actual progression
  const stageMultiplier = Math.pow(0.5, stage.order - 1); // Each stage roughly halves participants
  const approximateParticipants = Math.max(4, Math.floor(totalParticipants * stageMultiplier));
  
  return Math.max(1, Math.floor(approximateParticipants / participantsPerGame));
};

const ParticipantsTab = ({ tournament, onUpdateParticipants }) => {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();
  const [seedPools, setSeedPools] = useState([
    { id: 1, name: 'Корзина 1', participants: [], color: 'gold' },
    { id: 2, name: 'Корзина 2', participants: [], color: 'silver' },
    { id: 3, name: 'Корзина 3', participants: [], color: 'bronze' },
    { id: 4, name: 'Корзина 4', participants: [], color: 'blue' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState(null);
  const [manualName, setManualName] = useState('');
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [expandedPools, setExpandedPools] = useState({ 1: true });
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverPool, setDragOverPool] = useState(null);
  const [isCreatingGames, setIsCreatingGames] = useState(false);

  const participantType = tournament?.type === 'Эрудит-квартет' ? 'team' : 'person';
  
  const { data: availablePlayers = [] } = useQuery({
    queryKey: ['players', participantType],
    queryFn: () => fetchAvailablePlayers(participantType),
  });

  // Initialize with tournament participants
  useEffect(() => {
    const pools = [
      { id: 1, name: 'Корзина 1', participants: [], color: 'gold' },
      { id: 2, name: 'Корзина 2', participants: [], color: 'silver' },
      { id: 3, name: 'Корзина 3', participants: [], color: 'bronze' },
      { id: 4, name: 'Корзина 4', participants: [], color: 'blue' },
    ];
    
    if (tournament?.participants?.length > 0) {
      tournament.participants.forEach(participant => {
        // Если у участника есть poolId, помещаем в соответствующую корзину
        if (participant.poolId) {
          const pool = pools.find(p => p.id === participant.poolId);
          if (pool) {
            const { poolId, ...participantWithoutPoolId } = participant;
            pool.participants.push(participantWithoutPoolId);
          }
        } else {
          // Fallback: распределяем по индексу (для старых данных)
          const index = tournament.participants.indexOf(participant);
          const poolIndex = Math.floor(index / Math.ceil(tournament.participants.length / 4));
          if (pools[poolIndex]) {
            pools[poolIndex].participants.push(participant);
          }
        }
      });
    }
    
    setSeedPools(pools);
    setHasUnsavedChanges(false); // Reset unsaved changes when loading from tournament
  }, [tournament]);

  // Save tournament mutation
  const saveTournamentMutation = useMutation({
    mutationFn: async (updatedTournament) => {
      const response = await fetch(`/api/tournaments/${tournament.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTournament),
      });
      if (!response.ok) throw new Error('Failed to save tournament');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tournament', tournament.id.toString()]);
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    },
  });

  const addToPool = (poolId, participant) => {
    if (!canAddToPool(poolId)) {
      const maxPerPool = getMaxParticipantsPerPool();
      const maxTotal = tournament?.schema?.participantsNum || 0;
      showError(`Невозможно добавить участника. Максимум в корзине: ${maxPerPool}, максимум в турнире: ${maxTotal}`);
      return;
    }

    setSeedPools(prev => prev.map(pool => 
      pool.id === poolId 
        ? { ...pool, participants: [...pool.participants, participant] }
        : pool
    ));
    setIsModalOpen(false);
    setHasUnsavedChanges(true);
  };

  const removeFromPool = (poolId, participantIndex) => {
    setSeedPools(prev => prev.map(pool => 
      pool.id === poolId 
        ? { ...pool, participants: pool.participants.filter((_, i) => i !== participantIndex) }
        : pool
    ));
    setHasUnsavedChanges(true);
  };

  const addManualParticipant = async () => {
    if (!manualName.trim() || !selectedPool) return;
    
    if (!canAddToPool(selectedPool)) {
      const maxPerPool = getMaxParticipantsPerPool();
      const maxTotal = tournament?.schema?.participantsNum || 0;
      showError(`Невозможно добавить участника. Максимум в корзине: ${maxPerPool}, максимум в турнире: ${maxTotal}`);
      return;
    }

    try {
      // Create participant object based on type
      const participantData = participantType === 'team' 
        ? { name: manualName.trim() }
        : {
            firstName: manualName.trim().split(' ')[0] || manualName.trim(),
            lastName: manualName.trim().split(' ').slice(1).join(' ') || ''
          };

      // Save to database first
      const response = await fetch(`/api/players?type=${participantType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(participantData),
      });

      if (!response.ok) throw new Error('Failed to save participant');
      
      const savedParticipant = await response.json();
      
      // Add to pool
      addToPool(selectedPool, savedParticipant);
      setManualName('');
      
      // Invalidate players query to refresh the list
      queryClient.invalidateQueries(['players', participantType]);
      
    } catch (error) {
      console.error('Error adding manual participant:', error);
      showError('Ошибка при сохранении участника в базу данных');
    }
  };

  const shufflePools = async () => {
    if (!tournament?.schema?.participantsNum) return;
    
    try {
      // Fetch all players from database
      const response = await fetch(`/api/players?type=${participantType}`);
      if (!response.ok) throw new Error('Failed to fetch players');
      
      const allPlayers = await response.json();
      
      // Randomly select participants equal to tournament capacity
      const maxParticipants = tournament.schema.participantsNum;
      const shuffledPlayers = [...allPlayers].sort(() => Math.random() - 0.5);
      const selectedParticipants = shuffledPlayers.slice(0, maxParticipants);
      
      // Distribute participants evenly across 4 pools
      const poolSize = Math.ceil(selectedParticipants.length / 4);
      
      const newPools = seedPools.map((pool, index) => ({
        ...pool,
        participants: selectedParticipants.slice(index * poolSize, (index + 1) * poolSize)
      }));
      
      setSeedPools(newPools);
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Error shuffling participants:', error);
      showError('Ошибка при загрузке участников из базы данных');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Сохраняем участников с информацией о корзинах
      const participantsWithPools = seedPools.flatMap(pool => 
        pool.participants.map(participant => ({
          ...participant,
          poolId: pool.id
        }))
      );
      
      const updatedTournament = {
        ...tournament,
        participants: participantsWithPools
      };
      
      await saveTournamentMutation.mutateAsync(updatedTournament);
      // React Query автоматически обновляет данные через invalidateQueries
    } catch (error) {
      console.error('Failed to save tournament:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setIsClearDialogOpen(true);
  };

  const confirmClear = () => {
    setSeedPools([
      { id: 1, name: 'Корзина 1', participants: [], color: 'gold' },
      { id: 2, name: 'Корзина 2', participants: [], color: 'silver' },
      { id: 3, name: 'Корзина 3', participants: [], color: 'bronze' },
      { id: 4, name: 'Корзина 4', participants: [], color: 'blue' },
    ]);
    setHasUnsavedChanges(true);
    setIsClearDialogOpen(false);
  };

  const getTotalParticipants = () => getTotalParticipantsCount();

  const getParticipantName = (participant) => {
    if (participantType === 'team') return participant.name;
    const firstLetter = participant.firstName?.charAt(0)?.toUpperCase() || '';
    const lastName = participant.lastName || '';
    return `${firstLetter}.${lastName}`;
  };

  const togglePool = (poolId) => {
    setExpandedPools(prev => ({
      ...prev,
      [poolId]: !prev[poolId]
    }));
  };

  const isPlayerAlreadyAdded = (playerId) => {
    return seedPools.some(pool => 
      pool.participants.some(participant => 
        participant.id === playerId || participant.id === playerId.toString()
      )
    );
  };

  const getAvailablePlayers = () => {
    return availablePlayers.filter(player => !isPlayerAlreadyAdded(player.id));
  };

  const getMaxParticipantsPerPool = () => {
    if (!tournament?.schema?.participantsNum) return Infinity;
    return Math.ceil(tournament.schema.participantsNum / 4);
  };

  const getTotalParticipantsCount = () => {
    return seedPools.reduce((total, pool) => total + pool.participants.length, 0);
  };

  const canAddToPool = (poolId) => {
    const pool = seedPools.find(p => p.id === poolId);
    const maxPerPool = getMaxParticipantsPerPool();
    const maxTotal = tournament?.schema?.participantsNum || Infinity;
    
    return pool && 
           pool.participants.length < maxPerPool && 
           getTotalParticipantsCount() < maxTotal;
  };

  const handleDragStart = (e, participant, poolId, participantIndex) => {
    const dragData = {
      participant,
      sourcePoolId: poolId,
      participantIndex
    };
    setDraggedItem(dragData);
    e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverPool(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, poolId) => {
    e.preventDefault();
    setDragOverPool(poolId);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverPool(null);
    }
  };

  const handleDrop = (e, targetPoolId) => {
    e.preventDefault();
    setDragOverPool(null);

    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { participant, sourcePoolId, participantIndex } = dragData;

      if (sourcePoolId === targetPoolId) {
        return; // Same pool, no action needed
      }

      // Check if target pool can accept more participants
      const targetPool = seedPools.find(p => p.id === targetPoolId);
      const maxPerPool = getMaxParticipantsPerPool();
      
      if (targetPool && targetPool.participants.length >= maxPerPool) {
        showError(`Корзина заполнена. Максимум участников в корзине: ${maxPerPool}`);
        return;
      }

      // Move participant from source to target pool in single state update
      setSeedPools(prev => prev.map(pool => {
        if (pool.id === sourcePoolId) {
          return { ...pool, participants: pool.participants.filter((_, i) => i !== participantIndex) };
        }
        if (pool.id === targetPoolId) {
          return { ...pool, participants: [...pool.participants, participant] };
        }
        return pool;
      }));

      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  const createGames = async () => {
    setIsCreatingGames(true);
    try {
      // Convert participants from poolId format to basket format for draw function
      const participantsWithBaskets = seedPools.flatMap(pool => 
        pool.participants.map(participant => ({
          ...participant,
          basket: pool.id // Convert poolId to basket for draw function
        }))
      );

      // Prepare tournament details for draw function
      const tournamentForDraw = {
        ...tournament,
        schema: tournament.schema.schemeName, // Draw function expects string, not object
        participants: participantsWithBaskets,
        participantsNum: tournament.schema.participantsNum
      };

      // Call drawTournament function
      const games = drawTournament(tournamentForDraw, false);

      // Create games for all stages
      if (games.length > 0 && tournament.schema.stages.length > 0) {
        let totalGamesCreated = 0;
        
        // Create games for each stage
        for (const stage of tournament.schema.stages) {
          // For first stage, use games from drawTournament
          if (stage.order === 1) {
            for (const game of games) {
              const gameData = {
                gameDate: new Date().toISOString(),
                gamePlace: `Арена ${game.number}`,
                presenterId: 1,
                stageOrder: game.number, // Order within the stage
                participants: (game.players || []).map(player => ({
                  playerId: player.playerId,
                  points: 0,
                  extraResult: ""
                }))
              };

              const url = `/api/tournaments/${tournament.id}/stages/${stage.id}/games`;
              
              const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gameData),
              });

              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create game: ${response.status} ${errorText}`);
              }
              totalGamesCreated++;
            }
          } else {
            // For other stages, create empty placeholder games
            const stageGamesCount = calculateGamesForStage(stage, tournament.schema.participantsNum);
            
            for (let i = 1; i <= stageGamesCount; i++) {
              const gameData = {
                gameDate: new Date().toISOString(),
                gamePlace: `Арена ${i}`,
                presenterId: 1,
                stageOrder: i, // Order within the stage
                participants: [] // Empty participants for future stages
              };

              const url = `/api/tournaments/${tournament.id}/stages/${stage.id}/games`;
              
              const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gameData),
              });

              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create game: ${response.status} ${errorText}`);
              }
              totalGamesCreated++;
            }
          }
        }

        // Show success message
        showSuccess(`${totalGamesCreated} боев созданы для всех ${tournament.schema.stages.length} стадий! Добавьте участников в каждый бой.`);
      } else {
        showError('Не удалось создать бои. Проверьте количество участников.');
      }
    } catch (error) {
      console.error('Error creating games:', error);
      showError('Ошибка при создании боев');
    } finally {
      setIsCreatingGames(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.info}>
          <h3>Участники турнира</h3>
          <p>Всего участников: {getTotalParticipants()} / {tournament?.schema?.participantsNum || 'Не указано'}</p>
        </div>
        <div className={styles.actions}>
          <button onClick={shufflePools} className={styles.shuffleButton} title="Перемешать">
            <FaRandom /> <span className={styles.buttonText}>Перемешать</span>
          </button>
          <button 
            onClick={handleSave} 
            disabled={!hasUnsavedChanges || isSaving}
            className={`${styles.saveButton} ${saveSuccess ? styles.success : ''}`}
            title={isSaving ? "Сохраняем..." : saveSuccess ? "Сохранено" : "Сохранить"}
          >
            {isSaving ? (
              <>Сохраняем...</>
            ) : saveSuccess ? (
              <><FaCheck /> <span className={styles.buttonText}>Сохранено</span></>
            ) : (
              <><FaSave /> <span className={styles.buttonText}>Сохранить</span></>
            )}
          </button>
          <button 
            onClick={createGames}
            disabled={isCreatingGames || getTotalParticipants() === 0 || hasUnsavedChanges}
            className={`${styles.createGamesButton} ${hasUnsavedChanges ? styles.requiresSave : ''}`}
            title={
              hasUnsavedChanges 
                ? "Сохраните участников перед созданием боев" 
                : getTotalParticipants() === 0
                ? "Добавьте участников для создания боев"
                : "Создать пустые бои для турнира"
            }
            type="button"
          >
            {isCreatingGames ? (
              <>Создаём бои...</>
            ) : (
              <><FaGamepad /> <span className={styles.buttonText}>Создать бои</span></>
            )}
          </button>
          <button onClick={handleClear} className={styles.clearButton} title="Очистить все">
            <FaBroom /> <span className={styles.buttonText}>Очистить все</span>
          </button>
        </div>
      </div>

      <div className={styles.poolsContainer}>
        <div className={styles.pools}>
          {seedPools.map(pool => (
          <div 
            key={pool.id} 
            className={`${styles.pool} ${styles[pool.color]} ${dragOverPool === pool.id ? styles.dragOver : ''}`}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, pool.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, pool.id)}
          >
            <div 
              className={`${styles.poolHeader} ${styles.clickableHeader}`}
              onClick={() => togglePool(pool.id)}
            >
              <div className={styles.headerContent}>
                <h4>{pool.name}</h4>
                <span className={`${styles.count} ${styles[`count${pool.color.charAt(0).toUpperCase() + pool.color.slice(1)}`]}`}>
                  {pool.participants.length}/{getMaxParticipantsPerPool()}
                </span>
              </div>
              <div className={styles.headerActions}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPool(pool.id);
                    setIsModalOpen(true);
                  }}
                  className={styles.addButton}
                  disabled={!canAddToPool(pool.id)}
                  title="Добавить участника"
                >
                  <FaPlus />
                </button>
                <button 
                  className={styles.toggleButton}
                  title={expandedPools[pool.id] ? "Свернуть" : "Развернуть"}
                >
                  {expandedPools[pool.id] ? <FaChevronUp /> : <FaChevronDown />}
                </button>
              </div>
            </div>
            
            <div className={`${styles.participants} ${expandedPools[pool.id] ? styles.expanded : styles.collapsed}`}>
              {pool.participants.map((participant, index) => (
                <div 
                  key={index} 
                  className={`${styles.participant} ${draggedItem?.sourcePoolId === pool.id && draggedItem?.participantIndex === index ? styles.dragging : ''}`}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, participant, pool.id, index)}
                  onDragEnd={handleDragEnd}
                >
                  <span className={styles.name}>{getParticipantName(participant)}</span>
                  <button
                    onClick={() => removeFromPool(pool.id, index)}
                    className={styles.removeButton}
                    title="Удалить участника"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
              {pool.participants.length === 0 && (
                <div 
                  className={`${styles.emptyState} ${dragOverPool === pool.id ? styles.dropZone : ''}`}
                >
                  {dragOverPool === pool.id ? 'Отпустите здесь' : 'Нет участников'}
                </div>
              )}
            </div>
          </div>
          ))}
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setManualName('');
        }}
        title={`Добавить ${participantType === 'team' ? 'команду' : 'игрока'}`}
      >
        <div className={styles.modalContent}>
          <div className={styles.section}>
            <h4>Добавить нового {participantType === 'team' ? 'команду' : 'игрока'}</h4>
            <div className={styles.manualAdd}>
              <input
                type="text"
                placeholder={participantType === 'team' ? 'Название команды' : 'Имя Фамилия'}
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className={styles.input}
                onKeyPress={(e) => e.key === 'Enter' && addManualParticipant()}
              />
              <button 
                onClick={addManualParticipant} 
                className={styles.addManualButton}
                disabled={!manualName.trim() || !canAddToPool(selectedPool)}
                title="Добавить в базу"
              >
                <span className={styles.buttonText}>Добавить в базу</span>
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <h4>Выбрать из базы данных {participantType === 'team' ? 'команд' : 'игроков'}</h4>
            <div className={styles.playersList}>
              {getAvailablePlayers().map(player => (
                <div key={player.id} className={styles.playerItem}>
                  <span>{getParticipantName(player)}</span>
                  <button
                    onClick={() => addToPool(selectedPool, player)}
                    className={styles.selectButton}
                    disabled={!canAddToPool(selectedPool)}
                    title="Выбрать"
                  >
                    <span className={styles.buttonText}>Выбрать</span>
                  </button>
                </div>
              ))}
              {getAvailablePlayers().length === 0 && availablePlayers.length > 0 && (
                <div className={styles.emptyList}>
                  Все {participantType === 'team' ? 'команды' : 'игроки'} уже добавлены
                </div>
              )}
              {availablePlayers.length === 0 && (
                <div className={styles.emptyList}>
                  Нет доступных {participantType === 'team' ? 'команд' : 'игроков'}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmationDialog
        isOpen={isClearDialogOpen}
        onClose={() => setIsClearDialogOpen(false)}
        onConfirm={confirmClear}
        title="Подтверждение очистки"
        message="Вы уверены, что хотите очистить все корзины? Это действие нельзя отменить."
        confirmText="Очистить"
        cancelText="Отмена"
      />
    </div>
  );
};

export default ParticipantsTab;