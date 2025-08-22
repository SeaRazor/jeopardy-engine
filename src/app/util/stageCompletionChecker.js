// Stage Completion Checker Utility
// Determines when a tournament stage has all games completed

import fs from 'fs';
import path from 'path';

const gamesDbPath = path.join(process.cwd(), 'src/app/api/games/db.json');

/**
 * Read all games from database
 */
function readGames() {
  try {
    const data = fs.readFileSync(gamesDbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading games db.json:', error);
    return [];
  }
}

/**
 * Check if a game is completed
 * @param {Object} game - Game object
 * @returns {boolean} - True if game is completed
 */
function isGameCompleted(game) {
  return game.completed === true || game.status === 'completed';
}

/**
 * Get all games for a specific tournament stage
 * @param {number} tournamentId - Tournament ID
 * @param {number} stageId - Stage ID
 * @returns {Array} - Array of games for the stage
 */
export function getStageGames(tournamentId, stageId) {
  const games = readGames();
  return games.filter(game => 
    game.tournamentId === parseInt(tournamentId) && 
    game.stageId === parseInt(stageId)
  );
}

/**
 * Check if all games in a stage are completed
 * @param {number} tournamentId - Tournament ID
 * @param {number} stageId - Stage ID
 * @returns {boolean} - True if stage is completed
 */
export function isStageCompleted(tournamentId, stageId) {
  const stageGames = getStageGames(tournamentId, stageId);
  
  // If no games exist for the stage, it's not completed
  if (stageGames.length === 0) {
    return false;
  }
  
  // Check if ALL games in the stage are completed
  const completedGames = stageGames.filter(isGameCompleted);
  const isCompleted = completedGames.length === stageGames.length;
  
  console.log(`[StageChecker] Stage ${stageId} in tournament ${tournamentId}: ${completedGames.length}/${stageGames.length} games completed (${isCompleted ? 'COMPLETE' : 'INCOMPLETE'})`);
  
  return isCompleted;
}

/**
 * Get completion status for all stages in a tournament
 * @param {number} tournamentId - Tournament ID
 * @param {Array} stages - Array of stage objects from tournament schema
 * @returns {Object} - Object with stage completion status
 */
export function getTournamentCompletionStatus(tournamentId, stages) {
  const completionStatus = {};
  
  for (const stage of stages) {
    const stageGames = getStageGames(tournamentId, stage.id);
    const completedGames = stageGames.filter(isGameCompleted);
    
    completionStatus[stage.id] = {
      stageId: stage.id,
      stageName: stage.name,
      stageOrder: stage.order,
      totalGames: stageGames.length,
      completedGames: completedGames.length,
      isCompleted: stageGames.length > 0 && completedGames.length === stageGames.length,
      completionPercentage: stageGames.length > 0 ? Math.round((completedGames.length / stageGames.length) * 100) : 0
    };
  }
  
  return completionStatus;
}

/**
 * Get the most recently completed stage for a tournament
 * @param {number} tournamentId - Tournament ID
 * @param {Array} stages - Array of stage objects ordered by stage.order
 * @returns {Object|null} - Most recently completed stage or null
 */
export function getLastCompletedStage(tournamentId, stages) {
  // Sort stages by order (ascending)
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);
  
  let lastCompletedStage = null;
  
  for (const stage of sortedStages) {
    if (isStageCompleted(tournamentId, stage.id)) {
      lastCompletedStage = stage;
    } else {
      // Once we find an incomplete stage, stop (stages are ordered)
      break;
    }
  }
  
  return lastCompletedStage;
}

/**
 * Check if a stage just completed (useful for triggering results updates)
 * This function should be called after a game completion to check if the stage just finished
 * @param {number} tournamentId - Tournament ID
 * @param {number} stageId - Stage ID
 * @param {number} justCompletedGameId - ID of the game that was just completed
 * @returns {boolean} - True if this game completion caused the stage to complete
 */
export function didStageJustComplete(tournamentId, stageId, justCompletedGameId) {
  const stageGames = getStageGames(tournamentId, stageId);
  
  if (stageGames.length === 0) {
    return false;
  }
  
  const completedGames = stageGames.filter(isGameCompleted);
  const isStageComplete = completedGames.length === stageGames.length;
  
  // Check if the just-completed game is in the completed games list
  const justCompletedGameInStage = completedGames.some(game => game.id === parseInt(justCompletedGameId));
  
  console.log(`[StageChecker] Stage completion check: ${completedGames.length}/${stageGames.length} games complete, stage complete: ${isStageComplete}, just completed game in stage: ${justCompletedGameInStage}`);
  
  return isStageComplete && justCompletedGameInStage;
}