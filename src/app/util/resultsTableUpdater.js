// Results Table Updater Utility
// Updates tournament results table when stages complete

import fs from 'fs';
import path from 'path';
import { getEliminatedPlayersForStage, getFinalStageResults, calculateFinalPlacements } from './eliminationCalculator.js';

const tournamentsDbPath = path.join(process.cwd(), 'src/app/api/tournaments/db.json');

/**
 * Initialize results table with empty slots for all positions
 * @param {number} totalParticipants - Total number of participants in tournament
 * @returns {Array} - Array with null values for all positions
 */
function initializeResultsTable(totalParticipants) {
  console.log(`[ResultsUpdater] Initializing results table with ${totalParticipants} positions`);
  return new Array(totalParticipants).fill(null);
}

/**
 * Read tournaments database
 */
function readTournaments() {
  try {
    const data = fs.readFileSync(tournamentsDbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading tournaments db.json:', error);
    return [];
  }
}

/**
 * Write tournaments database
 */
function writeTournaments(tournaments) {
  try {
    fs.writeFileSync(tournamentsDbPath, JSON.stringify(tournaments, null, 2));
    console.log(`[ResultsUpdater] Tournaments database updated successfully`);
  } catch (error) {
    console.error('Error writing tournaments db.json:', error);
    throw error;
  }
}

/**
 * Add eliminated players to tournament results table
 * Simple logic: find highest occupied place and add new eliminations from there
 * @param {number} tournamentId - Tournament ID
 * @param {Array} eliminatedPlayers - Array of eliminated player objects
 * @returns {boolean} - Success status
 */
export async function addEliminatedPlayersToResults(tournamentId, eliminatedPlayers) {
  if (!eliminatedPlayers || eliminatedPlayers.length === 0) {
    console.log(`[ResultsUpdater] No eliminated players to add for tournament ${tournamentId}`);
    return true;
  }
  
  console.log(`[ResultsUpdater] Adding ${eliminatedPlayers.length} eliminated players to tournament ${tournamentId}`);
  
  try {
    const tournaments = readTournaments();
    const tournamentIndex = tournaments.findIndex(t => t.id === parseInt(tournamentId));
    
    if (tournamentIndex === -1) {
      console.error(`[ResultsUpdater] Tournament ${tournamentId} not found`);
      return false;
    }
    
    const tournament = tournaments[tournamentIndex];
    
    // Ensure results array exists and is properly initialized
    if (!tournament.results) {
      const totalParticipants = tournament.participants.length;
      tournament.results = initializeResultsTable(totalParticipants);
    }
    
    // Find the lowest occupied place in current results table
    let lowestOccupiedPlace = tournament.results.length + 1;
    for (let i = 0; i < tournament.results.length; i++) {
      if (tournament.results[i] !== null) {
        lowestOccupiedPlace = i + 1; // Convert to 1-indexed position
        break;
      }
    }
    
    console.log(`[ResultsUpdater] Lowest occupied place: ${lowestOccupiedPlace}`);
    
    // Add new eliminated players starting from positions just before the lowest occupied place
    // Later eliminations get better placements (lower numbers)
    eliminatedPlayers.forEach((eliminatedPlayer, index) => {
      const newPosition = lowestOccupiedPlace - eliminatedPlayers.length + index;
      eliminatedPlayer.finalPlacement = newPosition;
      
      // Place in results array (convert to 0-indexed)
      tournament.results[newPosition - 1] = eliminatedPlayer;
      
      console.log(`[ResultsUpdater] Placed ${eliminatedPlayer.playerInfo?.name || eliminatedPlayer.playerId} at position ${newPosition}`);
    });
    
    // Update tournament
    tournaments[tournamentIndex] = tournament;
    
    // Save to database
    writeTournaments(tournaments);
    
    console.log(`[ResultsUpdater] Successfully added ${eliminatedPlayers.length} players to results table for tournament ${tournamentId}`);
    
    return true;
    
  } catch (error) {
    console.error(`[ResultsUpdater] Error updating results for tournament ${tournamentId}:`, error);
    return false;
  }
}

/**
 * Process completed stage and update tournament results
 * @param {number} tournamentId - Tournament ID
 * @param {Object} stage - Stage configuration object
 * @param {Array} stageGames - Array of completed games for the stage
 * @returns {Object} - Update result with stats
 */
export async function processCompletedStage(tournamentId, stage, stageGames) {
  console.log(`[ResultsUpdater] Processing completed stage: ${stage.name} (ID: ${stage.id}) for tournament ${tournamentId}`);
  
  try {
    let eliminatedPlayers;
    let isLastStage = false;
    
    // Check if this is a final stage - only use the isFinal flag
    if (stage.isFinal === true) {
      console.log(`[ResultsUpdater] Processing final stage for tournament ${tournamentId}`);
      eliminatedPlayers = getFinalStageResults(stage, stageGames);
      isLastStage = true;
    } else {
      // Regular stage - calculate eliminations
      // Get tournament data to calculate total participants
      const tournamentsDb = readTournaments();
      const tournament = tournamentsDb.find(t => t.id === tournamentId);
      const totalParticipants = tournament ? tournament.participants.length : null;
      
      eliminatedPlayers = getEliminatedPlayersForStage(stage, stageGames, totalParticipants);
    }
    
    if (eliminatedPlayers.length === 0) {
      console.log(`[ResultsUpdater] No eliminations found for stage ${stage.id}`);
      return {
        success: true,
        eliminatedCount: 0,
        isLastStage: false,
        stage: stage
      };
    }
    
    // Add eliminated players to results table
    const updateSuccess = await addEliminatedPlayersToResults(tournamentId, eliminatedPlayers);
    
    if (!updateSuccess) {
      throw new Error('Failed to update results table');
    }
    
    console.log(`[ResultsUpdater] Successfully processed stage ${stage.id}: ${eliminatedPlayers.length} players eliminated`);
    
    return {
      success: true,
      eliminatedCount: eliminatedPlayers.length,
      eliminatedPlayers: eliminatedPlayers,
      isLastStage: isLastStage,
      stage: stage
    };
    
  } catch (error) {
    console.error(`[ResultsUpdater] Error processing completed stage ${stage.id}:`, error);
    return {
      success: false,
      error: error.message,
      eliminatedCount: 0,
      stage: stage
    };
  }
}

/**
 * Get current tournament results (with player info populated)
 * @param {number} tournamentId - Tournament ID
 * @returns {Array} - Current results array with player information
 */
export function getTournamentResults(tournamentId) {
  try {
    const tournaments = readTournaments();
    const tournament = tournaments.find(t => t.id === parseInt(tournamentId));
    
    if (!tournament) {
      console.error(`[ResultsUpdater] Tournament ${tournamentId} not found`);
      return [];
    }
    
    return tournament.results || [];
    
  } catch (error) {
    console.error(`[ResultsUpdater] Error getting results for tournament ${tournamentId}:`, error);
    return [];
  }
}

/**
 * Check if tournament is completed (all stages have results)
 * @param {number} tournamentId - Tournament ID
 * @returns {boolean} - True if tournament is completed
 */
export function isTournamentCompleted(tournamentId) {
  try {
    const tournaments = readTournaments();
    const tournament = tournaments.find(t => t.id === parseInt(tournamentId));
    
    if (!tournament) {
      return false;
    }
    
    const results = tournament.results || [];
    
    // Check if we have results from final stage
    const hasFinalResults = results.some(result => result.isFinalResults === true);
    
    return hasFinalResults;
    
  } catch (error) {
    console.error(`[ResultsUpdater] Error checking tournament completion:`, error);
    return false;
  }
}

/**
 * Get tournament completion statistics
 * @param {number} tournamentId - Tournament ID
 * @returns {Object} - Tournament completion stats
 */
export function getTournamentStats(tournamentId) {
  try {
    const tournaments = readTournaments();
    const tournament = tournaments.find(t => t.id === parseInt(tournamentId));
    
    if (!tournament) {
      return {
        totalParticipants: 0,
        eliminatedCount: 0,
        remainingCount: 0,
        isCompleted: false
      };
    }
    
    const totalParticipants = tournament.participants?.length || 0;
    const eliminatedCount = tournament.results?.filter(result => result !== null).length || 0;
    const remainingCount = totalParticipants - eliminatedCount;
    const isCompleted = isTournamentCompleted(tournamentId);
    
    return {
      totalParticipants,
      eliminatedCount,
      remainingCount,
      isCompleted,
      results: tournament.results || []
    };
    
  } catch (error) {
    console.error(`[ResultsUpdater] Error getting tournament stats:`, error);
    return {
      totalParticipants: 0,
      eliminatedCount: 0,
      remainingCount: 0,
      isCompleted: false,
      results: []
    };
  }
}