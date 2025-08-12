// Universal Tournament Progression Engine
// Handles automatic player advancement for both Double Elimination and Olympic tournaments

import { 
  createPlayerReference, 
  parsePlayerReference, 
  createParticipantWithReference,
  getStageDependencies,
  generateProgressionReferences 
} from './referenceSystem.js';

export class TournamentProgressionEngine {
  constructor(tournament) {
    this.tournament = tournament;
    this.progressionRules = this.getProgressionRules();
  }

  getProgressionRules() {
    const schemeName = this.tournament.schema?.schemeName;
    
    switch (schemeName) {
      case 'Double Elimination':
        return this.getDoubleEliminationRules();
      case 'Олимпийская':
        return this.getOlympicRules();
      default:
        return this.getDefaultRules();
    }
  }

  getDoubleEliminationRules() {
    return {
      type: 'doubleElimination',
      autoProgress: true,
      bracketSystem: true,
      eliminationCount: 2, // Players eliminated after 2 losses
      
      // Stage-specific rules
      stageRules: {
        // First stage: manual assignment
        1: {
          manualAssignment: true,
          playersPerGame: 4,
          winners: 2
        },
        
        // Later stages: automatic progression
        default: {
          manualAssignment: false,
          playersPerGame: 4,
          
          // High bracket composition
          highBracket: {
            composition: [
              { sourcePosition: 1, count: 2 }, // 1st places
              { sourcePosition: 2, count: 2 }  // 2nd places
            ]
          },
          
          // Low bracket composition
          lowBracket: {
            composition: [
              { sourcePosition: 3, count: 2 }, // 3rd places (from high)
              { sourcePosition: 4, count: 2 }, // 4th places (from high)
              { sourcePosition: 1, count: 2, fromBracket: 'low' } // Winners from low
            ]
          }
        }
      }
    };
  }

  getOlympicRules() {
    return {
      type: 'olympic',
      autoProgress: true,
      bracketSystem: false,
      eliminationCount: 1, // Single elimination
      
      stageRules: {
        // First stage: manual assignment
        1: {
          manualAssignment: true,
          playersPerGame: 4,
          advanceCount: 2 // Top 2 advance
        },
        
        // Later stages: automatic progression
        default: {
          manualAssignment: false,
          playersPerGame: 4,
          advanceCount: 2,
          
          composition: [
            { sourcePosition: 1, count: 2 }, // 1st places from 2 games
            { sourcePosition: 2, count: 2 }  // 2nd places from 2 games
          ]
        }
      }
    };
  }

  getDefaultRules() {
    return {
      type: 'manual',
      autoProgress: false,
      bracketSystem: false,
      eliminationCount: 1,
      
      stageRules: {
        default: {
          manualAssignment: true,
          playersPerGame: 4
        }
      }
    };
  }

  // Generate participants with references for a specific stage and game
  generateGameParticipants(stageOrder, gameIndex, bracketType = null) {
    const stageRules = this.getStageRules(stageOrder);
    
    if (stageRules.manualAssignment || stageOrder === 1) {
      return []; // Stage 1 or manual stages have empty participants initially
    }

    const participants = [];
    const prevStageOrder = stageOrder - 1;

    if (this.progressionRules.type === 'doubleElimination') {
      participants.push(...this.generateDoubleEliminationParticipants(
        prevStageOrder, 
        gameIndex, 
        bracketType,
        stageOrder
      ));
    } else if (this.progressionRules.type === 'olympic') {
      participants.push(...this.generateOlympicParticipants(
        prevStageOrder, 
        gameIndex
      ));
    }

    return participants;
  }

  // Find the next available high-bracket stage from current stage
  findNextHighBracketStage(fromStageOrder) {
    if (!this.tournament.schema || !this.tournament.schema.stages) {
      return null;
    }
    
    for (let i = fromStageOrder; i <= this.tournament.schema.stages.length; i++) {
      const stage = this.tournament.schema.stages.find(s => s.order === i);
      if (stage && (stage.topBracketGameNum || 0) > 0) {
        return stage;
      }
    }
    return null;
  }

