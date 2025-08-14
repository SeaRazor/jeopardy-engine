// Participant Distributor - Factory-based participant assignment using tournament-specific strategies
// Delegates to appropriate participant distributor based on tournament schema

import { ParticipantDistributorFactory } from './participantDistributors/ParticipantDistributorFactory.js';

export class ParticipantDistributor {
  constructor(tournament) {
    this.tournament = tournament;
    this.participantDistributor = ParticipantDistributorFactory.createParticipantDistributor(tournament);
  }

  // Main method to assign participants to all games in a stage using tournament-specific strategy
  async assignStageParticipants(stage, games) {
    console.log(`[ParticipantDistributor] Delegating to ${this.participantDistributor.constructor.name} for stage ${stage.order}`);
    return await this.participantDistributor.assignStageParticipants(stage, games);
  }

  // Delegate to tournament-specific participant distributor
  async assignGameParticipants(game, stage, sourceGames, allGames) {
    return await this.participantDistributor.assignGameParticipants(game, stage, sourceGames, allGames);
  }

  // Delegate common helper methods to the tournament-specific distributor
  // These methods remain for backward compatibility with existing code
  
  // Get tournament games
  async getAllTournamentGames() {
    return await this.participantDistributor.getAllTournamentGames();
  }
  
  // Find source games
  findSourceGames(stage, allGames) {
    return this.participantDistributor.findSourceGames(stage, allGames);
  }
  
  // Find previous stage
  findPreviousStage(stage) {
    return this.participantDistributor.findPreviousStage(stage);
  }
  
  // Find stage by ID
  findStageById(stageId) {
    return this.participantDistributor.findStageById(stageId);
  }
  
  // Assign empty participants
  assignEmptyParticipants(games, playersPerGame) {
    return this.participantDistributor.assignEmptyParticipants(games, playersPerGame);
  }
  
  // Create empty participant
  createEmptyParticipant() {
    return this.participantDistributor.createEmptyParticipant();
  }

  // Legacy methods - these now delegate to the specific tournament distributor
  // Keeping for backward compatibility but should use the specific distributors directly
  
  selectParticipantsWithRematchAvoidance(game, availableParticipants, playersNeeded) {
    return this.participantDistributor.selectParticipantsWithRematchAvoidance(game, availableParticipants, playersNeeded);
  }
}

// Factory function
export const createParticipantDistributor = (tournament) => {
  return new ParticipantDistributor(tournament);
};
