// Enhanced Participant Data Structure Examples
// Demonstrates how the new reference system works with different participant types

// Example 1: Stage 1 Game with Resolved Participants (Manual Assignment)
export const stage1GameExample = {
  id: 1001,
  gameDate: "2025-08-10T14:00:00.000Z",
  gamePlace: "Арена 1",
  presenterId: 1,
  stageOrder: 1,
  tournamentType: "DoubleElimination",
  bracketType: "upper",
  bracketPosition: 1,
  participants: [
    {
      playerId: "abc123",         // Resolved player ID
      sourceReference: null,      // No reference for stage 1
      points: 45,
      extraResult: "+2",
      resolved: true,             // Already resolved
      lossBracket: false,         // No losses yet
      eliminationCount: 0         // No eliminations
    },
    {
      playerId: "def456",
      sourceReference: null,
      points: 32,
      extraResult: "",
      resolved: true,
      lossBracket: false,
      eliminationCount: 0
    },
    {
      playerId: "ghi789",
      sourceReference: null,
      points: 28,
      extraResult: "-1",
      resolved: true,
      lossBracket: false,
      eliminationCount: 0
    },
    {
      playerId: "jkl012",
      sourceReference: null,
      points: 15,
      extraResult: "",
      resolved: true,
      lossBracket: false,
      eliminationCount: 0
    }
  ]
};

// Example 2: Stage 2 Upper Bracket Game with References (Auto-Generated)
export const stage2UpperGameExample = {
  id: 2001,
  gameDate: "2025-08-11T14:00:00.000Z",
  gamePlace: "Арена 1",
  presenterId: 1,
  stageOrder: 1,
  tournamentType: "DoubleElimination",
  bracketType: "upper",
  bracketPosition: 1,
  participants: [
    {
      playerId: null,             // Not resolved yet
      sourceReference: "1.1.1",  // 1st place from stage 1, game 1
      points: 0,
      extraResult: "",
      resolved: false,            // Needs resolution
      lossBracket: false,
      eliminationCount: 0
    },
    {
      playerId: null,
      sourceReference: "1.1.2",  // 2nd place from stage 1, game 1
      points: 0,
      extraResult: "",
      resolved: false,
      lossBracket: false,
      eliminationCount: 0
    },
    {
      playerId: null,
      sourceReference: "1.2.1",  // 1st place from stage 1, game 2
      points: 0,
      extraResult: "",
      resolved: false,
      lossBracket: false,
      eliminationCount: 0
    },
    {
      playerId: null,
      sourceReference: "1.2.2",  // 2nd place from stage 1, game 2
      points: 0,
      extraResult: "",
      resolved: false,
      lossBracket: false,
      eliminationCount: 0
    }
  ]
};

// Example 3: Stage 2 Lower Bracket Game with Mixed References
export const stage2LowerGameExample = {
  id: 2002,
  gameDate: "2025-08-11T16:00:00.000Z",
  gamePlace: "Арена 2",
  presenterId: 1,
  stageOrder: 2,
  tournamentType: "DoubleElimination",
  bracketType: "lower",
  bracketPosition: 1,
  participants: [
    {
      playerId: null,
      sourceReference: "1.1.3",  // 3rd place from stage 1, game 1
      points: 0,
      extraResult: "",
      resolved: false,
      lossBracket: true,          // Dropped to lower bracket
      eliminationCount: 1         // One loss
    },
    {
      playerId: null,
      sourceReference: "1.1.4",  // 4th place from stage 1, game 1
      points: 0,
      extraResult: "",
      resolved: false,
      lossBracket: true,
      eliminationCount: 1
    },
    {
      playerId: null,
      sourceReference: "1.2.3",  // 3rd place from stage 1, game 2
      points: 0,
      extraResult: "",
      resolved: false,
      lossBracket: true,
      eliminationCount: 1
    },
    {
      playerId: null,
      sourceReference: "1.2.4",  // 4th place from stage 1, game 2
      points: 0,
      extraResult: "",
      resolved: false,
      lossBracket: true,
      eliminationCount: 1
    }
  ]
};

