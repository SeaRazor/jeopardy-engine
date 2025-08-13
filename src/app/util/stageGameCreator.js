// Stage Game Creator - Systematic game generation based on stage configuration
// Creates ALL games for a stage with proper sequential numbering and bracket types

export class StageGameCreator {
  constructor(tournament) {
    this.tournament = tournament;
  }

  // Get the next available game number for the tournament
  async getNextGameNumber() {
    try {
      const response = await fetch(`/api/tournaments/${this.tournament.id}/games`);
      if (!response.ok) {
        return 1; // Start with game 1 if no games exist
      }
      
      const allGames = await response.json();
      if (allGames.length === 0) {
        return 1;
      }
      
      // Find the highest game number and add 1
      const maxGameNumber = Math.max(...allGames.map(game => game.gameNumber || 0));
      return maxGameNumber + 1;
    } catch (error) {
      console.error('Error getting next game number:', error);
      return 1;
    }
  }

  // Create all games for a specific stage
  async createStageGames(stage) {
    const games = [];
    let currentGameNumber = await this.getNextGameNumber();
    
    // Calculate total games for this stage
    const topBracketGames = stage.topBracketGameNum || 0;
    const bottomBracketGames = stage.bottomBracketGamesNum || 0;
    const totalGames = topBracketGames + bottomBracketGames;
    
    console.log(`[StageGameCreator] Creating ${totalGames} games for stage ${stage.order}`);
    console.log(`[StageGameCreator] Top bracket: ${topBracketGames}, Bottom bracket: ${bottomBracketGames}`);
    
    // Create high-bracket games first
    for (let i = 0; i < topBracketGames; i++) {
      const game = this.createGame({
        gameNumber: currentGameNumber,
        stageId: stage.id,
        bracketType: 'upper',
        playersPerGame: stage.numberOfPlayers || 4,
        gameIndex: i
      });
      
      games.push(game);
      currentGameNumber++;
    }
    
    // Create low-bracket games
    for (let i = 0; i < bottomBracketGames; i++) {
      const game = this.createGame({
        gameNumber: currentGameNumber,
        stageId: stage.id,
        bracketType: 'lower',
        playersPerGame: stage.numberOfPlayers || 4,
        gameIndex: i
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
        gameIndex: 0
      });
      
      games.push(game);
    }
    
    console.log(`[StageGameCreator] Created ${games.length} games with numbers ${games[0]?.gameNumber} to ${games[games.length - 1]?.gameNumber}`);
    
    return games;
  }

  // Create a single game with proper structure
  createGame({ gameNumber, stageId, bracketType, playersPerGame, gameIndex }) {
    const game = {
      id: gameNumber, // Use gameNumber as ID for simplicity
      gameNumber: gameNumber,
      stageId: stageId,
      tournamentId: this.tournament.id,
      bracketType: bracketType, // 'upper', 'lower', or null for finals
      gameIndex: gameIndex, // Position within bracket type
      isFinished: false,
      isTop: bracketType === 'upper' || bracketType === null,
      participants: [], // Will be filled by participant distributor
      themes: [],
      results: null,
      createdAt: new Date().toISOString()
    };
    
    console.log(`[StageGameCreator] Created game ${gameNumber} (${bracketType || 'final'} bracket, index ${gameIndex})`);
    
    return game;
  }

  // Validate stage configuration before creating games
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
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  // Get stage configuration summary
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
      name: stage.name || `Stage ${stage.order}`
    };
  }
}

// Factory function
export const createStageGameCreator = (tournament) => {
  return new StageGameCreator(tournament);
};