  // Find the source stage for high-bracket winners when current stage has no high-bracket
  findSourceStageForHighBracketWinners(currentStageOrder) {
    if (!this.tournament.schema || !this.tournament.schema.stages) {
      return currentStageOrder - 1;
    }
    
    // Look backward to find the last stage with high-bracket games
    for (let i = currentStageOrder - 1; i >= 1; i--) {
      const stage = this.tournament.schema.stages.find(s => s.order === i);
      if (stage && (stage.topBracketGameNum || 0) > 0) {
        return i;
      }
    }
    return currentStageOrder - 1;
  }

  generateDoubleEliminationParticipants(prevStageOrder, gameIndex, bracketType, currentStageOrder) {
    const participants = [];
    
    // Get current stage info to check if high-bracket exists
    const currentStage = this.tournament.schema?.stages?.find(s => s.order === currentStageOrder);
    const hasHighBracket = currentStage && (currentStage.topBracketGameNum || 0) > 0;
    
    // Handle final stages (bracketType === null)
    if (bracketType === null && currentStage?.isFinal) {
      // Final stage: get top performers from previous stage
      const prevStage = this.tournament.schema?.stages?.find(s => s.order === prevStageOrder);
      
      if (prevStage) {
        const prevHasUpperBracket = (prevStage.topBracketGameNum || 0) > 0;
        const prevHasLowerBracket = (prevStage.bottomBracketGamesNum || 0) > 0;
        
        // Add participants from upper bracket if it exists
        if (prevHasUpperBracket) {
          // Add top performers from upper bracket
          const upperGames = prevStage.topBracketGameNum || 0;
          for (let i = 1; i <= upperGames; i++) {
            participants.push(
              createParticipantWithReference(createPlayerReference(prevStageOrder, i, 1)) // 1st place from each upper game
            );
          }
        }
        
        // Add participants from lower bracket if it exists  
        if (prevHasLowerBracket) {
          // Add winners from lower bracket
          const lowerGames = prevStage.bottomBracketGamesNum || 0;
          for (let i = 1; i <= lowerGames; i++) {
            participants.push(
              createParticipantWithReference(createPlayerReference(prevStageOrder, i, 1), { lossBracket: true, eliminationCount: 1 })
            );
          }
        }
        
        // If neither bracket exists, take winners from all games in the previous stage
        if (!prevHasUpperBracket && !prevHasLowerBracket) {
          // Fallback: assume all games from previous stage contribute winners
          // This handles cases where stage definitions don't specify bracket counts clearly
          const gameWinnersNum = prevStage.topGameWinnersNum || prevStage.gameWinnersNum || 1;
          for (let i = 1; i <= 4; i++) { // Assume up to 4 participants in final
            participants.push(
              createParticipantWithReference(createPlayerReference(prevStageOrder, Math.ceil(i / gameWinnersNum), ((i - 1) % gameWinnersNum) + 1))
            );
          }
        }
      }
      
      return participants;
    }
    
    if (bracketType === 'upper') {
      if (!hasHighBracket) {
        // No high-bracket in current stage, skip high-bracket game creation
        // Winners will advance to next available high-bracket stage
        return [];
      }
      
      // Upper bracket: Mix winners from different games to avoid immediate rematches
      // Game X gets: 1st from game (2*X-1), 2nd from game (2*X), 1st from game (2*X+1), 2nd from game (2*X+2)
      // This ensures players from the same previous game don't meet immediately
      const sourceStageOrder = this.findSourceStageForHighBracketWinners(currentStageOrder);
      const gameA = gameIndex * 2 + 1;
      const gameB = gameIndex * 2 + 2;
      const gameC = gameIndex * 2 + 3;
      const gameD = gameIndex * 2 + 4;
      
      participants.push(
        createParticipantWithReference(createPlayerReference(sourceStageOrder, gameA, 1)), // 1st from game A
        createParticipantWithReference(createPlayerReference(sourceStageOrder, gameB, 2)), // 2nd from game B
        createParticipantWithReference(createPlayerReference(sourceStageOrder, gameC, 1)), // 1st from game C  
        createParticipantWithReference(createPlayerReference(sourceStageOrder, gameD, 2))  // 2nd from game D
      );
    } else if (bracketType === 'lower') {
      // Lower bracket: Mix losers from different games to avoid immediate rematches
      // For first lower bracket stage: mix 3rd/4th from different games (4 participants total)
      if (prevStageOrder === 1) {
        const gameA = gameIndex * 2 + 1;
        const gameB = gameIndex * 2 + 2;
        const gameC = gameIndex * 2 + 3;
        const gameD = gameIndex * 2 + 4;
        
        participants.push(
          createParticipantWithReference(
            createPlayerReference(prevStageOrder, gameA, 3),
            { lossBracket: true, eliminationCount: 1 }
          ),
          createParticipantWithReference(
            createPlayerReference(prevStageOrder, gameB, 4),
            { lossBracket: true, eliminationCount: 1 }
          ),
          createParticipantWithReference(
            createPlayerReference(prevStageOrder, gameC, 3),
            { lossBracket: true, eliminationCount: 1 }
          ),
          createParticipantWithReference(
            createPlayerReference(prevStageOrder, gameD, 4),
            { lossBracket: true, eliminationCount: 1 }
          )
        );
      } else {
        // Later stages: combine upper bracket losers with lower bracket winners
        const sourceGame = gameIndex + 1;
        
        participants.push(
          createParticipantWithReference(
            createPlayerReference(prevStageOrder, sourceGame, 3),
            { lossBracket: true, eliminationCount: 1 }
          ),
          createParticipantWithReference(
            createPlayerReference(prevStageOrder, sourceGame, 4),
            { lossBracket: true, eliminationCount: 1 }
          )
        );
        
        // Add winners from previous low bracket
        participants.push(
          createParticipantWithReference(
            createPlayerReference(prevStageOrder, gameIndex, 1),
            { lossBracket: true, eliminationCount: 1 }
          ),
          createParticipantWithReference(
            createPlayerReference(prevStageOrder, gameIndex + 1, 1),
            { lossBracket: true, eliminationCount: 1 }
          )
        );
      }
    }
    
    return participants;
  }

