// Elimination Calculator Utility
// Schema-agnostic calculator for determining eliminated players when a stage completes

import fs from 'fs';
import path from 'path';

const playersDbPath = path.join(process.cwd(), 'src/app/api/players/db.json');

/**
 * Read all players from database
 */
function readPlayers() {
  try {
    const data = fs.readFileSync(playersDbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading players db.json:', error);
    return [];
  }
}

/**
 * Sort participants by their performance (points + tieBreakResult)
 * @param {Array} participants - Array of participant objects with points and tieBreakResult
 * @returns {Array} - Sorted participants (best performance first)
 */
function sortParticipantsByPerformance(participants) {
  return [...participants].sort((a, b) => {
    // Primary sort: totalPoints (higher is better)
    const aPoints = a.totalPoints || a.points || 0;
    const bPoints = b.totalPoints || b.points || 0;
    if (bPoints !== aPoints) {
      return bPoints - aPoints;
    }
    
    // Secondary sort: totalTieBreak/tieBreakResult (higher is better)
    const aTieBreak = a.totalTieBreak || a.tieBreakResult || 0;
    const bTieBreak = b.totalTieBreak || b.tieBreakResult || 0;
    return bTieBreak - aTieBreak;
  });
}

/**
 * Get all unique participants from a stage's games
 * @param {Array} stageGames - Array of completed games for the stage
 * @returns {Array} - Array of participant objects with aggregated stats
 */
function aggregateStageParticipants(stageGames) {
  const participantStats = new Map();
  
  for (const game of stageGames) {
    if (!game.participants || game.participants.length === 0) {
      continue;
    }
    
    for (const participant of game.participants) {
      if (!participant.playerId) {
        continue;
      }
      
      const playerId = participant.playerId;
      
      if (participantStats.has(playerId)) {
        // Add to existing stats
        const existing = participantStats.get(playerId);
        existing.totalPoints += participant.points || 0;
        existing.totalTieBreak += participant.tieBreakResult || 0;
        existing.gamesPlayed += 1;
      } else {
        // Create new stats entry
        participantStats.set(playerId, {
          playerId: playerId,
          totalPoints: participant.points || 0,
          totalTieBreak: participant.tieBreakResult || 0,
          gamesPlayed: 1,
          // Store the participant object for reference
          participantData: participant
        });
      }
    }
  }
  
  return Array.from(participantStats.values());
}

/**
 * Determine number of winners for a stage based on stage configuration
 * @param {Object} stage - Stage configuration object
 * @param {Array} participants - All participants in the stage
 * @returns {number} - Number of players who advance (winners)
 */
function calculateStageWinners(stage, participants) {
  // Try multiple possible field names for winners configuration
  let winnersCount = 
    stage.gameWinnersNum || 
    stage.topGameWinnersNum || 
    stage.bottomGameWinnersNum;
    
  // If no winners configuration found, use fallback logic
  if (!winnersCount) {
    winnersCount = Math.max(1, Math.floor(participants.length / 2));
  }
    
  console.log(`[EliminationCalculator] Stage ${stage.name} (ID: ${stage.id}): ${participants.length} participants, ${winnersCount} winners per game`);
  
  return Math.min(winnersCount, participants.length);
}

/**
 * Calculate eliminated players for a completed stage
 * @param {Object} stage - Stage configuration object
 * @param {Array} stageGames - Array of completed games for the stage
 * @param {number} totalParticipants - Total participants in tournament (for proper final placement calculation)
 * @returns {Array} - Array of eliminated player objects with stats
 */
export function getEliminatedPlayersForStage(stage, stageGames, totalParticipants = null) {
  console.log(`[EliminationCalculator] Calculating eliminations for stage: ${stage.name} (ID: ${stage.id})`);
  
  if (stageGames.length === 0) {
    console.log(`[EliminationCalculator] No games found in stage ${stage.id}`);
    return [];
  }
  
  const winnersPerGame = stage.gameWinnersNum || stage.topGameWinnersNum || stage.bottomGameWinnersNum || 2;
  const allEliminatedPlayers = [];
  
  // Process each game separately to determine winners and losers per game
  for (const game of stageGames) {
    if (!game.participants || game.participants.length === 0) {
      continue;
    }
    
    // Sort participants in this game by performance (best first)
    const sortedGameParticipants = game.participants
      .map(p => ({
        playerId: p.playerId,
        points: p.points || 0,
        tieBreakResult: p.tieBreakResult || 0,
        totalPoints: p.points || 0,
        totalTieBreak: p.tieBreakResult || 0,
        gamesPlayed: 1,
        participantData: p
      }))
      .sort((a, b) => {
        // Sort by performance (best first)
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        return b.tieBreakResult - a.tieBreakResult;
      });
    
    // Winners advance, losers are eliminated
    const gameWinners = Math.min(winnersPerGame, sortedGameParticipants.length);
    const eliminatedFromGame = sortedGameParticipants.slice(gameWinners);
    
    console.log(`[EliminationCalculator] Game ${game.id}: ${sortedGameParticipants.length} participants, ${gameWinners} advance, ${eliminatedFromGame.length} eliminated`);
    
    // Add eliminated players from this game
    allEliminatedPlayers.push(...eliminatedFromGame);
  }
  
  // Sort all eliminated players by their performance (best eliminated players first)
  const sortedEliminatedPlayers = allEliminatedPlayers.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    return b.tieBreakResult - a.tieBreakResult;
  });
  
  console.log(`[EliminationCalculator] Stage ${stage.id}: Total ${allEliminatedPlayers.length} players eliminated`);
  
  // Calculate final tournament positions for eliminated players
  // Players eliminated earlier get worse positions (higher numbers)
  // Within the same stage, better performance gets better position (lower numbers)
  
  const playersData = readPlayers();
  
  return sortedEliminatedPlayers.map((eliminatedPlayer, index) => {
    // Find player info from database
    const playerInfo = playersData.find(p => p.id === eliminatedPlayer.playerId);
    
    let finalPlacement;
    if (totalParticipants) {
      // Simple logic: find highest occupied place and start from there
      // This will be set by the resultsTableUpdater based on current table state
      finalPlacement = index + 1; // Temporary - will be updated by resultsTableUpdater
    } else {
      // Fallback to simple placement among eliminated
      finalPlacement = index + 1;
    }
    
    return {
      playerId: eliminatedPlayer.playerId,
      playerInfo: playerInfo,
      eliminatedAtStage: stage.id,
      eliminatedAtStageName: stage.name,
      stageOrder: stage.order,
      totalPoints: eliminatedPlayer.totalPoints,
      totalTieBreak: eliminatedPlayer.totalTieBreak,
      gamesPlayed: eliminatedPlayer.gamesPlayed,
      finalPlacement: finalPlacement,
      placementAmongEliminated: index + 1,
      eliminationDate: new Date().toISOString()
    };
  });
}

