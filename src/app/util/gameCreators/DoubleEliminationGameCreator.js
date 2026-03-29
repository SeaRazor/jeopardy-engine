// Double Elimination Game Creator - Creates games for Double Elimination tournaments
// Uses bracket system with upper and lower brackets.
//
// Unified stage fields (same as Olympic/RoundRobin):
//   topGameParticipantsNum  - players per upper bracket game (0 = upper bracket has a bye this stage)
//   topGameWinnersNum       - winners advancing from each upper bracket game
//   bottomGameParticipantsNum - players per lower bracket game
//   bottomGameWinnersNum    - winners advancing from each lower bracket game

import { BaseGameCreator } from './BaseGameCreator.js';

export class DoubleEliminationGameCreator extends BaseGameCreator {

  // Recursively calculate how many games each bracket plays in a given stage,
  // tracking survivors through bye stages where topGameParticipantsNum === 0.
  calculateBracketGameCounts(stage) {
    if (stage.order === 1) {
      const total = this.tournament.schema?.participantsNum || 0;
      const topPerGame = stage.topGameParticipantsNum || 4;
      const topGames = topPerGame > 0 ? Math.ceil(total / topPerGame) : 0;
      return {
        topBracketGames: topGames,
        bottomBracketGames: 0,
        _upperSurvivors: topGames * (stage.topGameWinnersNum || 2),
        _lowerSurvivors: 0,
      };
    }

    const prevStage = this.tournament.schema?.stages?.find(s => s.order === stage.order - 1);
    if (!prevStage) {
      return { topBracketGames: 0, bottomBracketGames: 0, _upperSurvivors: 0, _lowerSurvivors: 0 };
    }

    const prev = this.calculateBracketGameCounts(prevStage);
    const prevHadUpperGames = (prevStage.topGameParticipantsNum || 0) > 0;

    // Players entering each bracket this stage
    const upperEntrants = prev._upperSurvivors;
    const prevUpperLosers = prevHadUpperGames
      ? prev.topBracketGames * ((prevStage.topGameParticipantsNum || 4) - (prevStage.topGameWinnersNum || 2))
      : 0;
    const lowerEntrants = prev._lowerSurvivors + prevUpperLosers;

    const topPerGame = stage.topGameParticipantsNum || 0;
    const bottomPerGame = stage.bottomGameParticipantsNum || 4;

    const topGames = topPerGame > 0 && upperEntrants > 0 ? Math.ceil(upperEntrants / topPerGame) : 0;
    const bottomGames = lowerEntrants > 0 ? Math.ceil(lowerEntrants / bottomPerGame) : 0;

    // When upper bracket has a bye, survivors persist unchanged to the next stage
    const upperSurvivors = topGames > 0
      ? topGames * (stage.topGameWinnersNum || 2)
      : upperEntrants;
    const lowerSurvivors = bottomGames * (stage.bottomGameWinnersNum || 2);

    return {
      topBracketGames: topGames,
      bottomBracketGames: bottomGames,
      _upperSurvivors: upperSurvivors,
      _lowerSurvivors: lowerSurvivors,
    };
  }

  async createStageGames(stage) {
    const games = [];
    let currentGameNumber = await this.getNextGameNumber();
    const stageThemes = stage.stageThemes || [];

    if (stage.isFinal) {
      games.push(this.createGame({
        gameNumber: currentGameNumber,
        stageId: stage.id,
        bracketType: null,
        playersPerGame: stage.topGameParticipantsNum || 4,
        gameIndex: 0,
        stageThemes,
      }));
      return games;
    }

    const { topBracketGames, bottomBracketGames } = this.calculateBracketGameCounts(stage);

    console.log(`[DoubleEliminationGameCreator] Stage ${stage.order}: ${topBracketGames} upper + ${bottomBracketGames} lower games`);

    for (let i = 0; i < topBracketGames; i++) {
      games.push(this.createGame({
        gameNumber: currentGameNumber++,
        stageId: stage.id,
        bracketType: 'upper',
        playersPerGame: stage.topGameParticipantsNum || 4,
        gameIndex: i,
        stageThemes,
      }));
    }

    for (let i = 0; i < bottomBracketGames; i++) {
      games.push(this.createGame({
        gameNumber: currentGameNumber++,
        stageId: stage.id,
        bracketType: 'lower',
        playersPerGame: stage.bottomGameParticipantsNum || 4,
        gameIndex: i,
        stageThemes,
      }));
    }

    return games;
  }

  validateStageConfiguration(stage) {
    const errors = [];

    if (!stage.id) errors.push('Stage must have an ID');
    if (!stage.order || stage.order < 1) errors.push('Stage must have a valid order (>= 1)');

    if (!stage.isFinal) {
      const topPerGame = stage.topGameParticipantsNum ?? 0;
      const bottomPerGame = stage.bottomGameParticipantsNum ?? 0;

      if (topPerGame > 0 && (topPerGame < 2 || topPerGame > 4)) {
        errors.push('topGameParticipantsNum must be 0 (bye) or between 2 and 4');
      }
      if (bottomPerGame > 0 && (bottomPerGame < 2 || bottomPerGame > 4)) {
        errors.push('bottomGameParticipantsNum must be 0 or between 2 and 4');
      }

      const { topBracketGames, bottomBracketGames } = this.calculateBracketGameCounts(stage);
      if (stage.order > 1 && topBracketGames + bottomBracketGames === 0) {
        errors.push('Non-final stages after stage 1 must produce at least one game');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  getStageInfo(stage) {
    const { topBracketGames, bottomBracketGames } = this.calculateBracketGameCounts(stage);
    return {
      stageId: stage.id,
      order: stage.order,
      isFinal: stage.isFinal || false,
      topBracketGames,
      bottomBracketGames,
      totalGames: topBracketGames + bottomBracketGames,
      name: stage.name || `Stage ${stage.order}`,
      tournamentType: 'Double Elimination',
    };
  }
}
