// Stage Completion Checker Utility
// Determines when a tournament stage has all games completed

import { getGamesByTournament, getGamesByStage } from '../../lib/data/games.js';

/**
 * Check if a game is completed
 */
function isGameCompleted(game) {
  return game.completed === true || game.status === 'completed';
}

/**
 * Get all games for a specific tournament stage
 */
export async function getStageGames(tournamentId, stageId) {
  return getGamesByStage(tournamentId, stageId);
}

/**
 * Check if all games in a stage are completed
 */
export async function isStageCompleted(tournamentId, stageId) {
  const stageGames = await getStageGames(tournamentId, stageId);

  if (stageGames.length === 0) return false;

  const completedGames = stageGames.filter(isGameCompleted);
  const completed = completedGames.length === stageGames.length;

  console.log(`[StageChecker] Stage ${stageId} in tournament ${tournamentId}: ${completedGames.length}/${stageGames.length} games completed (${completed ? 'COMPLETE' : 'INCOMPLETE'})`);

  return completed;
}

/**
 * Get completion status for all stages in a tournament
 */
export async function getTournamentCompletionStatus(tournamentId, stages) {
  const completionStatus = {};

  for (const stage of stages) {
    const stageGames = await getStageGames(tournamentId, stage.id);
    const completedGames = stageGames.filter(isGameCompleted);

    completionStatus[stage.id] = {
      stageId: stage.id,
      stageName: stage.name,
      stageOrder: stage.order,
      totalGames: stageGames.length,
      completedGames: completedGames.length,
      isCompleted: stageGames.length > 0 && completedGames.length === stageGames.length,
      completionPercentage:
        stageGames.length > 0
          ? Math.round((completedGames.length / stageGames.length) * 100)
          : 0,
    };
  }

  return completionStatus;
}

/**
 * Get the most recently completed stage for a tournament
 */
export async function getLastCompletedStage(tournamentId, stages) {
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);
  let lastCompletedStage = null;

  for (const stage of sortedStages) {
    if (await isStageCompleted(tournamentId, stage.id)) {
      lastCompletedStage = stage;
    } else {
      break;
    }
  }

  return lastCompletedStage;
}

/**
 * Check if a stage just completed (after a game was completed)
 */
export async function didStageJustComplete(tournamentId, stageId, justCompletedGameId) {
  const stageGames = await getStageGames(tournamentId, stageId);

  if (stageGames.length === 0) return false;

  const completedGames = stageGames.filter(isGameCompleted);
  const isStageComplete = completedGames.length === stageGames.length;
  const justCompletedGameInStage = completedGames.some(
    game => game.id === parseInt(justCompletedGameId)
  );

  console.log(`[StageChecker] Stage completion check: ${completedGames.length}/${stageGames.length} games complete, stage complete: ${isStageComplete}, just completed game in stage: ${justCompletedGameInStage}`);

  return isStageComplete && justCompletedGameInStage;
}
