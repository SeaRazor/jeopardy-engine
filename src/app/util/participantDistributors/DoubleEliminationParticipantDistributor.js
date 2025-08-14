// Double Elimination Participant Distributor - Handles bracket-based participant assignment
// Uses upper and lower brackets with complex progression rules

import { BaseParticipantDistributor } from './BaseParticipantDistributor.js';

export class DoubleEliminationParticipantDistributor extends BaseParticipantDistributor {
  // Main method to assign participants to all games in a stage
  async assignStageParticipants(stage, games) {
    console.log(`[DoubleEliminationParticipantDistributor] Assigning participants for stage ${stage.order}`);
    
    // Stage 1 gets empty participants (manual assignment)
    if (stage.order === 1) {
      return this.assignEmptyParticipants(games, stage.numberOfPlayers || 4);
    }
    
    // Get all tournament games for reference lookup
    const allGames = await this.getAllTournamentGames();
    
    // Find source games from previous stages
    const sourceGames = this.findSourceGames(stage, allGames);
    
    // Assign participants based on bracket type
    const updatedGames = [];
    for (const game of games) {
      const gameWithParticipants = await this.assignGameParticipants(game, stage, sourceGames, allGames);
      updatedGames.push(gameWithParticipants);
    }
    
    return updatedGames;
  }

  // Assign participants to a single game
  async assignGameParticipants(game, stage, sourceGames, allGames) {
    const participants = [];
    const playersPerGame = stage.numberOfPlayers || 4;
    
    console.log(`[DoubleEliminationParticipantDistributor] Assigning participants to game ${game.gameNumber} (${game.bracketType || 'final'})`);
    
    if (game.bracketType === 'upper') {
      // Rule 1: High-bracket games only get winners from previous high-bracket games
      participants.push(...this.getHighBracketParticipants(game, stage, sourceGames, playersPerGame));
      
    } else if (game.bracketType === 'lower') {
      // Rule 2: Low-bracket games get losers from high-bracket + winners from low-bracket
      participants.push(...this.getLowBracketParticipants(game, stage, sourceGames, playersPerGame));
      
    } else if (stage.isFinal) {
      // Final stage: get top performers
      participants.push(...this.getFinalParticipants(game, stage, sourceGames, playersPerGame));
    }
    
    // Don't pad with empty participants - let games have fewer participants
    // The API requires participants to either have playerId+points OR sourceReference
    // Empty slots should not be created as participants
    
    // Trim if too many participants
    if (participants.length > playersPerGame) {
      participants.splice(playersPerGame);
    }
    
    console.log(`[DoubleEliminationParticipantDistributor] Game ${game.gameNumber} assigned ${participants.length} participants`);
    
    return {
      ...game,
      participants: participants
    };
  }

  // Rule 1: Get participants for high-bracket games (only winners from previous high-bracket)
  getHighBracketParticipants(game, stage, sourceGames, playersPerGame) {
    const participants = [];
    
    // Find previous high-bracket games
    const prevStage = this.findPreviousStage(stage);
    if (!prevStage) return participants;
    
    const prevHighBracketGames = sourceGames.filter(g => 
      g.stageId === prevStage.id && g.bracketType === 'upper'
    ).sort((a, b) => a.gameNumber - b.gameNumber);
    
    console.log(`[DoubleEliminationParticipantDistributor] Found ${prevHighBracketGames.length} previous high-bracket games`);
    
    // If no high-bracket games in previous stage, use Rule 3
    if (prevHighBracketGames.length === 0) {
      return this.getParticipantsFromLatestHighBracket(game, stage, sourceGames, playersPerGame);
    }
    
    // Get winners from previous high-bracket games
    const winnersPerGame = prevStage.topGameWinnersNum || prevStage.gameWinnersNum || 2;
    const allWinners = [];
    
    for (const sourceGame of prevHighBracketGames) {
      for (let position = 1; position <= winnersPerGame; position++) {
        allWinners.push({
          gameNumber: sourceGame.gameNumber,
          position: position
        });
      }
    }
    
    // Distribute winners using smart re-match avoidance
    const selectedWinners = this.selectParticipantsWithRematchAvoidance(
      game, allWinners, playersPerGame
    );
    
    for (const winner of selectedWinners) {
      participants.push(
        this.createParticipantWithReference(
          this.createPlayerReference(winner.gameNumber, winner.position)
        )
      );
    }
    
    return participants;
  }

