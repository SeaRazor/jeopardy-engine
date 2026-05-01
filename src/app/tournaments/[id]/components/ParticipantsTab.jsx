'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaPlus, FaTrash, FaRandom, FaSave, FaBroom, FaCheck, FaChevronDown, FaChevronUp, FaGamepad, FaUsers } from 'react-icons/fa';
import Modal from '../../../UI/Modal';
import ConfirmationDialog from '../../../UI/ConfirmationDialog';
import { useToast } from '../../../util/ToastContext';
import { drawTournament } from '../../../util/draw';
import { createProgressionEngine } from '../../../util/progressionEngine';
import { createResolvedParticipant } from '../../../util/referenceSystem';
import { getRequiredPlayerType, validatePlayerForTournament } from '../../../util/tournamentUtils';
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
  const poolColors = ['gold', 'silver', 'bronze', 'blue'];
  const numberOfGroups = tournament?.schema?.stages?.find(s => s.numberOfGroups)?.numberOfGroups ?? 4;
  const [seedPools, setSeedPools] = useState(
    Array.from({ length: numberOfGroups }, (_, i) => ({
      id: i + 1,
      name: `Корзина ${i + 1}`,
      participants: [],
      color: poolColors[i] ?? 'blue',
    }))
  );

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
  const [isDrawing, setIsDrawing] = useState(false);
  const [gamesExist, setGamesExist] = useState(false);
  const [participantType, setParticipantType] = useState('person');

  // Fetch participant type based on tournament gameType
  useEffect(() => {
    const fetchParticipantType = async () => {
      if (tournament?.type) {
        try {
          const requiredPlayerType = await getRequiredPlayerType(tournament);
          setParticipantType(requiredPlayerType);
        } catch (error) {
          console.error('Error fetching participant type:', error);
          // Keep default value on error
        }
      }
    };
    
    fetchParticipantType();
  }, [tournament?.type]);

  // Check if games exist for this tournament
  const checkExistingGames = async () => {
    if (!tournament?.id || !tournament?.schema?.stages) return;
    
    try {
      let hasGames = false;
      
      for (const stage of tournament.schema.stages) {
        const response = await fetch(`/api/tournaments/${tournament.id}/stages/${stage.id}/games`);
        if (response.ok) {
          const games = await response.json();
          if (games.length > 0) {
            hasGames = true;
            break;
          }
        }
      }
      
      setGamesExist(hasGames);
    } catch (error) {
      console.error('Error checking existing games:', error);
    }
  };

  // Delete all existing games for the tournament
  const deleteAllGames = async () => {
    if (!tournament?.id || !tournament?.schema?.stages) return 0;
    
    let deletedCount = 0;
    
    try {
      for (const stage of tournament.schema.stages) {
        const response = await fetch(`/api/tournaments/${tournament.id}/stages/${stage.id}/games`);
        if (response.ok) {
          const games = await response.json();
          
          for (const game of games) {
            const deleteResponse = await fetch(`/api/tournaments/${tournament.id}/stages/${stage.id}/games/${game.id}`, {
              method: 'DELETE'
            });
            
            if (deleteResponse.ok) {
              deletedCount++;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error deleting games:', error);
      throw error;
    }
    
    return deletedCount;
  };
  
  const { data: availablePlayers = [] } = useQuery({
    queryKey: ['players', participantType],
    queryFn: () => fetchAvailablePlayers(participantType),
  });

  // Check for existing games when tournament loads
  useEffect(() => {
    checkExistingGames();
  }, [tournament?.id, tournament?.schema?.stages]);

  // Initialize with tournament participants
  useEffect(() => {
    const n = tournament?.schema?.stages?.find(s => s.numberOfGroups)?.numberOfGroups ?? 4;
    const pools = Array.from({ length: n }, (_, i) => ({
      id: i + 1,
      name: `Корзина ${i + 1}`,
      participants: [],
      color: poolColors[i] ?? 'blue',
    }));

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
          const poolIndex = Math.floor(index / Math.ceil(tournament.participants.length / n));
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

  const drawTournamentGames = async () => {
    setIsDrawing(true);
    try {
      // Delete existing games if any
      if (gamesExist) {
        const deletedCount = await deleteAllGames();
        if (deletedCount > 0) {
          showSuccess(`Удалено ${deletedCount} существующих боев перед проведением жеребьевки`);
        }
      }

      // Create progression engine for this tournament
      const progressionEngine = createProgressionEngine(tournament);
      
      // Convert participants from poolId format to basket format for draw function
      const participantsWithBaskets = seedPools.flatMap(pool => 
        pool.participants.map(participant => ({
          ...participant,
          basket: pool.id // Convert poolId to basket for draw function
        }))
      );

      if (participantsWithBaskets.length === 0) {
        showError('Добавьте участников для проведения жеребьевки');
        return;
      }

      // Validate that we have participants in all pools for first stage
      const requiredPools = 4;
      const filledPools = seedPools.filter(pool => pool.participants.length > 0).length;
      if (filledPools < requiredPools) {
        showError(`Для жеребьевки необходимы участники во всех ${requiredPools} корзинах`);
        return;
      }

      // Use existing drawTournament function with automatic player assignment
      const tournamentDetails = {
        schema: tournament.schema?.schemeName || 'Double Elimination',
        participants: participantsWithBaskets,
        participantsNum: participantsWithBaskets.length
      };

      // Draw games for stage 1 with automatic player assignment
      const firstStageGames = drawTournament(tournamentDetails, true); // true = drawPlayers

      let totalGamesCreated = 0;

      // Process each stage
      for (const stage of tournament.schema.stages) {
        if (stage.order === 1) {
          // Stage 1: Use draw function results with resolved participants
          totalGamesCreated += await createFirstStageGamesFromDraw(firstStageGames, stage, tournament);
        } else {
          // Later stages: Use progression system with references
          totalGamesCreated += await createProgressiveStageGames(stage, tournament, progressionEngine);
        }
      }

      // Update games existence status
      setGamesExist(true);

      // Note: Reference resolution will happen automatically when stage 1 games are completed
      // For now, participants in later stages will show as "not assigned" until stage 1 results are available
      let resolvedReferencesCount = 0;

      // Show success message
      const stageText = tournament.schema.stages.length === 1 ? 'стадии' : 'стадий';
      const subsequentStagesText = tournament.schema.stages.length > 1 
        ? ` Участники последующих стадий будут назначены автоматически после завершения предыдущих игр.`
        : '';
      showSuccess(
        `Жеребьевка завершена! ${totalGamesCreated} боев созданы для всех ${tournament.schema.stages.length} ${stageText}! ` +
        `Игроки автоматически распределены из разных корзин.${subsequentStagesText}`
      );
    } catch (error) {
      console.error('Error during tournament draw:', error);
      showError('Ошибка при проведении жеребьевки: ' + error.message);
    } finally {
      setIsDrawing(false);
    }
  };

  // Create first stage games from draw results with automatic player assignment
  const createFirstStageGamesFromDraw = async (drawnGames, stage, tournament) => {
    let gamesCreated = 0;
    
    for (const drawnGame of drawnGames) {
      const gamePayload = {
        gameDate: new Date().toISOString().split('T')[0],
        gamePlace: 'TBD',
        presenterId: 1,
        participants: drawnGame.players.map(player => createResolvedParticipant(player.playerId, { points: 0 })),
        tournamentType: drawnGame.tournamentType
      };

      // Add Double Elimination specific properties
      if (drawnGame.tournamentType === 'DoubleElimination') {
        gamePayload.gameLetter = drawnGame.gameLetter;
        gamePayload.bracketType = drawnGame.bracketType;
        gamePayload.bracketPosition = drawnGame.bracketPosition;
      }

      const response = await fetch(`/api/tournaments/${tournament.id}/stages/${stage.id}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gamePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create stage ${stage.order} game: ${response.status} ${JSON.stringify(errorData)}`);
      }

      gamesCreated++;
    }
    
    return gamesCreated;
  };

  const createGames = async () => {
    setIsCreatingGames(true);
    try {
      // Create progression engine for this tournament
      const progressionEngine = createProgressionEngine(tournament);
      
      // Convert participants from poolId format to basket format for draw function
      const participantsWithBaskets = seedPools.flatMap(pool => 
        pool.participants.map(participant => ({
          ...participant,
          basket: pool.id // Convert poolId to basket for draw function
        }))
      );

      // Prepare tournament details for draw function (for stage 1 only)
      const tournamentForDraw = {
        ...tournament,
        schema: tournament.schema.schemeName, // Draw function expects string, not object
        participants: participantsWithBaskets,
        participantsNum: tournament.schema.participantsNum
      };

      // Generate first stage games using existing draw function
      const firstStageGames = drawTournament(tournamentForDraw, false);

      // Set the gameCreationMethod flag and add progression metadata
      const updatedTournament = {
        ...tournament,
        gameCreationMethod: 'emptyGames',
        progressionMetadata: progressionEngine.generateProgressionMetadata()
      };

      // Save the updated tournament with gameCreationMethod and progression metadata
      await saveTournamentMutation.mutateAsync(updatedTournament);

      // Create games for all stages using progressive system
      if (firstStageGames.length > 0 && tournament.schema.stages.length > 0) {
        let totalGamesCreated = 0;
        
        // Process each stage
        for (const stage of tournament.schema.stages) {
          if (stage.order === 1) {
            // Stage 1: Use draw function results with resolved participants
            totalGamesCreated += await createFirstStageGames(firstStageGames, stage, tournament);
          } else {
            // Later stages: Use progression system with references
            totalGamesCreated += await createProgressiveStageGames(stage, tournament, progressionEngine);
          }
        }

        // Update games existence status
        setGamesExist(true);

        // Note: Reference resolution will happen automatically when stage 1 games are completed
        // For now, participants in later stages will show as "not assigned" until stage 1 results are available
        let resolvedReferencesCount = 0;

        // Show success message
        const stageText = tournament.schema.stages.length === 1 ? 'стадии' : 'стадий';
        const subsequentStagesText = tournament.schema.stages.length > 1 
          ? ` Участники последующих стадий будут назначены автоматически после завершения предыдущих игр.`
          : '';
        showSuccess(
          `${totalGamesCreated} боев созданы для всех ${tournament.schema.stages.length} ${stageText}! ` +
          `Стадия 1 готова к игре.${subsequentStagesText}`
        );
      } else {
        showError('Не удалось создать бои. Проверьте количество участников.');
      }
    } catch (error) {
      console.error('Error creating games:', error);
      showError(`Ошибка при создании боев: ${error.message}`);
    } finally {
      setIsCreatingGames(false);
    }
  };

  // Create first stage games with resolved participants
  const createFirstStageGames = async (games, stage, tournament) => {
    let gamesCreated = 0;
    
    for (const game of games) {
      // Convert draw results to resolved participants
      const participants = (game.players || []).map(player => 
        createResolvedParticipant(player.playerId)
      );

      const gameData = {
        gameDate: new Date().toISOString(),
        gamePlace: `Арена ${game.number}`,
        presenterId: 1,
        stageOrder: game.number,
        participants: participants,
        tournamentType: tournament.schema.schemeName === 'Double Elimination' ? 'DoubleElimination' : 'Olympic'
      };

      // Add bracket information for Double Elimination
      if (tournament.schema.schemeName === 'Double Elimination') {
        gameData.bracketType = game.bracketType || 'upper';
        gameData.bracketPosition = game.bracketPosition || game.number;
      }

      const response = await fetch(`/api/tournaments/${tournament.id}/stages/${stage.id}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create stage 1 game: ${response.status} ${errorText}`);
      }
      
      gamesCreated++;
    }
    
    return gamesCreated;
  };

  // Create progressive stage games with participant references
  const createProgressiveStageGames = async (stage, tournament, progressionEngine) => {
    console.log(`[ParticipantsTab] Creating progressive stage games for stage ${stage.order}`);
    
    try {
      // Use the new progression engine to create all games for this stage
      const gamesWithParticipants = await progressionEngine.createStageWithParticipants(stage);
      
      console.log(`[ParticipantsTab] Created ${gamesWithParticipants.length} games for stage ${stage.order}`);
      
      let gamesCreated = 0;
      
      // Create each game via API
      for (const game of gamesWithParticipants) {
        const gameData = {
          gameDate: new Date().toISOString(),
          gamePlace: `Арена ${game.gameIndex + 1}`,
          presenterId: 1,
          stageOrder: game.gameNumber, // Use unique game number instead of gameIndex
          participants: game.participants,
          bracketType: game.bracketType,
          bracketPosition: game.gameIndex + 1,
          tournamentType: tournament.schema.schemeName === 'Double Elimination' ? 'DoubleElimination' : 'Olympic',
          gameNumber: game.gameNumber
        };

        console.log(`[ParticipantsTab] Creating game ${game.gameNumber} (${game.bracketType || 'final'}) with ${game.participants.length} participants`);
        
        await createProgressiveGame(gameData, stage, tournament);
        gamesCreated++;
      }
      
      console.log(`[ParticipantsTab] Successfully created ${gamesCreated} games for stage ${stage.order}`);
      return gamesCreated;
      
    } catch (error) {
      console.error(`[ParticipantsTab] Error creating progressive stage games for stage ${stage.order}:`, error);
      throw error;
    }
  };

  // Helper function to create a single progressive game
  const createProgressiveGame = async (gameData, stage, tournament) => {
    const response = await fetch(`/api/tournaments/${tournament.id}/stages/${stage.id}/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gameData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create stage ${stage.order} game: ${response.status} ${errorText}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.info}>
          <div className={styles.statItem}>
            <div className={styles.statIconBox}>
              <FaUsers className={styles.statIcon} />
            </div>
            <div className={styles.statText}>
              <span className={styles.statLabel}>Участников</span>
              <span className={styles.statValue}>
                {getTotalParticipants()}
                <span className={styles.statDivider}>/</span>
                {tournament?.schema?.participantsNum ?? '—'}
              </span>
            </div>
          </div>
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
            disabled={isCreatingGames || isDrawing || getTotalParticipants() === 0 || hasUnsavedChanges || gamesExist}
            className={`${styles.createGamesButton} ${hasUnsavedChanges ? styles.requiresSave : ''} ${gamesExist ? styles.gamesExist : ''}`}
            title={
              gamesExist
                ? "Бои уже созданы. Используйте 'Жеребьевка' для пересоздания с новым распределением игроков"
                : hasUnsavedChanges 
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
          <button 
            onClick={drawTournamentGames}
            disabled={isCreatingGames || isDrawing || getTotalParticipants() === 0 || hasUnsavedChanges}
            className={`${styles.drawButton} ${hasUnsavedChanges ? styles.requiresSave : ''}`}
            title={
              hasUnsavedChanges 
                ? "Сохраните участников перед проведением жеребьевки" 
                : getTotalParticipants() === 0
                ? "Добавьте участников для проведения жеребьевки"
                : gamesExist
                ? "Удалить существующие бои и провести новую жеребьевку с автоматическим распределением игроков из разных корзин"
                : "Провести жеребьевку и автоматически распределить игроков из разных корзин"
            }
            type="button"
          >
            {isDrawing ? (
              <>Жеребьевка...</>
            ) : (
              <><FaRandom /> <span className={styles.buttonText}>{gamesExist ? 'Пережеребьевка' : 'Жеребьевка'}</span></>
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