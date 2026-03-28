// Results Table Updater Utility
// Updates tournament results table when stages complete

import { getTournamentById, updateTournament } from '../../lib/data/tournaments.js';
import { getPlayers } from '../../lib/data/players.js';
import { getEliminatedPlayersForStage, getFinalStageResults, calculateFinalPlacements } from './eliminationCalculator.js';

function initializeResultsTable(totalParticipants) {
  console.log(`[ResultsUpdater] Initializing results table with ${totalParticipants} positions`);
  return new Array(totalParticipants).fill(null);
}

export async function addEliminatedPlayersToResults(tournamentId, eliminatedPlayers) {
  if (!eliminatedPlayers || eliminatedPlayers.length === 0) {
    console.log(`[ResultsUpdater] No eliminated players to add for tournament ${tournamentId}`);
    return true;
  }

  console.log(`[ResultsUpdater] Adding ${eliminatedPlayers.length} eliminated players to tournament ${tournamentId}`);

  try {
    const tournament = await getTournamentById(tournamentId);

    if (!tournament) {
      console.error(`[ResultsUpdater] Tournament ${tournamentId} not found`);
      return false;
    }

    const results = tournament.results
      ? [...tournament.results]
      : initializeResultsTable(tournament.participants.length);

    let lowestOccupiedPlace = results.length + 1;
    for (let i = 0; i < results.length; i++) {
      if (results[i] !== null) {
        lowestOccupiedPlace = i + 1;
        break;
      }
    }

    console.log(`[ResultsUpdater] Lowest occupied place: ${lowestOccupiedPlace}`);

    eliminatedPlayers.forEach((eliminatedPlayer, index) => {
      const newPosition = lowestOccupiedPlace - eliminatedPlayers.length + index;
      eliminatedPlayer.finalPlacement = newPosition;
      results[newPosition - 1] = eliminatedPlayer;
      console.log(`[ResultsUpdater] Placed ${eliminatedPlayer.playerInfo?.name || eliminatedPlayer.playerId} at position ${newPosition}`);
    });

    await updateTournament(tournamentId, { results });

    console.log(`[ResultsUpdater] Successfully added ${eliminatedPlayers.length} players to results table for tournament ${tournamentId}`);
    return true;
  } catch (error) {
    console.error(`[ResultsUpdater] Error updating results for tournament ${tournamentId}:`, error);
    return false;
  }
}

export async function processCompletedStage(tournamentId, stage, stageGames) {
  console.log(`[ResultsUpdater] Processing completed stage: ${stage.name} (ID: ${stage.id}) for tournament ${tournamentId}`);

  try {
    let eliminatedPlayers;
    let isLastStage = false;

    if (stage.isFinal === true) {
      console.log(`[ResultsUpdater] Processing final stage for tournament ${tournamentId}`);
      eliminatedPlayers = await getFinalStageResults(stage, stageGames);
      isLastStage = true;
    } else {
      const tournament = await getTournamentById(tournamentId);
      const totalParticipants = tournament ? tournament.participants.length : null;
      eliminatedPlayers = await getEliminatedPlayersForStage(stage, stageGames, totalParticipants);
    }

    if (eliminatedPlayers.length === 0) {
      console.log(`[ResultsUpdater] No eliminations found for stage ${stage.id}`);
      return { success: true, eliminatedCount: 0, isLastStage: false, stage };
    }

    const updateSuccess = await addEliminatedPlayersToResults(tournamentId, eliminatedPlayers);

    if (!updateSuccess) {
      throw new Error('Failed to update results table');
    }

    console.log(`[ResultsUpdater] Successfully processed stage ${stage.id}: ${eliminatedPlayers.length} players eliminated`);

    return {
      success: true,
      eliminatedCount: eliminatedPlayers.length,
      eliminatedPlayers,
      isLastStage,
      stage,
    };
  } catch (error) {
    console.error(`[ResultsUpdater] Error processing completed stage ${stage.id}:`, error);
    return { success: false, error: error.message, eliminatedCount: 0, stage };
  }
}

export async function getTournamentResults(tournamentId) {
  try {
    const tournament = await getTournamentById(tournamentId);
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

export async function isTournamentCompleted(tournamentId) {
  try {
    const tournament = await getTournamentById(tournamentId);
    if (!tournament) return false;
    const results = tournament.results || [];
    return results.some(result => result?.isFinalResults === true);
  } catch (error) {
    console.error(`[ResultsUpdater] Error checking tournament completion:`, error);
    return false;
  }
}

export async function getTournamentStats(tournamentId) {
  try {
    const tournament = await getTournamentById(tournamentId);

    if (!tournament) {
      return { totalParticipants: 0, eliminatedCount: 0, remainingCount: 0, isCompleted: false };
    }

    const totalParticipants = tournament.participants?.length || 0;
    const eliminatedCount = tournament.results?.filter(result => result !== null).length || 0;
    const remainingCount = totalParticipants - eliminatedCount;
    const isCompleted = await isTournamentCompleted(tournamentId);

    return {
      totalParticipants,
      eliminatedCount,
      remainingCount,
      isCompleted,
      results: tournament.results || [],
    };
  } catch (error) {
    console.error(`[ResultsUpdater] Error getting tournament stats:`, error);
    return { totalParticipants: 0, eliminatedCount: 0, remainingCount: 0, isCompleted: false, results: [] };
  }
}