  // Rule 2: Get participants for low-bracket games (losers from high + winners from low)
  getLowBracketParticipants(game, stage, sourceGames, playersPerGame) {
    const participants = [];
    
    const prevStage = this.findPreviousStage(stage);
    if (!prevStage) return participants;
    
    console.log(`[DoubleEliminationParticipantDistributor] Low bracket stage ${stage.order}, game ${game.gameIndex}`);
    
    if (stage.order === 2) {
      // Stage 2 low-bracket: distribute ALL losers from stage 1 across low-bracket games
      const stage1Games = sourceGames.filter(g => 
        g.stageId === prevStage.id
      ).sort((a, b) => a.gameNumber - b.gameNumber);
      
      const winnersPerGame = prevStage.topGameWinnersNum || prevStage.gameWinnersNum || 2;
      
      console.log(`[DoubleEliminationParticipantDistributor] Stage 2: Found ${stage1Games.length} stage 1 games, ${winnersPerGame} winners per game`);
      
      // Collect ALL losers from Stage 1
      const allLosers = [];
      for (const sourceGame of stage1Games) {
        for (let position = winnersPerGame + 1; position <= 4; position++) {
          allLosers.push({
            gameNumber: sourceGame.gameNumber,
            position: position
          });
        }
      }
      
      console.log(`[DoubleEliminationParticipantDistributor] Stage 2: Collected ${allLosers.length} total losers`);
      
      // Distribute losers using smart re-match avoidance
      const selectedLosers = this.selectParticipantsWithRematchAvoidance(
        game, allLosers, playersPerGame
      );
      
      console.log(`[DoubleEliminationParticipantDistributor] Stage 2: Game ${game.gameIndex}, selected ${selectedLosers.length} losers with re-match avoidance`);
      
      for (const loser of selectedLosers) {
        participants.push(
          this.createParticipantWithReference(
            this.createPlayerReference(loser.gameNumber, loser.position),
            { lossBracket: true, eliminationCount: 1 }
          )
        );
        console.log(`[DoubleEliminationParticipantDistributor] Stage 2: Added loser from game ${loser.gameNumber} position ${loser.position}`);
      }
      
    } else {
      // Later stages: combine ALL losers from high-bracket + ALL winners from low-bracket
      const prevHighBracketGames = sourceGames.filter(g => 
        g.stageId === prevStage.id && g.bracketType === 'upper'
      ).sort((a, b) => a.gameNumber - b.gameNumber);
      
      const prevLowBracketGames = sourceGames.filter(g => 
        g.stageId === prevStage.id && g.bracketType === 'lower'
      ).sort((a, b) => a.gameNumber - b.gameNumber);
      
      console.log(`[DoubleEliminationParticipantDistributor] Later stage: ${prevHighBracketGames.length} high games, ${prevLowBracketGames.length} low games`);
      
      // Collect ALL losers from high-bracket games
      const allLosersFromHigh = [];
      if (prevHighBracketGames.length > 0) {
        const winnersPerHighGame = prevStage.topGameWinnersNum || prevStage.gameWinnersNum || 2;
        
        for (const sourceGame of prevHighBracketGames) {
          for (let position = winnersPerHighGame + 1; position <= 4; position++) {
            allLosersFromHigh.push({
              gameNumber: sourceGame.gameNumber,
              position: position
            });
          }
        }
      }
      
      // Collect ALL winners from low-bracket games  
      const allWinnersFromLow = [];
      if (prevLowBracketGames.length > 0) {
        const winnersPerLowGame = prevStage.bottomGameWinnersNum || 2;
        
        for (const sourceGame of prevLowBracketGames) {
          for (let position = 1; position <= winnersPerLowGame; position++) {
            allWinnersFromLow.push({
              gameNumber: sourceGame.gameNumber,
              position: position
            });
          }
        }
      }
      
      // Combine all available players
      const allAvailablePlayers = [...allLosersFromHigh, ...allWinnersFromLow];
      
      console.log(`[DoubleEliminationParticipantDistributor] Later stage: ${allLosersFromHigh.length} losers + ${allWinnersFromLow.length} winners = ${allAvailablePlayers.length} total players`);
      
      // Distribute players using smart re-match avoidance
      const selectedPlayers = this.selectParticipantsWithRematchAvoidance(
        game, allAvailablePlayers, playersPerGame
      );
      
      console.log(`[DoubleEliminationParticipantDistributor] Later stage: Game ${game.gameIndex}, selected ${selectedPlayers.length} players with re-match avoidance from ${allAvailablePlayers.length} available`);
      
      for (const player of selectedPlayers) {
        participants.push(
          this.createParticipantWithReference(
            this.createPlayerReference(player.gameNumber, player.position),
            { lossBracket: true, eliminationCount: 1 }
          )
        );
        console.log(`[DoubleEliminationParticipantDistributor] Later stage: Added player from game ${player.gameNumber} position ${player.position}`);
      }
    }
    
    return participants;
  }

