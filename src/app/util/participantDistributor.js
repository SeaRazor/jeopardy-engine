// Participant Distributor - Clean participant assignment following the 4 progression rules
// Handles reference creation and participant distribution with re-match avoidance

import { createPlayerReference, createParticipantWithReference } from './referenceSystem.js';

export class ParticipantDistributor {
  constructor(tournament) {
    this.tournament = tournament;
  }

  // Main method to assign participants to all games in a stage
  async assignStageParticipants(stage, games) {
    console.log(`[ParticipantDistributor] Assigning participants for stage ${stage.order}`);
    
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
    
    console.log(`[ParticipantDistributor] Assigning participants to game ${game.gameNumber} (${game.bracketType || 'final'})`);
    
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
    
    console.log(`[ParticipantDistributor] Game ${game.gameNumber} assigned ${participants.length} participants`);
    
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
    
    console.log(`[ParticipantDistributor] Found ${prevHighBracketGames.length} previous high-bracket games`);
    
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
        createParticipantWithReference(
          createPlayerReference(this.tournament.id, winner.gameNumber, winner.position)
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
    
    console.log(`[ParticipantDistributor] Low bracket stage ${stage.order}, game ${game.gameIndex}`);
    
    if (stage.order === 2) {
      // Stage 2 low-bracket: distribute ALL losers from stage 1 across low-bracket games
      const stage1Games = sourceGames.filter(g => 
        g.stageId === prevStage.id
      ).sort((a, b) => a.gameNumber - b.gameNumber);
      
      const winnersPerGame = prevStage.topGameWinnersNum || prevStage.gameWinnersNum || 2;
      
      console.log(`[ParticipantDistributor] Stage 2: Found ${stage1Games.length} stage 1 games, ${winnersPerGame} winners per game`);
      
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
      
      console.log(`[ParticipantDistributor] Stage 2: Collected ${allLosers.length} total losers`);
      
      // Distribute losers using smart re-match avoidance
      const selectedLosers = this.selectParticipantsWithRematchAvoidance(
        game, allLosers, playersPerGame
      );
      
      console.log(`[ParticipantDistributor] Stage 2: Game ${game.gameIndex}, selected ${selectedLosers.length} losers with re-match avoidance`);
      
      for (const loser of selectedLosers) {
        participants.push(
          createParticipantWithReference(
            createPlayerReference(this.tournament.id, loser.gameNumber, loser.position),
            { lossBracket: true, eliminationCount: 1 }
          )
        );
        console.log(`[ParticipantDistributor] Stage 2: Added loser from game ${loser.gameNumber} position ${loser.position}`);
      }
      
    } else {
      // Later stages: combine ALL losers from high-bracket + ALL winners from low-bracket
      const prevHighBracketGames = sourceGames.filter(g => 
        g.stageId === prevStage.id && g.bracketType === 'upper'
      ).sort((a, b) => a.gameNumber - b.gameNumber);
      
      const prevLowBracketGames = sourceGames.filter(g => 
        g.stageId === prevStage.id && g.bracketType === 'lower'
      ).sort((a, b) => a.gameNumber - b.gameNumber);
      
      console.log(`[ParticipantDistributor] Later stage: ${prevHighBracketGames.length} high games, ${prevLowBracketGames.length} low games`);
      
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
      
      console.log(`[ParticipantDistributor] Later stage: ${allLosersFromHigh.length} losers + ${allWinnersFromLow.length} winners = ${allAvailablePlayers.length} total players`);
      
      // Distribute players using smart re-match avoidance
      const selectedPlayers = this.selectParticipantsWithRematchAvoidance(
        game, allAvailablePlayers, playersPerGame
      );
      
      console.log(`[ParticipantDistributor] Later stage: Game ${game.gameIndex}, selected ${selectedPlayers.length} players with re-match avoidance from ${allAvailablePlayers.length} available`);
      
      for (const player of selectedPlayers) {
        participants.push(
          createParticipantWithReference(
            createPlayerReference(this.tournament.id, player.gameNumber, player.position),
            { lossBracket: true, eliminationCount: 1 }
          )
        );
        console.log(`[ParticipantDistributor] Later stage: Added player from game ${player.gameNumber} position ${player.position}`);
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
    
    console.log(`[ParticipantDistributor] Using latest high-bracket stage ${latestHighBracketStage.order}`);
    
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
        createParticipantWithReference(
          createPlayerReference(this.tournament.id, winner.gameNumber, winner.position)
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
    
    console.log(`[ParticipantDistributor] Final stage ${stage.order}: collecting participants`);
    
    // Get winners from immediate previous stage
    const prevStageGames = sourceGames.filter(g => g.stageId === prevStage.id)
      .sort((a, b) => a.gameNumber - b.gameNumber);
    
    const winnersPerPrevGame = prevStage.gameWinnersNum || prevStage.bottomGameWinnersNum || 1;
    
    console.log(`[ParticipantDistributor] Final: Found ${prevStageGames.length} games in previous stage ${prevStage.order}, ${winnersPerPrevGame} winners each`);
    
    for (const sourceGame of prevStageGames) {
      for (let position = 1; position <= winnersPerPrevGame && participants.length < playersPerGame; position++) {
        participants.push(
          createParticipantWithReference(
            createPlayerReference(this.tournament.id, sourceGame.gameNumber, position)
          )
        );
        console.log(`[ParticipantDistributor] Final: Added winner from previous stage game ${sourceGame.gameNumber} position ${position}`);
      }
    }
    
    // Get winners from latest high-bracket stage (for stages that skipped intermediate stages)
    const latestHighBracketStage = this.findLatestHighBracketStage(stage.order - 1);
    
    if (latestHighBracketStage && latestHighBracketStage.order !== prevStage.order) {
      console.log(`[ParticipantDistributor] Final: Found latest high-bracket stage ${latestHighBracketStage.order} (different from previous stage ${prevStage.order})`);
      
      const latestHighBracketGames = sourceGames.filter(g => 
        g.stageId === latestHighBracketStage.id && g.bracketType === 'upper'
      ).sort((a, b) => a.gameNumber - b.gameNumber);
      
      const winnersPerHighGame = latestHighBracketStage.topGameWinnersNum || latestHighBracketStage.gameWinnersNum || 2;
      
      console.log(`[ParticipantDistributor] Final: Found ${latestHighBracketGames.length} high-bracket games in stage ${latestHighBracketStage.order}, ${winnersPerHighGame} winners each`);
      
      for (const sourceGame of latestHighBracketGames) {
        for (let position = 1; position <= winnersPerHighGame && participants.length < playersPerGame; position++) {
          participants.push(
            createParticipantWithReference(
              createPlayerReference(this.tournament.id, sourceGame.gameNumber, position)
            )
          );
          console.log(`[ParticipantDistributor] Final: Added winner from high-bracket stage game ${sourceGame.gameNumber} position ${position}`);
        }
      }
    }
    
    console.log(`[ParticipantDistributor] Final: Total ${participants.length} participants assigned`);
    
    return participants;
  }

  // Rule 4: Smart distribution to avoid rematches when possible
  calculateDistributionStartIndex(game, totalAvailableParticipants, playersPerGame) {
    const gameIndex = game.gameIndex || 0;
    
    // Simple fallback for small player pools (rematches inevitable)
    if (totalAvailableParticipants <= playersPerGame * 2) {
      return (gameIndex * playersPerGame) % totalAvailableParticipants;
    }
    
    // For larger pools, use interleaved distribution to avoid rematches
    return this.calculateInterleavedDistribution(gameIndex, totalAvailableParticipants, playersPerGame);
  }

  // Calculate interleaved distribution to spread players from different source games
  calculateInterleavedDistribution(gameIndex, totalPlayers, playersPerGame) {
    // Assume players are grouped by position (0,1 from game1, 2,3 from game2, etc.)
    const playersPerSourceGame = 2; // typically 2 winners per source game
    const sourceGameCount = totalPlayers / playersPerSourceGame;
    
    // For early stages with many players, use interleaved pattern
    // Game 0: positions 0,4,8,12 (1st places from games 1,3,5,7)
    // Game 1: positions 1,5,9,13 (2nd places from games 1,3,5,7)  
    // Game 2: positions 2,6,10,14 (1st places from games 2,4,6,8)
    // Game 3: positions 3,7,11,15 (2nd places from games 2,4,6,8)
    
    const baseOffset = Math.floor(gameIndex / 2) * playersPerSourceGame; // Which source games to use
    const positionOffset = gameIndex % 2; // Which position (1st or 2nd place)
    
    return baseOffset + positionOffset;
  }

  // Select participants with smart re-match avoidance
  selectParticipantsWithRematchAvoidance(game, availableParticipants, playersNeeded) {
    const gameIndex = game.gameIndex || 0;
    
    // For very small pools where rematches are truly inevitable, use simple consecutive selection
    if (availableParticipants.length < playersNeeded * 1.5) {
      const startIndex = (gameIndex * playersNeeded) % availableParticipants.length;
      const selected = [];
      
      for (let i = 0; i < playersNeeded && startIndex + i < availableParticipants.length; i++) {
        selected.push(availableParticipants[startIndex + i]);
      }
      
      return selected;
    }
    
    // For larger pools, use interleaved selection to avoid rematches
    return this.selectInterleavedParticipants(gameIndex, availableParticipants, playersNeeded);
  }

  // Select participants using balanced distribution that avoids rematches
  selectInterleavedParticipants(gameIndex, availableParticipants, playersNeeded) {
    const selected = [];
    const totalParticipants = availableParticipants.length;
    
    // Separate participants by position for balanced distribution
    const firstPlaces = [];
    const secondPlaces = [];
    
    // Group participants by position (assuming they're ordered by source game)
    for (let i = 0; i < totalParticipants; i += 2) {
      if (i < totalParticipants) firstPlaces.push(availableParticipants[i]);
      if (i + 1 < totalParticipants) secondPlaces.push(availableParticipants[i + 1]);
    }
    
    console.log(`[ParticipantDistributor] Separated: ${firstPlaces.length} first places, ${secondPlaces.length} second places`);
    
    // Calculate how to distribute positions
    const targetGameCount = Math.ceil(totalParticipants / playersNeeded);
    const firstsPerGame = Math.floor(playersNeeded / 2);
    const secondsPerGame = playersNeeded - firstsPerGame;
    
    // Distribute first places using interleaved pattern to avoid clustering
    const firstsAllocated = [];
    for (let i = 0; i < firstsPerGame && firstsAllocated.length < firstPlaces.length; i++) {
      // Use interleaved selection: gameIndex + i*targetGameCount
      const index = (gameIndex + i * targetGameCount) % firstPlaces.length;
      if (!firstsAllocated.includes(index)) {
        firstsAllocated.push(index);
        selected.push(firstPlaces[index]);
        console.log(`[ParticipantDistributor] Target game ${gameIndex}: added 1st place from game ${firstPlaces[index].gameNumber}`);
      }
    }
    
    // Distribute second places using DIFFERENT interleaved pattern to avoid same source games
    const secondsAllocated = [];
    // Offset the starting pattern to get different source games
    const secondOffset = Math.floor(targetGameCount / 2);
    
    for (let i = 0; i < secondsPerGame && secondsAllocated.length < secondPlaces.length; i++) {
      // Use different interleaved pattern with offset
      const index = ((gameIndex + secondOffset) + i * targetGameCount) % secondPlaces.length;
      if (!secondsAllocated.includes(index)) {
        secondsAllocated.push(index);
        selected.push(secondPlaces[index]);
        console.log(`[ParticipantDistributor] Target game ${gameIndex}: added 2nd place from game ${secondPlaces[index].gameNumber}`);
      }
    }
    
    // If we still don't have enough participants, fill with remaining available ones
    while (selected.length < playersNeeded && selected.length < availableParticipants.length) {
      for (let i = 0; i < availableParticipants.length && selected.length < playersNeeded; i++) {
        const participant = availableParticipants[i];
        if (!selected.some(s => s.gameNumber === participant.gameNumber && s.position === participant.position)) {
          selected.push(participant);
        }
      }
    }
    
    return selected;
  }

  // Helper methods
  async getAllTournamentGames() {
    try {
      const response = await fetch(`/api/tournaments/${this.tournament.id}/games`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching tournament games:', error);
      return [];
    }
  }

  findSourceGames(stage, allGames) {
    // Get all games from previous stages
    const currentStageOrder = stage.order;
    return allGames.filter(game => {
      const gameStage = this.findStageById(game.stageId);
      return gameStage && gameStage.order < currentStageOrder;
    }).sort((a, b) => a.gameNumber - b.gameNumber);
  }

  findPreviousStage(stage) {
    if (!this.tournament.schema || !this.tournament.schema.stages) return null;
    return this.tournament.schema.stages.find(s => s.order === stage.order - 1);
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

  findStageById(stageId) {
    if (!this.tournament.schema || !this.tournament.schema.stages) return null;
    return this.tournament.schema.stages.find(s => s.id === stageId);
  }

  assignEmptyParticipants(games, playersPerGame) {
    // For stage 1, games should start with no participants
    // Participants will be added manually during the draw process
    return games.map(game => ({
      ...game,
      participants: []
    }));
  }

  createEmptyParticipant() {
    return {
      playerId: null,
      sourceReference: null,
      points: 0,
      extraResult: "",
      resolved: false,
      lossBracket: false,
      eliminationCount: 0
    };
  }
}

// Factory function
export const createParticipantDistributor = (tournament) => {
  return new ParticipantDistributor(tournament);
};