/**
 * Special handling for final stage - determine 1st, 2nd, 3rd places
 * @param {Object} stage - Final stage configuration object  
 * @param {Array} finalGames - Array of final stage games
 * @returns {Array} - Array of all players with final placements
 */
export function getFinalStageResults(stage, finalGames) {
  console.log(`[EliminationCalculator] Processing final stage: ${stage.name} (ID: ${stage.id})`);
  
  const finalParticipants = aggregateStageParticipants(finalGames);
  
  if (finalParticipants.length === 0) {
    console.log(`[EliminationCalculator] No participants found in final stage ${stage.id}`);
    return [];
  }
  
  // Sort by performance (best first)
  const sortedParticipants = sortParticipantsByPerformance(finalParticipants);
  
  const playersData = readPlayers();
  
  return sortedParticipants.map((participant, index) => {
    const playerInfo = playersData.find(p => p.id === participant.playerId);
    
    return {
      playerId: participant.playerId,
      playerInfo: playerInfo,
      finalPlacement: index + 1, // 1st, 2nd, 3rd, 4th...
      eliminatedAtStage: stage.id,
      eliminatedAtStageName: stage.name,
      stageOrder: stage.order,
      totalPoints: participant.totalPoints,
      totalTieBreak: participant.totalTieBreak,
      gamesPlayed: participant.gamesPlayed,
      isFinalResults: true,
      eliminationDate: new Date().toISOString()
    };
  });
}

/**
 * Calculate final tournament placement for eliminated players
 * This considers previously eliminated players to assign correct overall placement
 * @param {Array} eliminatedPlayers - New eliminated players from current stage
 * @param {Array} existingResults - Previously eliminated players from earlier stages  
 * @returns {Array} - Eliminated players with final placement numbers
 */
export function calculateFinalPlacements(eliminatedPlayers, existingResults) {
  // Players eliminated later get better placements (lower numbers)
  // Within the same stage, better performance gets better placement
  
  const totalExistingPlayers = existingResults.length;
  
  return eliminatedPlayers.map((player, index) => ({
    ...player,
    finalPlacement: totalExistingPlayers + index + 1
  }));
}