  // Rule 3: Get participants from latest available high-bracket stage
  getParticipantsFromLatestHighBracket(game, stage, sourceGames, playersPerGame) {
    const participants = [];
    
    // Find the latest stage with high-bracket games
    const latestHighBracketStage = this.findLatestHighBracketStage(stage.order - 1);
    if (!latestHighBracketStage) return participants;
    
    console.log(`[DoubleEliminationParticipantDistributor] Using latest high-bracket stage ${latestHighBracketStage.order}`);
    
    const latestHighGames = sourceGames.filter(g => 
      g.stageId === latestHighBracketStage.id && g.bracketType === 'upper'
    ).sort((a, b) => a.gameNumber - b.gameNumber);
    
    if (latestHighGames.length === 0) return participants;
    
    const winnersPerGame = latestHighBracketStage.topGameWinnersNum || latestHighBracketStage.gameWinnersNum || 2;
    const allWinners = [];
    
    for (const sourceGame of latestHighGames) {
      for (let position = 1; position <= winnersPerGame; position++) {
        allWinners.push({
          gameNumber: sourceGame.gameNumber,
          position: position
        });
      }
    }
    
    // Distribute winners using smart re-match avoidance
    const selectedWinners = this.selectParticipantsWithRematchAvoidance(
      game, allWinners, playersPerGame
    );
    
    for (const winner of selectedWinners) {
      participants.push(
        this.createParticipantWithReference(
          this.createPlayerReference(winner.gameNumber, winner.position)
        )
      );
    }
    
    return participants;
  }

  // Get participants for final stage
  getFinalParticipants(game, stage, sourceGames, playersPerGame) {
    const participants = [];
    
    const prevStage = this.findPreviousStage(stage);
    if (!prevStage) return participants;
    
    console.log(`[DoubleEliminationParticipantDistributor] Final stage ${stage.order}: collecting participants`);
    
    // Get winners from immediate previous stage
    const prevStageGames = sourceGames.filter(g => g.stageId === prevStage.id)
      .sort((a, b) => a.gameNumber - b.gameNumber);
    
    const winnersPerPrevGame = prevStage.gameWinnersNum || prevStage.bottomGameWinnersNum || 1;
    
    console.log(`[DoubleEliminationParticipantDistributor] Final: Found ${prevStageGames.length} games in previous stage ${prevStage.order}, ${winnersPerPrevGame} winners each`);
    
    for (const sourceGame of prevStageGames) {
      for (let position = 1; position <= winnersPerPrevGame && participants.length < playersPerGame; position++) {
        participants.push(
          this.createParticipantWithReference(
            this.createPlayerReference(sourceGame.gameNumber, position)
          )
        );
        console.log(`[DoubleEliminationParticipantDistributor] Final: Added winner from previous stage game ${sourceGame.gameNumber} position ${position}`);
      }
    }
    
    // Get winners from latest high-bracket stage (for stages that skipped intermediate stages)
    const latestHighBracketStage = this.findLatestHighBracketStage(stage.order - 1);
    
    if (latestHighBracketStage && latestHighBracketStage.order !== prevStage.order) {
      console.log(`[DoubleEliminationParticipantDistributor] Final: Found latest high-bracket stage ${latestHighBracketStage.order} (different from previous stage ${prevStage.order})`);
      
      const latestHighBracketGames = sourceGames.filter(g => 
        g.stageId === latestHighBracketStage.id && g.bracketType === 'upper'
      ).sort((a, b) => a.gameNumber - b.gameNumber);
      
      const winnersPerHighGame = latestHighBracketStage.topGameWinnersNum || latestHighBracketStage.gameWinnersNum || 2;
      
      console.log(`[DoubleEliminationParticipantDistributor] Final: Found ${latestHighBracketGames.length} high-bracket games in stage ${latestHighBracketStage.order}, ${winnersPerHighGame} winners each`);
      
      for (const sourceGame of latestHighBracketGames) {
        for (let position = 1; position <= winnersPerHighGame && participants.length < playersPerGame; position++) {
          participants.push(
            this.createParticipantWithReference(
              this.createPlayerReference(sourceGame.gameNumber, position)
            )
          );
          console.log(`[DoubleEliminationParticipantDistributor] Final: Added winner from high-bracket stage game ${sourceGame.gameNumber} position ${position}`);
        }
      }
    }
    
    console.log(`[DoubleEliminationParticipantDistributor] Final: Total ${participants.length} participants assigned`);
    
    return participants;
  }

  findLatestHighBracketStage(maxOrder) {
    if (!this.tournament.schema || !this.tournament.schema.stages) return null;
    
    for (let order = maxOrder; order >= 1; order--) {
      const stage = this.tournament.schema.stages.find(s => s.order === order);
      if (stage && (stage.topBracketGameNum || 0) > 0) {
        return stage;
      }
    }
    return null;
  }
}