// Example 4: Resolved Stage 2 Game After Reference Resolution
export const stage2ResolvedGameExample = {
  id: 2003,
  gameDate: "2025-08-11T14:00:00.000Z",
  gamePlace: "Арена 1",
  presenterId: 1,
  stageOrder: 1,
  tournamentType: "DoubleElimination",
  bracketType: "upper",
  bracketPosition: 1,
  participants: [
    {
      playerId: "abc123",         // Resolved from reference 1.1.1
      sourceReference: "1.1.1",  // Original reference preserved
      points: 38,                 // Points from stage 2 game
      extraResult: "",
      resolved: true,             // Now resolved
      lossBracket: false,
      eliminationCount: 0
    },
    {
      playerId: "def456",         // Resolved from reference 1.1.2
      sourceReference: "1.1.2",
      points: 22,
      extraResult: "+1",
      resolved: true,
      lossBracket: false,
      eliminationCount: 0
    },
    {
      playerId: "mno345",         // Resolved from reference 1.2.1
      sourceReference: "1.2.1",
      points: 30,
      extraResult: "",
      resolved: true,
      lossBracket: false,
      eliminationCount: 0
    },
    {
      playerId: "pqr678",         // Resolved from reference 1.2.2
      sourceReference: "1.2.2",
      points: 15,
      extraResult: "-2",
      resolved: true,
      lossBracket: false,
      eliminationCount: 0
    }
  ]
};

// Example 5: Olympic Tournament Stage Progression
export const olympicStage2Example = {
  id: 3001,
  gameDate: "2025-08-11T15:00:00.000Z",
  gamePlace: "Арена 1",
  presenterId: 1,
  stageOrder: 1,
  tournamentType: "Olympic",
  participants: [
    {
      playerId: null,
      sourceReference: "1.1.1",  // 1st from game 1
      points: 0,
      extraResult: "",
      resolved: false,
      lossBracket: false,
      eliminationCount: 0         // Olympic doesn't track losses
    },
    {
      playerId: null,
      sourceReference: "1.1.2",  // 2nd from game 1
      points: 0,
      extraResult: "",
      resolved: false,
      lossBracket: false,
      eliminationCount: 0
    },
    {
      playerId: null,
      sourceReference: "1.2.1",  // 1st from game 2
      points: 0,
      extraResult: "",
      resolved: false,
      lossBracket: false,
      eliminationCount: 0
    },
    {
      playerId: null,
      sourceReference: "1.2.2",  // 2nd from game 2
      points: 0,
      extraResult: "",
      resolved: false,
      lossBracket: false,
      eliminationCount: 0
    }
  ]
};

// Example 6: Complex Double Elimination Final with Mixed Sources
export const finalStageExample = {
  id: 9001,
  gameDate: "2025-08-12T18:00:00.000Z",
  gamePlace: "Финальная арена",
  presenterId: 1,
  stageOrder: 1,
  tournamentType: "DoubleElimination",
  participants: [
    {
      playerId: null,
      sourceReference: "8.1.1",  // Winner from upper bracket final
      points: 0,
      extraResult: "",
      resolved: false,
      lossBracket: false,         // Upper bracket champion
      eliminationCount: 0
    },
    {
      playerId: null,
      sourceReference: "8.2.1",  // Winner from lower bracket final
      points: 0,
      extraResult: "",
      resolved: false,
      lossBracket: true,          // Lower bracket champion
      eliminationCount: 1
    },
    // Final typically has only 2 participants in Double Elimination
    {
      playerId: null,
      sourceReference: null,
      points: 0,
      extraResult: "",
      resolved: false,
      lossBracket: false,
      eliminationCount: 0
    },
    {
      playerId: null,
      sourceReference: null,
      points: 0,
      extraResult: "",
      resolved: false,
      lossBracket: false,
      eliminationCount: 0
    }
  ]
};

