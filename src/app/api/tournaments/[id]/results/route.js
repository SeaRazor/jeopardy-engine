// Tournament Results API Endpoint
// Provides real-time tournament results and standings

import { NextResponse } from 'next/server';
import { getTournamentResults, getTournamentStats } from '../../../../util/resultsTableUpdater.js';
import { getTournamentCompletionStatus } from '../../../../util/stageCompletionChecker.js';
import fs from 'fs';
import path from 'path';

const tournamentsDbPath = path.join(process.cwd(), 'src/app/api/tournaments/db.json');
const playersDbPath = path.join(process.cwd(), 'src/app/api/players/db.json');

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
 * Read players database
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
 * Enrich results with complete player information
 * @param {Array} results - Results array from tournament
 * @returns {Array} - Results with populated player info
 */
function enrichResultsWithPlayerInfo(results) {
  const players = readPlayers();
  
  return results.map(result => {
    // Handle null/empty slots
    if (!result) {
      return null;
    }
    
    if (result.playerInfo) {
      // Player info already populated
      return result;
    }
    
    // Find player in database
    const playerInfo = players.find(p => p.id === result.playerId);
    
    return {
      ...result,
      playerInfo: playerInfo || {
        id: result.playerId,
        firstName: 'Unknown',
        lastName: 'Player',
        name: 'Unknown Player'
      }
    };
  });
}

/**
 * GET /api/tournaments/[id]/results
 * Returns current tournament results and standings
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const tournamentId = parseInt(id);
    
    // Get tournament data
    const tournaments = readTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);
    
    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }
    
    // Get tournament results
    const rawResults = getTournamentResults(tournamentId);
    const enrichedResults = enrichResultsWithPlayerInfo(rawResults);
    
    // Get tournament statistics
    const stats = getTournamentStats(tournamentId);
    
    // Get stage completion status
    const stageCompletionStatus = tournament.schema?.stages 
      ? getTournamentCompletionStatus(tournamentId, tournament.schema.stages)
      : {};
    
    // Determine tournament status
    let tournamentStatus = 'pending';
    if (stats.eliminatedCount > 0 && !stats.isCompleted) {
      tournamentStatus = 'ongoing';
    } else if (stats.isCompleted) {
      tournamentStatus = 'completed';
    }
    
    // Get podium (top 3) - only from non-null results
    const podium = enrichedResults
      .filter(r => r && r.finalPlacement <= 3)
      .sort((a, b) => a.finalPlacement - b.finalPlacement)
      .slice(0, 3);
    
    const response = {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        type: tournament.type,
        schema: tournament.schema
      },
      results: enrichedResults,
      podium: podium,
      stats: {
        totalParticipants: stats.totalParticipants,
        eliminatedCount: stats.eliminatedCount,
        remainingCount: stats.remainingCount,
        isCompleted: stats.isCompleted,
        tournamentStatus: tournamentStatus
      },
      stageProgress: stageCompletionStatus,
      lastUpdated: new Date().toISOString()
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[RESULTS API] Error getting tournament results:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get tournament results',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tournaments/[id]/results?format=leaderboard
 * Returns simplified leaderboard format for display components
 */
export async function GET_LEADERBOARD(request, { params }) {
  try {
    const { id } = params;
    const tournamentId = parseInt(id);
    
    const rawResults = getTournamentResults(tournamentId);
    const enrichedResults = enrichResultsWithPlayerInfo(rawResults);
    
    // Transform to leaderboard format
    const leaderboard = enrichedResults.map((result, index) => ({
      position: result.finalPlacement || (index + 1),
      playerId: result.playerId,
      name: getPlayerDisplayName(result.playerInfo),
      points: result.totalPoints || 0,
      tieBreakResult: result.totalTieBreak || 0,
      eliminatedAt: result.eliminatedAtStageName,
      stageOrder: result.stageOrder,
      isEliminated: !result.isFinalResults,
      isFinal: result.isFinalResults === true
    }));
    
    return NextResponse.json({
      leaderboard: leaderboard,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[RESULTS API] Error getting leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to get leaderboard' },
      { status: 500 }
    );
  }
}

/**
 * Get display name for player
 */
function getPlayerDisplayName(playerInfo) {
  if (!playerInfo) {
    return 'Unknown Player';
  }
  
  // Team
  if (playerInfo.name) {
    return playerInfo.name;
  }
  
  // Person
  if (playerInfo.firstName && playerInfo.lastName) {
    return `${playerInfo.firstName} ${playerInfo.lastName}`;
  }
  
  if (playerInfo.firstName) {
    return playerInfo.firstName;
  }
  
  return 'Unknown Player';
}