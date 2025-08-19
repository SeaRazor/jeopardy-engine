// Complete Game API Endpoint
// Handles game completion AND automatic player progression in a single atomic operation

import { NextResponse } from 'next/server';
import { resolveReferencesForGame } from '../../../../../../../../util/immediateResolver.js';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'src/app/api/games/db.json');

function readGames() {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading games db.json:', error);
    return [];
  }
}

function writeGames(games) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(games, null, 2));
  } catch (error) {
    console.error('Error writing games db.json:', error);
    throw error;
  }
}

// POST /api/tournaments/[id]/stages/[stageId]/games/[gameId]/complete
export async function POST(request, { params }) {
  try {
    const { id: tournamentId, stageId, gameId } = params;
    const body = await request.json();
    
    console.log(`[COMPLETE] Starting completion process for game ${gameId}`);
    
    const games = readGames();
    const gameIndex = games.findIndex(g => g.id === parseInt(gameId));
    
    if (gameIndex === -1) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }
    
    const game = games[gameIndex];
    
    // Check if game is already completed
    if (game.status === 'completed') {
      console.log(`[COMPLETE] Game ${gameId} already completed, skipping completion`);
      return NextResponse.json(
        { error: 'Game is already completed' },
        { status: 400 }
      );
    }
    
    // Validate that game has results
    if (!game.participants || game.participants.length === 0) {
      return NextResponse.json(
        { error: 'Cannot complete game without participants' },
        { status: 400 }
      );
    }
    
    console.log(`[COMPLETE] Updating game ${gameId} with completion data...`);
    
    // Update game with completion data from client
    const updatedGame = {
      ...game,
      ...body, // This includes themes, gameState, completedThemes from client
      status: 'completed',
      completedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    // Save updated game
    games[gameIndex] = updatedGame;
    writeGames(games);
    
    console.log(`[COMPLETE] Game ${gameId} marked as completed, triggering progression...`);
    
    // Trigger automatic player progression
    let progressionResult = {
      success: false,
      resolvedGames: 0,
      resolvedReferences: 0,
      error: 'Progression not attempted'
    };
    
    try {
      progressionResult = await resolveReferencesForGame(tournamentId, updatedGame);
      console.log(`[COMPLETE] Progression result:`, progressionResult);
    } catch (progressionError) {
      console.error(`[COMPLETE] Error during progression:`, progressionError);
      progressionResult = {
        success: false,
        error: progressionError.message,
        resolvedGames: 0,
        resolvedReferences: 0
      };
    }
    
    // Return comprehensive response
    const response = {
      success: true,
      message: 'Game completed successfully',
      game: updatedGame,
      progression: progressionResult,
      summary: {
        gameCompleted: true,
        playersPromoted: progressionResult.resolvedReferences || 0,
        gamesAffected: progressionResult.resolvedGames || 0,
        progressionSucceeded: progressionResult.success
      }
    };
    
    console.log(`[COMPLETE] Completion summary:`, response.summary);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[COMPLETE] Error in game completion process:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to complete game',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}