// Tournament Results API Endpoint
// Provides real-time tournament results and standings

import { NextResponse } from 'next/server';
import { getTournamentResults, getTournamentStats } from '../../../../util/resultsTableUpdater.js';
import { getTournamentCompletionStatus } from '../../../../util/stageCompletionChecker.js';
import { getTournamentById } from '../../../../../lib/data/tournaments.js';
import { getPlayers } from '../../../../../lib/data/players.js';

async function enrichResultsWithPlayerInfo(results) {
  const players = await getPlayers();

  return results.map(result => {
    if (!result) return null;
    if (result.playerInfo) return result;

    const playerInfo = players.find(p => p.id === result.playerId);
    return {
      ...result,
      playerInfo: playerInfo || {
        id: result.playerId,
        firstName: 'Unknown',
        lastName: 'Player',
        name: 'Unknown Player',
      },
    };
  });
}

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const tournamentId = parseInt(id);

    const tournament = await getTournamentById(tournamentId);

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const rawResults = await getTournamentResults(tournamentId);
    const enrichedResults = await enrichResultsWithPlayerInfo(rawResults);

    const stats = await getTournamentStats(tournamentId);

    const stageCompletionStatus = tournament.schema?.stages
      ? await getTournamentCompletionStatus(tournamentId, tournament.schema.stages)
      : {};

    let tournamentStatus = 'pending';
    if (stats.eliminatedCount > 0 && !stats.isCompleted) {
      tournamentStatus = 'ongoing';
    } else if (stats.isCompleted) {
      tournamentStatus = 'completed';
    }

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
        schema: tournament.schema,
      },
      results: enrichedResults,
      podium,
      stats: {
        totalParticipants: stats.totalParticipants,
        eliminatedCount: stats.eliminatedCount,
        remainingCount: stats.remainingCount,
        isCompleted: stats.isCompleted,
        tournamentStatus,
      },
      stageProgress: stageCompletionStatus,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[RESULTS API] Error getting tournament results:', error);
    return NextResponse.json(
      { error: 'Failed to get tournament results', details: error.message },
      { status: 500 }
    );
  }
}