  generateOlympicParticipants(prevStageOrder, gameIndex) {
    const participants = [];
    const gamesPerNextGame = 2; // 2 previous games feed into 1 next game
    
    for (let i = 0; i < gamesPerNextGame; i++) {
      const sourceGameIndex = gameIndex * gamesPerNextGame + i + 1;
      
      // Top 2 from each source game
      participants.push(
        createParticipantWithReference(createPlayerReference(prevStageOrder, sourceGameIndex, 1)),
        createParticipantWithReference(createPlayerReference(prevStageOrder, sourceGameIndex, 2))
      );
    }
    
    return participants;
  }

  getStageRules(stageOrder) {
    return this.progressionRules.stageRules[stageOrder] || 
           this.progressionRules.stageRules.default;
  }

  // Check if a stage is ready for progression (all games completed)
  async isStageReadyForProgression(stageId) {
    try {
      const response = await fetch(`/api/tournaments/${this.tournament.id}/stages/${stageId}/games`);
      if (!response.ok) return false;
      
      const games = await response.json();
      
      // Check if all games have final results
      return games.every(game => this.isGameCompleted(game));
    } catch (error) {
      console.error('Error checking stage progression readiness:', error);
      return false;
    }
  }

  isGameCompleted(game) {
    // Game is completed if:
    // 1. All participants have points assigned
    // 2. At least one participant has points > 0 OR extraResult is set
    // 3. All participants are resolved (no pending references)
    
    if (!game.participants || game.participants.length === 0) {
      return false;
    }

    const allResolved = game.participants.every(p => p.resolved || !p.sourceReference);
    const hasResults = game.participants.some(p => p.points > 0 || p.extraResult);
    
    return allResolved && hasResults;
  }

