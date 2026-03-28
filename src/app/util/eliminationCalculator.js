// Elimination Calculator Utility
// Schema-agnostic calculator for determining eliminated players when a stage completes

import { getPlayers } from '../../lib/data/players.js';

function sortParticipantsByPerformance(participants) {
  return [...participants].sort((a, b) => {
    const aPoints = a.totalPoints || a.points || 0;
    const bPoints = b.totalPoints || b.points || 0;
    if (bPoints !== aPoints) return bPoints - aPoints;
    const aTieBreak = a.totalTieBreak || a.tieBreakResult || 0;
    const bTieBreak = b.totalTieBreak || b.tieBreakResult || 0;
    return bTieBreak - aTieBreak;
  });
}

function aggregateStageParticipants(stageGames) {
  const participantStats = new Map();

  for (const game of stageGames) {
    if (!game.participants || game.participants.length === 0) continue;

    for (const participant of game.participants) {
      if (!participant.playerId) continue;

      const playerId = participant.playerId;

      if (participantStats.has(playerId)) {
        const existing = participantStats.get(playerId);
        existing.totalPoints += participant.points || 0;
        existing.totalTieBreak += participant.tieBreakResult || 0;
        existing.gamesPlayed += 1;
      } else {
        participantStats.set(playerId, {
          playerId,
          totalPoints: participant.points || 0,
          totalTieBreak: participant.tieBreakResult || 0,
          gamesPlayed: 1,
          participantData: participant,
        });
      }
    }
  }

  return Array.from(participantStats.values());
}

/**
 * Calculate eliminated players for a completed stage
 */
export async function getEliminatedPlayersForStage(stage, stageGames, totalParticipants = null) {
  console.log(`[EliminationCalculator] Calculating eliminations for stage: ${stage.name} (ID: ${stage.id})`);

  if (stageGames.length === 0) {
    console.log(`[EliminationCalculator] No games found in stage ${stage.id}`);
    return [];
  }

  const winnersPerGame =
    stage.gameWinnersNum || stage.topGameWinnersNum || stage.bottomGameWinnersNum || 2;
  const allEliminatedPlayers = [];

  for (const game of stageGames) {
    if (!game.participants || game.participants.length === 0) continue;

    const sortedGameParticipants = game.participants
      .map(p => ({
        playerId: p.playerId,
        points: p.points || 0,
        tieBreakResult: p.tieBreakResult || 0,
        totalPoints: p.points || 0,
        totalTieBreak: p.tieBreakResult || 0,
        gamesPlayed: 1,
        participantData: p,
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.tieBreakResult - a.tieBreakResult;
      });

    const gameWinners = Math.min(winnersPerGame, sortedGameParticipants.length);
    const eliminatedFromGame = sortedGameParticipants.slice(gameWinners);

    console.log(`[EliminationCalculator] Game ${game.id}: ${sortedGameParticipants.length} participants, ${gameWinners} advance, ${eliminatedFromGame.length} eliminated`);

    allEliminatedPlayers.push(...eliminatedFromGame);
  }

  const sortedEliminatedPlayers = allEliminatedPlayers.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.tieBreakResult - a.tieBreakResult;
  });

  console.log(`[EliminationCalculator] Stage ${stage.id}: Total ${allEliminatedPlayers.length} players eliminated`);

  const playersData = await getPlayers();

  return sortedEliminatedPlayers.map((eliminatedPlayer, index) => {
    const playerInfo = playersData.find(p => p.id === eliminatedPlayer.playerId);

    return {
      playerId: eliminatedPlayer.playerId,
      playerInfo,
      eliminatedAtStage: stage.id,
      eliminatedAtStageName: stage.name,
      stageOrder: stage.order,
      totalPoints: eliminatedPlayer.totalPoints,
      totalTieBreak: eliminatedPlayer.totalTieBreak,
      gamesPlayed: eliminatedPlayer.gamesPlayed,
      finalPlacement: index + 1,
      placementAmongEliminated: index + 1,
      eliminationDate: new Date().toISOString(),
    };
  });
}

/**
 * Special handling for final stage - determine 1st, 2nd, 3rd places
 */
export async function getFinalStageResults(stage, finalGames) {
  console.log(`[EliminationCalculator] Processing final stage: ${stage.name} (ID: ${stage.id})`);

  const finalParticipants = aggregateStageParticipants(finalGames);

  if (finalParticipants.length === 0) {
    console.log(`[EliminationCalculator] No participants found in final stage ${stage.id}`);
    return [];
  }

  const sortedParticipants = sortParticipantsByPerformance(finalParticipants);
  const playersData = await getPlayers();

  return sortedParticipants.map((participant, index) => {
    const playerInfo = playersData.find(p => p.id === participant.playerId);

    return {
      playerId: participant.playerId,
      playerInfo,
      finalPlacement: index + 1,
      eliminatedAtStage: stage.id,
      eliminatedAtStageName: stage.name,
      stageOrder: stage.order,
      totalPoints: participant.totalPoints,
      totalTieBreak: participant.totalTieBreak,
      gamesPlayed: participant.gamesPlayed,
      isFinalResults: true,
      eliminationDate: new Date().toISOString(),
    };
  });
}

/**
 * Calculate final tournament placement for eliminated players
 */
export function calculateFinalPlacements(eliminatedPlayers, existingResults) {
  const totalExistingPlayers = existingResults.length;

  return eliminatedPlayers.map((player, index) => ({
    ...player,
    finalPlacement: totalExistingPlayers + index + 1,
  }));
}
