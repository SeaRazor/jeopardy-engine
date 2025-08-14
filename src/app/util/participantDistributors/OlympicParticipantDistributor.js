// Olympic Participant Distributor - Handles single elimination participant assignment
// No brackets - direct progression based on stage winners

import { BaseParticipantDistributor } from './BaseParticipantDistributor.js';

export class OlympicParticipantDistributor extends BaseParticipantDistributor {
  // Main method to assign participants to all games in a stage
  async assignStageParticipants(stage, games) {
    console.log(`[OlympicParticipantDistributor] Assigning participants for stage ${stage.order}`);
    
    // Stage 1 gets empty participants (manual assignment)
    if (stage.order === 1) {
      return this.assignEmptyParticipants(games, stage.topGameParticipantsNum || 4);
    }
    
    // Get all tournament games for reference lookup
    const allGames = await this.getAllTournamentGames();
    
    // Find source games from previous stages
    const sourceGames = this.findSourceGames(stage, allGames);
    
    // Assign participants to all games in stage
    const updatedGames = [];
    for (const game of games) {
      const gameWithParticipants = await this.assignGameParticipants(game, stage, sourceGames, allGames);
      updatedGames.push(gameWithParticipants);
    }
    
    return updatedGames;
  }

  // Assign participants to a single game
  async assignGameParticipants(game, stage, sourceGames, allGames) {
    const participants = [];
    const playersPerGame = stage.topGameParticipantsNum || 4;
    
    console.log(`[OlympicParticipantDistributor] Assigning participants to game ${game.gameNumber} in stage ${stage.order}`);
    
    if (stage.isFinal) {
      // Final stage: get winners from previous stage
      participants.push(...this.getFinalParticipants(game, stage, sourceGames, playersPerGame));
    } else {
      // Non-final stage: get winners from previous stage
      participants.push(...this.getStageParticipants(game, stage, sourceGames, playersPerGame));
    }
    
    // Trim if too many participants
    if (participants.length > playersPerGame) {
      participants.splice(playersPerGame);
    }
    
    console.log(`[OlympicParticipantDistributor] Game ${game.gameNumber} assigned ${participants.length} participants`);
    
    return {
      ...game,
      participants: participants
    };
  }

  // Get participants for non-final Olympic stages
  getStageParticipants(game, stage, sourceGames, playersPerGame) {
    const participants = [];
    
    // Get previous stage
    const prevStage = this.findPreviousStage(stage);
    if (!prevStage) {
      console.log(`[OlympicParticipantDistributor] No previous stage found for stage ${stage.order}`);
      return participants;
    }
    
    // Get games from previous stage (all games are effectively 'upper' bracket in Olympic)
    const prevStageGames = sourceGames.filter(g => g.stageId === prevStage.id)
      .sort((a, b) => a.gameNumber - b.gameNumber);
    
    if (prevStageGames.length === 0) {
      console.log(`[OlympicParticipantDistributor] No games found in previous stage ${prevStage.order}`);
      return participants;
    }
    
    // Get winners from previous stage
    const winnersPerGame = prevStage.topGameWinnersNum || 2;
    const allWinners = [];
    
    console.log(`[OlympicParticipantDistributor] Stage ${stage.order}: Found ${prevStageGames.length} games in previous stage, ${winnersPerGame} winners each`);
    
    for (const sourceGame of prevStageGames) {
      for (let position = 1; position <= winnersPerGame; position++) {
        allWinners.push({
          gameNumber: sourceGame.gameNumber,
          position: position
        });
      }
    }
    
    console.log(`[OlympicParticipantDistributor] Stage ${stage.order}: Total ${allWinners.length} winners available from previous stage`);
    
    // Distribute winners using smart re-match avoidance
    const selectedWinners = this.selectParticipantsWithRematchAvoidance(
      game, allWinners, playersPerGame
    );
    
    console.log(`[OlympicParticipantDistributor] Stage ${stage.order}: Selected ${selectedWinners.length} winners for game ${game.gameNumber}`);
    
    for (const winner of selectedWinners) {
      participants.push(
        this.createParticipantWithReference(
          this.createPlayerReference(winner.gameNumber, winner.position)
        )
      );
    }
    
    return participants;
  }

  // Get participants for Olympic final stage
  getFinalParticipants(game, stage, sourceGames, playersPerGame) {
    const participants = [];
    
    const prevStage = this.findPreviousStage(stage);
    if (!prevStage) {
      console.log(`[OlympicParticipantDistributor] Final: No previous stage found`);
      return participants;
    }
    
    console.log(`[OlympicParticipantDistributor] Final: Collecting participants from stage ${prevStage.order}`);
    
    // Get winners from previous stage
    const prevStageGames = sourceGames.filter(g => g.stageId === prevStage.id)
      .sort((a, b) => a.gameNumber - b.gameNumber);
    
    if (prevStageGames.length === 0) {
      console.log(`[OlympicParticipantDistributor] Final: No games found in previous stage`);
      return participants;
    }
    
    const winnersPerPrevGame = prevStage.topGameWinnersNum || 2;
    
    console.log(`[OlympicParticipantDistributor] Final: Found ${prevStageGames.length} games in previous stage, ${winnersPerPrevGame} winners each`);
    
    for (const sourceGame of prevStageGames) {
      for (let position = 1; position <= winnersPerPrevGame && participants.length < playersPerGame; position++) {
        participants.push(
          this.createParticipantWithReference(
            this.createPlayerReference(sourceGame.gameNumber, position)
          )
        );
        console.log(`[OlympicParticipantDistributor] Final: Added winner from game ${sourceGame.gameNumber} position ${position}`);
      }
    }
    
    console.log(`[OlympicParticipantDistributor] Final: Total ${participants.length} participants assigned`);
    
    return participants;
  }
}