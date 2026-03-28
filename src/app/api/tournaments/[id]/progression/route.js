// Tournament Progression Management API
// Handles automatic progression, reference resolution, and status tracking

import { NextResponse } from 'next/server';
import { createReferenceResolver, getProgressionStatus } from '../../../../util/referenceResolver.js';

// GET /api/tournaments/[id]/progression
// Returns progression status for the tournament
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id);

    const status = await getProgressionStatus(tournamentId);
    
    if (!status.success) {
      return NextResponse.json(
        { error: status.error },
        { status: 500 }
      );
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching progression status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progression status' },
      { status: 500 }
    );
  }
}

// POST /api/tournaments/[id]/progression
// Triggers progression actions (resolve references, advance stages)
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const tournamentId = parseInt(id);
    const body = await request.json();
    const { action, stageId } = body;

    const resolver = createReferenceResolver(tournamentId);

    switch (action) {
      case 'resolve_all':
        // Resolve all pending references in the tournament
        const resolveResult = await resolver.resolveAllPendingReferences();
        return NextResponse.json(resolveResult);

      case 'resolve_stage':
        // Resolve references for a specific stage
        if (!stageId) {
          return NextResponse.json(
            { error: 'stageId is required for resolve_stage action' },
            { status: 400 }
          );
        }
        
        const tournament = await resolver.fetchTournament();
        const stage = tournament.schema.stages.find(s => s.id === stageId);
        
        if (!stage) {
          return NextResponse.json(
            { error: `Stage ${stageId} not found` },
            { status: 404 }
          );
        }

        const stageResolveResult = await resolver.resolveStageReferences(stage);
        return NextResponse.json({
          success: true,
          resolvedCount: stageResolveResult,
          message: `Resolved ${stageResolveResult} references for stage ${stage.name}`
        });

      case 'auto_resolve':
        // Auto-resolve when a stage is completed
        if (!stageId) {
          return NextResponse.json(
            { error: 'stageId is required for auto_resolve action' },
            { status: 400 }
          );
        }

        const autoResolveResult = await resolver.autoResolveOnStageCompletion(stageId);
        return NextResponse.json(autoResolveResult);

      case 'check_readiness':
        // Check if a stage is ready for progression
        if (!stageId) {
          return NextResponse.json(
            { error: 'stageId is required for check_readiness action' },
            { status: 400 }
          );
        }

        const isReady = await resolver.isStageReadyForProgression(stageId);
        return NextResponse.json({
          success: true,
          stageId,
          isReady,
          message: isReady ? 'Stage is ready for progression' : 'Stage is not ready for progression'
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error handling progression action:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to handle progression action' },
      { status: 500 }
    );
  }
}