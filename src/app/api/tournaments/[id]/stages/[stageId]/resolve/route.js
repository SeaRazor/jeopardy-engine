// Stage-specific Reference Resolution API
// Handles resolving references for individual stages

import { NextResponse } from 'next/server';
import { createReferenceResolver } from '../../../../../../util/referenceResolver.js';

// POST /api/tournaments/[id]/stages/[stageId]/resolve
// Resolve all references for a specific stage
export async function POST(request, { params }) {
  try {
    const { id, stageId } = params;
    const tournamentId = parseInt(id);
    const parsedStageId = parseInt(stageId);

    const resolver = createReferenceResolver(tournamentId);
    
    // Get tournament and stage info
    const tournament = await resolver.fetchTournament();
    const stage = tournament.schema.stages.find(s => s.id === parsedStageId);
    
    if (!stage) {
      return NextResponse.json(
        { error: `Stage ${stageId} not found` },
        { status: 404 }
      );
    }

    // Check if previous stages are complete (for dependency validation)
    if (stage.order > 1) {
      const previousStage = tournament.schema.stages.find(s => s.order === stage.order - 1);
      if (previousStage) {
        const isPreviousStageReady = await resolver.isStageReadyForProgression(previousStage.id);
        if (!isPreviousStageReady) {
          return NextResponse.json(
            { 
              error: `Cannot resolve stage ${stage.order} references: previous stage ${previousStage.name} is not complete`,
              previousStage: {
                id: previousStage.id,
                name: previousStage.name,
                order: previousStage.order
              }
            },
            { status: 400 }
          );
        }
      }
    }

    // Resolve references for the stage
    const resolvedCount = await resolver.resolveStageReferences(stage);
    
    // Get updated stage status
    const games = await resolver.fetchStageGames(stage.id);
    const pendingReferences = await resolver.countPendingReferences(stage);
    
    return NextResponse.json({
      success: true,
      stageId: stage.id,
      stageName: stage.name,
      stageOrder: stage.order,
      resolvedCount,
      totalGames: games.length,
      pendingReferences,
      message: `Resolved ${resolvedCount} player references for ${stage.name}`
    });

  } catch (error) {
    console.error(`Error resolving stage ${stageId} references:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to resolve stage references' },
      { status: 500 }
    );
  }
}

// GET /api/tournaments/[id]/stages/[stageId]/resolve
// Check resolution status for a specific stage
export async function GET(request, { params }) {
  try {
    const { id, stageId } = params;
    const tournamentId = parseInt(id);
    const parsedStageId = parseInt(stageId);

    const resolver = createReferenceResolver(tournamentId);
    
    // Get tournament and stage info
    const tournament = await resolver.fetchTournament();
    const stage = tournament.schema.stages.find(s => s.id === parsedStageId);
    
    if (!stage) {
      return NextResponse.json(
        { error: `Stage ${stageId} not found` },
        { status: 404 }
      );
    }

    // Get detailed stage status
    const games = await resolver.fetchStageGames(stage.id);
    const completedGames = games.filter(game => resolver.isGameCompleted(game));
    const pendingReferences = await resolver.countPendingReferences(stage);
    
    // Analyze each game's reference status
    const gameDetails = await Promise.all(games.map(async (game) => {
      const unresolvedParticipants = game.participants?.filter(p => 
        p.sourceReference && !p.resolved
      ) || [];
      
      return {
        gameId: game.id,
        stageOrder: game.stageOrder,
        isComplete: resolver.isGameCompleted(game),
        totalParticipants: game.participants?.length || 0,
        resolvedParticipants: (game.participants?.filter(p => p.resolved || !p.sourceReference) || []).length,
        unresolvedReferences: unresolvedParticipants.map(p => ({
          reference: p.sourceReference,
          playerId: p.playerId
        }))
      };
    }));

    return NextResponse.json({
      success: true,
      stage: {
        id: stage.id,
        name: stage.name,
        order: stage.order,
        isFinal: stage.isFinal
      },
      summary: {
        totalGames: games.length,
        completedGames: completedGames.length,
        pendingReferences,
        isComplete: completedGames.length === games.length && pendingReferences === 0,
        canProgress: completedGames.length === games.length && games.length > 0
      },
      games: gameDetails
    });

  } catch (error) {
    console.error(`Error getting stage ${stageId} resolution status:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to get stage resolution status' },
      { status: 500 }
    );
  }
}