// Double Elimination Game Creator - Creates games for Double Elimination tournaments
// Uses bracket system with upper and lower brackets

import { BaseGameCreator } from './BaseGameCreator.js';

export class DoubleEliminationGameCreator extends BaseGameCreator {
  // Create all games for a Double Elimination stage
  async createStageGames(stage) {
    const games = [];
    let currentGameNumber = await this.getNextGameNumber();
    
    // Calculate total games for this stage
    const topBracketGames = stage.topBracketGameNum || 0;
    const bottomBracketGames = stage.bottomBracketGamesNum || 0;
    const totalGames = topBracketGames + bottomBracketGames;
    
    // Get stage themes
    const stageThemes = stage.stageThemes || [];
    
    console.log(`[DoubleEliminationGameCreator] Creating ${totalGames} games for stage ${stage.order}`);
    console.log(`[DoubleEliminationGameCreator] Top bracket: ${topBracketGames}, Bottom bracket: ${bottomBracketGames}`);
    
    // Create upper bracket games first
    for (let i = 0; i < topBracketGames; i++) {
      const game = this.createGame({
        gameNumber: currentGameNumber,
        stageId: stage.id,
        bracketType: 'upper',
        playersPerGame: stage.numberOfPlayers || 4,
        gameIndex: i,
        stageThemes: stageThemes
      });
      
      games.push(game);
      currentGameNumber++;
    }
    
    // Create lower bracket games
    for (let i = 0; i < bottomBracketGames; i++) {
      const game = this.createGame({
        gameNumber: currentGameNumber,
        stageId: stage.id,
        bracketType: 'lower',
        playersPerGame: stage.numberOfPlayers || 4,
        gameIndex: i,
        stageThemes: stageThemes
      });
      
      games.push(game);
      currentGameNumber++;
    }
    
    // Handle final stage (no bracket type)
    if (stage.isFinal && totalGames === 0) {
      const game = this.createGame({
        gameNumber: currentGameNumber,
        stageId: stage.id,
        bracketType: null,
        playersPerGame: stage.numberOfPlayers || 4,
        gameIndex: 0,
        stageThemes: stageThemes
      });
      
      games.push(game);
    }
    
    console.log(`[DoubleEliminationGameCreator] Created ${games.length} games with numbers ${games[0]?.gameNumber} to ${games[games.length - 1]?.gameNumber}`);
    
    return games;
  }

  // Validate Double Elimination stage configuration
  validateStageConfiguration(stage) {
    const errors = [];
    
    if (!stage.id) {
      errors.push('Stage must have an ID');
    }
    
    if (!stage.order || stage.order < 1) {
      errors.push('Stage must have a valid order (>= 1)');
    }
    
    const topBracketGames = stage.topBracketGameNum || 0;
    const bottomBracketGames = stage.bottomBracketGamesNum || 0;
    const totalGames = topBracketGames + bottomBracketGames;
    
    if (stage.order > 1 && totalGames === 0 && !stage.isFinal) {
      errors.push('Non-final stages after stage 1 must have at least one game');
    }
    
    if (stage.numberOfPlayers && (stage.numberOfPlayers < 2 || stage.numberOfPlayers > 4)) {
      errors.push('Number of players per game must be between 2 and 4');
    }
    
    // Double Elimination specific validations
    if (!stage.isFinal) {
      if (typeof stage.topBracketGameNum !== 'number' || stage.topBracketGameNum < 0) {
        errors.push('topBracketGameNum must be a non-negative number');
      }
      if (typeof stage.bottomBracketGamesNum !== 'number' || stage.bottomBracketGamesNum < 0) {
        errors.push('bottomBracketGamesNum must be a non-negative number');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  // Get Double Elimination stage configuration summary
  getStageInfo(stage) {
    const topBracketGames = stage.topBracketGameNum || 0;
    const bottomBracketGames = stage.bottomBracketGamesNum || 0;
    const totalGames = topBracketGames + bottomBracketGames;
    const playersPerGame = stage.numberOfPlayers || 4;
    const totalPlayers = totalGames * playersPerGame;
    
    return {
      stageId: stage.id,
      order: stage.order,
      isFinal: stage.isFinal || false,
      topBracketGames,
      bottomBracketGames,
      totalGames,
      playersPerGame,
      totalPlayers,
      name: stage.name || `Stage ${stage.order}`,
      tournamentType: 'Double Elimination'
    };
  }
}