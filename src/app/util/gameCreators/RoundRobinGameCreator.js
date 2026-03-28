// Round Robin Game Creator - Creates games for Round Robin with Playoff tournaments
// Group stage: round-robin games within each group
// Playoff stages: single elimination (like Olympic)

import { BaseGameCreator } from './BaseGameCreator.js';

export class RoundRobinGameCreator extends BaseGameCreator {

  // Create all games for a stage
  async createStageGames(stage) {
    const games = [];
    let currentGameNumber = await this.getNextGameNumber();
    const stageThemes = stage.stageThemes || [];

    if (stage.isFinal) {
      // Final: one game, no bracket type
      const game = this.createGame({
        gameNumber: currentGameNumber,
        stageId: stage.id,
        bracketType: null,
        playersPerGame: stage.topGameParticipantsNum || 4,
        gameIndex: 0,
        stageThemes,
      });
      games.push(game);
      return games;
    }

    const playersPerGame = stage.topGameParticipantsNum || 4;
    const numberOfGroups = stage.numberOfGroups || 0;

    if (numberOfGroups > 0) {
      // Group stage: one game per group per round
      // Each group has participantsNum / numberOfGroups players
      const participantsNum = this.tournament.schema?.participantsNum || 16;
      const playersPerGroup = Math.ceil(participantsNum / numberOfGroups);
      const gamesPerGroup = Math.ceil(playersPerGroup / playersPerGame);

      for (let g = 0; g < numberOfGroups; g++) {
        for (let i = 0; i < gamesPerGroup; i++) {
          const game = this.createGame({
            gameNumber: currentGameNumber,
            stageId: stage.id,
            bracketType: 'upper',
            playersPerGame,
            gameIndex: g * gamesPerGroup + i,
            stageThemes,
          });
          games.push(game);
          currentGameNumber++;
        }
      }
    } else {
      // Playoff stage: calculate participants from previous stage winners
      const participantsInStage = this.calculateParticipantsInStage(stage);
      const gamesNeeded = Math.ceil(participantsInStage / playersPerGame);

      for (let i = 0; i < gamesNeeded; i++) {
        const game = this.createGame({
          gameNumber: currentGameNumber,
          stageId: stage.id,
          bracketType: 'upper',
          playersPerGame,
          gameIndex: i,
          stageThemes,
        });
        games.push(game);
        currentGameNumber++;
      }
    }

    console.log(`[RoundRobinGameCreator] Created ${games.length} games for stage ${stage.order}`);
    return games;
  }

  calculateParticipantsInStage(stage) {
    if (stage.numberOfGroups > 0) {
      return this.tournament.schema?.participantsNum || 16;
    }

    const previousStage = this.tournament.schema?.stages?.find(s => s.order === stage.order - 1);
    if (!previousStage) return 0;

    if (previousStage.numberOfGroups > 0) {
      // After group stage: numberOfGroups × winnersPerGroup advance
      const winnersPerGroup = previousStage.topGameWinnersNum || 2;
      return previousStage.numberOfGroups * winnersPerGroup;
    }

    const prevPlayersPerGame = previousStage.topGameParticipantsNum || 4;
    const prevWinnersPerGame = previousStage.topGameWinnersNum || 2;
    const prevParticipants = this.calculateParticipantsInStage(previousStage);
    const prevGames = Math.ceil(prevParticipants / prevPlayersPerGame);
    return prevGames * prevWinnersPerGame;
  }

  validateStageConfiguration(stage) {
    const errors = [];

    if (!stage.id) errors.push('Stage must have an ID');
    if (!stage.order || stage.order < 1) errors.push('Stage must have a valid order (>= 1)');

    if (!stage.isFinal) {
      const hasGroups = stage.numberOfGroups > 0;
      const participantsInStage = this.calculateParticipantsInStage(stage);

      if (!hasGroups && participantsInStage <= 0) {
        errors.push(`Stage ${stage.order} would have no participants`);
      }

      if (!stage.topGameParticipantsNum || stage.topGameParticipantsNum < 2) {
        errors.push('topGameParticipantsNum must be at least 2');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  getStageInfo(stage) {
    return {
      stageId: stage.id,
      order: stage.order,
      isFinal: stage.isFinal || false,
      name: stage.name || `Stage ${stage.order}`,
      tournamentType: 'Round Robin',
    };
  }
}
