// Olympic Game Creator - Creates games for Olympic (single elimination) tournaments
// All games are treated as upper bracket games, no lower bracket system

import { BaseGameCreator } from './BaseGameCreator.js';

export class OlympicGameCreator extends BaseGameCreator {
  // Create all games for an Olympic stage
  async createStageGames(stage) {
    const games = [];
    let currentGameNumber = await this.getNextGameNumber();
    
    // Calculate games needed for this stage
    const participantsPerGame = stage.topGameParticipantsNum || 4;
    const participantsInStage = this.calculateParticipantsInStage(stage);
    const gamesNeeded = Math.ceil(participantsInStage / participantsPerGame);
    
    console.log(`[OlympicGameCreator] Creating ${gamesNeeded} games for stage ${stage.order}`);
    console.log(`[OlympicGameCreator] Participants in stage: ${participantsInStage}, participants per game: ${participantsPerGame}`);
    
    // Create all games as upper bracket games (Olympic has no brackets)
    for (let i = 0; i < gamesNeeded; i++) {
      const game = this.createGame({
        gameNumber: currentGameNumber,
        stageId: stage.id,
        bracketType: 'upper', // All Olympic games are treated as upper bracket
        playersPerGame: participantsPerGame,
        gameIndex: i
      });
      
      games.push(game);
      currentGameNumber++;
    }
    
    // Handle final stage (no bracket type)
    if (stage.isFinal && gamesNeeded === 0) {
      const game = this.createGame({
        gameNumber: currentGameNumber,
        stageId: stage.id,
        bracketType: null,
        playersPerGame: participantsPerGame,
        gameIndex: 0
      });
      
      games.push(game);
    }
    
    console.log(`[OlympicGameCreator] Created ${games.length} games with numbers ${games[0]?.gameNumber} to ${games[games.length - 1]?.gameNumber}`);
    
    return games;
  }

  // Calculate how many participants should be in this stage
  calculateParticipantsInStage(stage) {
    // For stage 1, use total tournament participants
    if (stage.order === 1) {
      return this.tournament.schema?.participantsNum || 32;
    }
    
    // For other stages, calculate based on previous stage winners
    const previousStage = this.tournament.schema?.stages?.find(s => s.order === stage.order - 1);
    if (!previousStage) {
      return 0;
    }
    
    // Calculate participants from previous stage
    const prevParticipantsPerGame = previousStage.topGameParticipantsNum || 4;
    const prevWinnersPerGame = previousStage.topGameWinnersNum || 2;
    const prevParticipants = this.calculateParticipantsInStage(previousStage);
    const prevGames = Math.ceil(prevParticipants / prevParticipantsPerGame);
    
    return prevGames * prevWinnersPerGame;
  }

  // Validate Olympic stage configuration
  validateStageConfiguration(stage) {
    const errors = [];
    
    if (!stage.id) {
      errors.push('Stage must have an ID');
    }
    
    if (!stage.order || stage.order < 1) {
      errors.push('Stage must have a valid order (>= 1)');
    }
    
    // Olympic specific validations
    if (!stage.isFinal) {
      if (!stage.topGameParticipantsNum || stage.topGameParticipantsNum < 2 || stage.topGameParticipantsNum > 4) {
        errors.push('topGameParticipantsNum must be between 2 and 4');
      }
      
      if (!stage.topGameWinnersNum || stage.topGameWinnersNum < 1 || stage.topGameWinnersNum >= stage.topGameParticipantsNum) {
        errors.push('topGameWinnersNum must be at least 1 and less than participants per game');
      }
      
      // Validate that stage can produce participants
      const participantsInStage = this.calculateParticipantsInStage(stage);
      if (participantsInStage <= 0) {
        errors.push(`Stage ${stage.order} would have no participants`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  // Get Olympic stage configuration summary
  getStageInfo(stage) {
    const participantsPerGame = stage.topGameParticipantsNum || 4;
    const winnersPerGame = stage.topGameWinnersNum || 2;
    const participantsInStage = this.calculateParticipantsInStage(stage);
    const totalGames = Math.ceil(participantsInStage / participantsPerGame);
    const winnersFromStage = totalGames * winnersPerGame;
    
    return {
      stageId: stage.id,
      order: stage.order,
      isFinal: stage.isFinal || false,
      participantsInStage,
      participantsPerGame,
      winnersPerGame,
      totalGames,
      winnersFromStage,
      name: stage.name || `Stage ${stage.order}`,
      tournamentType: 'Olympic'
    };
  }
}