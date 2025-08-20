// Base Participant Distributor - Abstract interface for tournament-specific participant assignment
// Different tournament types implement this interface with their own logic

import { createPlayerReference, createParticipantWithReference } from '../referenceSystem.js';

export class BaseParticipantDistributor {
  constructor(tournament) {
    this.tournament = tournament;
  }

  // Main method to assign participants to all games in a stage - must be implemented by subclass
  async assignStageParticipants(stage, games) {
    throw new Error('assignStageParticipants must be implemented by subclass');
  }

  // Assign participants to a single game - must be implemented by subclass
  async assignGameParticipants(game, stage, sourceGames, allGames) {
    throw new Error('assignGameParticipants must be implemented by subclass');
  }

  // Common helper methods available to all implementations
  async getAllTournamentGames() {
    try {
      const response = await fetch(`/api/tournaments/${this.tournament.id}/games`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching tournament games:', error);
      return [];
    }
  }

  findSourceGames(stage, allGames) {
    // Get all games from previous stages
    const currentStageOrder = stage.order;
    return allGames.filter(game => {
      const gameStage = this.findStageById(game.stageId);
      return gameStage && gameStage.order < currentStageOrder;
    }).sort((a, b) => a.gameNumber - b.gameNumber);
  }

  findPreviousStage(stage) {
    if (!this.tournament.schema || !this.tournament.schema.stages) return null;
    return this.tournament.schema.stages.find(s => s.order === stage.order - 1);
  }

  findStageById(stageId) {
    if (!this.tournament.schema || !this.tournament.schema.stages) return null;
    return this.tournament.schema.stages.find(s => s.id === stageId);
  }

  assignEmptyParticipants(games, playersPerGame) {
    // For stage 1, games should start with no participants
    // Participants will be added manually during the draw process
    return games.map(game => ({
      ...game,
      participants: []
    }));
  }

  createEmptyParticipant() {
    return {
      playerId: null,
      sourceReference: null,
      points: 0,
      tieBreakResult: null,
      resolved: false,
      lossBracket: false,
      eliminationCount: 0
    };
  }

  // Rule 4: Smart distribution to avoid rematches when possible
  calculateDistributionStartIndex(game, totalAvailableParticipants, playersPerGame) {
    const gameIndex = game.gameIndex || 0;
    
    // Simple fallback for small player pools (rematches inevitable)
    if (totalAvailableParticipants <= playersPerGame * 2) {
      return (gameIndex * playersPerGame) % totalAvailableParticipants;
    }
    
    // For larger pools, use interleaved distribution to avoid rematches
    return this.calculateInterleavedDistribution(gameIndex, totalAvailableParticipants, playersPerGame);
  }

  // Calculate interleaved distribution to spread players from different source games
  calculateInterleavedDistribution(gameIndex, totalPlayers, playersPerGame) {
    // Assume players are grouped by position (0,1 from game1, 2,3 from game2, etc.)
    const playersPerSourceGame = 2; // typically 2 winners per source game
    const sourceGameCount = totalPlayers / playersPerSourceGame;
    
    const baseOffset = Math.floor(gameIndex / 2) * playersPerSourceGame; // Which source games to use
    const positionOffset = gameIndex % 2; // Which position (1st or 2nd place)
    
    return baseOffset + positionOffset;
  }

  // Select participants with smart re-match avoidance
  selectParticipantsWithRematchAvoidance(game, availableParticipants, playersNeeded) {
    const gameIndex = game.gameIndex || 0;
    
    // For very small pools where rematches are truly inevitable, use simple consecutive selection
    if (availableParticipants.length < playersNeeded * 1.5) {
      const startIndex = (gameIndex * playersNeeded) % availableParticipants.length;
      const selected = [];
      
      for (let i = 0; i < playersNeeded && startIndex + i < availableParticipants.length; i++) {
        selected.push(availableParticipants[startIndex + i]);
      }
      
      return selected;
    }
    
    // For larger pools, use interleaved selection to avoid rematches
    return this.selectInterleavedParticipants(gameIndex, availableParticipants, playersNeeded);
  }

  // Select participants using balanced distribution that avoids rematches
  selectInterleavedParticipants(gameIndex, availableParticipants, playersNeeded) {
    const selected = [];
    const totalParticipants = availableParticipants.length;
    
    // Separate participants by position for balanced distribution
    const firstPlaces = [];
    const secondPlaces = [];
    
    // Group participants by position (assuming they're ordered by source game)
    for (let i = 0; i < totalParticipants; i += 2) {
      if (i < totalParticipants) firstPlaces.push(availableParticipants[i]);
      if (i + 1 < totalParticipants) secondPlaces.push(availableParticipants[i + 1]);
    }
    
    console.log(`[BaseParticipantDistributor] Separated: ${firstPlaces.length} first places, ${secondPlaces.length} second places`);
    
    // Calculate how to distribute positions
    const targetGameCount = Math.ceil(totalParticipants / playersNeeded);
    const firstsPerGame = Math.floor(playersNeeded / 2);
    const secondsPerGame = playersNeeded - firstsPerGame;
    
    // Distribute first places using interleaved pattern to avoid clustering
    const firstsAllocated = [];
    for (let i = 0; i < firstsPerGame && firstsAllocated.length < firstPlaces.length; i++) {
      const index = (gameIndex + i * targetGameCount) % firstPlaces.length;
      if (!firstsAllocated.includes(index)) {
        firstsAllocated.push(index);
        selected.push(firstPlaces[index]);
        console.log(`[BaseParticipantDistributor] Target game ${gameIndex}: added 1st place from game ${firstPlaces[index].gameNumber}`);
      }
    }
    
    // Distribute second places using DIFFERENT interleaved pattern to avoid same source games
    const secondsAllocated = [];
    const secondOffset = Math.floor(targetGameCount / 2);
    
    for (let i = 0; i < secondsPerGame && secondsAllocated.length < secondPlaces.length; i++) {
      const index = ((gameIndex + secondOffset) + i * targetGameCount) % secondPlaces.length;
      if (!secondsAllocated.includes(index)) {
        secondsAllocated.push(index);
        selected.push(secondPlaces[index]);
        console.log(`[BaseParticipantDistributor] Target game ${gameIndex}: added 2nd place from game ${secondPlaces[index].gameNumber}`);
      }
    }
    
    // If we still don't have enough participants, fill with remaining available ones
    while (selected.length < playersNeeded && selected.length < availableParticipants.length) {
      for (let i = 0; i < availableParticipants.length && selected.length < playersNeeded; i++) {
        const participant = availableParticipants[i];
        if (!selected.some(s => s.gameNumber === participant.gameNumber && s.position === participant.position)) {
          selected.push(participant);
        }
      }
    }
    
    return selected;
  }

  // Helper method to create participant with reference
  createParticipantWithReference(reference, metadata = {}) {
    return createParticipantWithReference(reference, metadata);
  }

  // Helper method to create player reference
  createPlayerReference(gameNumber, position) {
    return createPlayerReference(this.tournament.id, gameNumber, position);
  }
}