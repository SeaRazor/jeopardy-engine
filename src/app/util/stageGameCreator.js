// Stage Game Creator - Factory-based game creation using tournament-specific strategies
// Delegates to appropriate game creator based on tournament schema

import { GameCreatorFactory } from './gameCreators/GameCreatorFactory.js';

export class StageGameCreator {
  constructor(tournament) {
    this.tournament = tournament;
    this.gameCreator = GameCreatorFactory.createGameCreator(tournament);
  }

  // Delegate to tournament-specific game creator
  async getNextGameNumber() {
    return await this.gameCreator.getNextGameNumber();
  }

  // Create all games for a specific stage using tournament-specific strategy
  async createStageGames(stage) {
    console.log(`[StageGameCreator] Delegating to ${this.gameCreator.constructor.name} for stage ${stage.order}`);
    return await this.gameCreator.createStageGames(stage);
  }

  // Delegate to tournament-specific game creator
  createGame(params) {
    return this.gameCreator.createGame(params);
  }

  // Validate stage configuration using tournament-specific validation
  validateStageConfiguration(stage) {
    console.log(`[StageGameCreator] Validating stage ${stage.order} with ${this.gameCreator.constructor.name}`);
    return this.gameCreator.validateStageConfiguration(stage);
  }

  // Get stage configuration summary using tournament-specific logic
  getStageInfo(stage) {
    return this.gameCreator.getStageInfo(stage);
  }
}

// Factory function
export const createStageGameCreator = (tournament) => {
  return new StageGameCreator(tournament);
};