// Example Tournament with Progressive Metadata
export const tournamentWithProgressionExample = {
  id: 4,
  name: "Прогрессивный турнир",
  startDate: "2025-08-10",
  endDate: "2025-08-15",
  type: "SI",
  gameCreationMethod: "emptyGames",
  
  // New progression metadata
  progressionMetadata: {
    progressionRules: {
      type: "doubleElimination",
      autoProgress: true,
      bracketSystem: true,
      eliminationCount: 2,
      
      stageRules: {
        1: {
          manualAssignment: true,
          playersPerGame: 4,
          winners: 2
        },
        default: {
          manualAssignment: false,
          playersPerGame: 4,
          highBracket: {
            composition: [
              { sourcePosition: 1, count: 2 },
              { sourcePosition: 2, count: 2 }
            ]
          },
          lowBracket: {
            composition: [
              { sourcePosition: 3, count: 2 },
              { sourcePosition: 4, count: 2 }
            ]
          }
        }
      }
    },
    
    stageProgression: [
      {
        stageId: 1,
        order: 1,
        dependencies: [],
        autoGenerated: false,
        completed: false
      },
      {
        stageId: 2,
        order: 2,
        dependencies: [1],
        autoGenerated: true,
        completed: false
      },
      {
        stageId: 3,
        order: 3,
        dependencies: [2],
        autoGenerated: true,
        completed: false
      }
    ]
  },
  
  schema: {
    id: 2,
    schemeName: "Double Elimination",
    participantsNum: 32,
    stages: [
      {
        description: "Все продолжают играть",
        id: 1,
        name: "Квалификация",
        order: 1,
        topBracketGameNum: 8,
        bottomBracketGamesNum: 0
      },
      {
        description: "Вылетают третьи и четвёртые места жёлтых боёв",
        id: 2,
        name: "Топ-32",
        order: 2,
        topBracketGameNum: 4,
        bottomBracketGamesNum: 4
      }
    ]
  },
  
  participants: [
    // Tournament participants with pool assignments
    {
      id: "player1",
      playerType: "person",
      firstName: "Иван",
      lastName: "Иванов",
      poolId: 1
    }
    // ... more participants
  ]
};

// Utility functions for working with enhanced participants
export const participantUtils = {
  
  // Check if participant needs resolution
  needsResolution: (participant) => {
    return participant.sourceReference && !participant.resolved && !participant.playerId;
  },
  
  // Check if participant is resolved
  isResolved: (participant) => {
    return participant.resolved || !participant.sourceReference;
  },
  
  // Get display name for participant
  getDisplayName: (participant, playersData = []) => {
    if (participant.playerId) {
      const player = playersData.find(p => p.id === participant.playerId);
      if (player) {
        return player.name || `${player.firstName} ${player.lastName}`;
      }
    }
    
    if (participant.sourceReference) {
      return `Reference: ${participant.sourceReference}`;
    }
    
    return 'Unknown Participant';
  },
  
  // Calculate participant status
  getStatus: (participant) => {
    if (participant.resolved || !participant.sourceReference) {
      return 'resolved';
    }
    if (participant.sourceReference && !participant.playerId) {
      return 'pending';
    }
    return 'unknown';
  },
  
  // Get bracket information
  getBracketInfo: (participant) => {
    return {
      bracket: participant.lossBracket ? 'lower' : 'upper',
      eliminations: participant.eliminationCount || 0,
      canContinue: participant.eliminationCount < 2 // For double elimination
    };
  }
};

export default {
  stage1GameExample,
  stage2UpperGameExample,
  stage2LowerGameExample,
  stage2ResolvedGameExample,
  olympicStage2Example,
  finalStageExample,
  tournamentWithProgressionExample,
  participantUtils
};