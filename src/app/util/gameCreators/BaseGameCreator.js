// Base Game Creator - Abstract interface for tournament-specific game creation
// Different tournament types implement this interface with their own logic

export class BaseGameCreator {
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

  // Create a single game with proper structure
  createGame({ gameNumber, stageId, bracketType, playersPerGame, gameIndex, stageThemes = [] }) {
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
      stageThemes: stageThemes, // Theme names for this stage
      results: null,
      createdAt: new Date().toISOString()
    };
    
    console.log(`[GameCreator] Created game ${gameNumber} (${bracketType || 'final'} bracket, index ${gameIndex})`);
    
    return game;
  }

  // Abstract methods - must be implemented by subclasses
  async createStageGames(stage) {
    throw new Error('createStageGames must be implemented by subclass');
  }

  validateStageConfiguration(stage) {
    throw new Error('validateStageConfiguration must be implemented by subclass');
  }

  getStageInfo(stage) {
    throw new Error('getStageInfo must be implemented by subclass');
  }
}