  // Get participants for high-bracket winners when current stage has no high-bracket
  generateDelayedHighBracketParticipants(completedStageOrder, targetStageOrder, gameIndex) {
    const participants = [];
    
    if (this.progressionRules.type !== 'doubleElimination') {
      return participants;
    }
    
    // Find the completed stage with high-bracket games
    const completedStage = this.tournament.schema?.stages?.find(s => s.order === completedStageOrder);
    const hasCompletedHighBracket = completedStage && (completedStage.topBracketGameNum || 0) > 0;
    
    if (!hasCompletedHighBracket) {
      return participants;
    }
    
    // Generate participants from the completed high-bracket stage
    // Mix winners to avoid immediate rematches
    const gameA = gameIndex * 2 + 1;
    const gameB = gameIndex * 2 + 2;
    const gameC = gameIndex * 2 + 3;
    const gameD = gameIndex * 2 + 4;
    
    participants.push(
      createParticipantWithReference(createPlayerReference(completedStageOrder, gameA, 1)), // 1st from game A
      createParticipantWithReference(createPlayerReference(completedStageOrder, gameB, 2)), // 2nd from game B
      createParticipantWithReference(createPlayerReference(completedStageOrder, gameC, 1)), // 1st from game C  
      createParticipantWithReference(createPlayerReference(completedStageOrder, gameD, 2))  // 2nd from game D
    );
    
    return participants;
  }

  // Get all stages that depend on the completion of a given stage
  getDependentStages(completedStageOrder) {
    const dependentStages = [];
    
    // Add immediate next stage
    this.tournament.schema.stages.forEach(stage => {
      if (stage.order === completedStageOrder + 1) {
        dependentStages.push(stage);
      }
    });
    
    // For double elimination: check if we need to advance to next available high-bracket
    if (this.progressionRules.type === 'doubleElimination') {
      const completedStage = this.tournament.schema.stages.find(s => s.order === completedStageOrder);
      const hasHighBracket = completedStage && (completedStage.topBracketGameNum || 0) > 0;
      
      if (hasHighBracket) {
        // Check if next stage lacks high-bracket, find next available high-bracket
        const nextHighBracketStage = this.findNextHighBracketStage(completedStageOrder + 1);
        if (nextHighBracketStage && nextHighBracketStage.order !== completedStageOrder + 1) {
          dependentStages.push(nextHighBracketStage);
        }
      }
    }
    
    return dependentStages;
  }

  // Calculate the number of games needed for a stage
  calculateGamesForStage(stage, totalParticipants) {
    const stageRules = this.getStageRules(stage.order);
    
    if (stage.order === 1) {
      // First stage: based on total participants
      return Math.ceil(totalParticipants / stageRules.playersPerGame);
    }
    
    if (this.progressionRules.type === 'doubleElimination') {
      return {
        upper: stage.topBracketGameNum || 0,
        lower: stage.bottomBracketGamesNum || 0
      };
    } else if (this.progressionRules.type === 'olympic') {
      // Olympic: halve the participants each stage
      const prevParticipants = totalParticipants / Math.pow(2, stage.order - 1);
      return Math.ceil(prevParticipants / 2 / stageRules.playersPerGame);
    }
    
    return 0;
  }

  // Generate progression metadata for tournament
  generateProgressionMetadata() {
    return {
      progressionRules: this.progressionRules,
      stageProgression: this.tournament.schema.stages.map(stage => ({
        stageId: stage.id,
        order: stage.order,
        dependencies: stage.order > 1 ? [stage.order - 1] : [],
        autoGenerated: stage.order > 1,
        completed: false
      }))
    };
  }
}

// Factory function to create progression engine
export const createProgressionEngine = (tournament) => {
  return new TournamentProgressionEngine(tournament);
};

// Utility functions for progression management
export const getProgressionStatus = (tournament) => {
  const engine = createProgressionEngine(tournament);
  return engine.generateProgressionMetadata();
};

export const canStageProgress = async (tournament, stageOrder) => {
  const engine = createProgressionEngine(tournament);
  const stage = tournament.schema.stages.find(s => s.order === stageOrder);
  
  if (!stage) return false;
  
  return await engine.isStageReadyForProgression(stage.id);
};