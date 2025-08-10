// Universal Reference System for Tournament Progression
// Handles player references between stages for both Double Elimination and Olympic tournaments

// Reference format: "stage.game.position" (e.g., "1.1.1" = 1st place from stage 1, game 1)

export const createPlayerReference = (stageOrder, gamePosition, placement) => {
  return `${stageOrder}.${gamePosition}.${placement}`;
};

export const parsePlayerReference = (reference) => {
  if (!reference || typeof reference !== 'string') {
    return null;
  }
  
  const parts = reference.split('.');
  if (parts.length !== 3) {
    return null;
  }
  
  const [stageOrder, gamePosition, placement] = parts.map(p => parseInt(p));
  
  if (isNaN(stageOrder) || isNaN(gamePosition) || isNaN(placement)) {
    return null;
  }
  
  return {
    stageOrder,
    gamePosition,
    placement
  };
};

export const isValidReference = (reference) => {
  return parsePlayerReference(reference) !== null;
};

// Create enhanced participant structure with reference support
export const createParticipantWithReference = (sourceReference, options = {}) => {
  return {
    playerId: null,
    sourceReference: sourceReference,
    points: options.points || 0,
    extraResult: options.extraResult || "",
    resolved: false,
    lossBracket: options.lossBracket || false,
    eliminationCount: options.eliminationCount || 0
  };
};

// Create resolved participant (for manual assignments or stage 1)
export const createResolvedParticipant = (playerId, options = {}) => {
  return {
    playerId: playerId,
    sourceReference: null,
    points: options.points || 0,
    extraResult: options.extraResult || "",
    resolved: true,
    lossBracket: options.lossBracket || false,
    eliminationCount: options.eliminationCount || 0
  };
};

// Check if participant has a reference that needs resolution
export const needsResolution = (participant) => {
  return participant.sourceReference && !participant.resolved && !participant.playerId;
};

// Get all unique stage dependencies for a list of participants
export const getStageDependencies = (participants) => {
  const dependencies = new Set();
  
  participants.forEach(participant => {
    if (participant.sourceReference) {
      const parsed = parsePlayerReference(participant.sourceReference);
      if (parsed) {
        dependencies.add(parsed.stageOrder);
      }
    }
  });
  
  return Array.from(dependencies).sort((a, b) => a - b);
};

// Validate reference format and constraints
export const validateReference = (reference, currentStageOrder) => {
  const parsed = parsePlayerReference(reference);
  
  if (!parsed) {
    return { valid: false, error: 'Invalid reference format' };
  }
  
  if (parsed.stageOrder >= currentStageOrder) {
    return { valid: false, error: 'Cannot reference current or future stages' };
  }
  
  if (parsed.placement < 1 || parsed.placement > 4) {
    return { valid: false, error: 'Placement must be between 1 and 4' };
  }
  
  return { valid: true };
};

// Generate reference display text
export const getReferenceDisplayText = (reference) => {
  const parsed = parsePlayerReference(reference);
  
  if (!parsed) {
    return 'Invalid Reference';
  }
  
  const positionText = getPositionText(parsed.placement);
  return `${positionText} из Игры ${parsed.gamePosition} (Стадия ${parsed.stageOrder})`;
};

export const getPositionText = (placement) => {
  const positions = {
    1: '1-е место',
    2: '2-е место', 
    3: '3-е место',
    4: '4-е место'
  };
  
  return positions[placement] || `${placement}-е место`;
};

// Generate references for tournament progression patterns
export const generateProgressionReferences = (tournamentType, currentStage, gameIndex) => {
  switch (tournamentType) {
    case 'Double Elimination':
      return generateDoubleEliminationReferences(currentStage, gameIndex);
    case 'Олимпийская':
      return generateOlympicReferences(currentStage, gameIndex);
    default:
      return [];
  }
};

// Double Elimination reference generation
const generateDoubleEliminationReferences = (currentStage, gameIndex) => {
  const prevStage = currentStage.order - 1;
  
  if (prevStage < 1) {
    return []; // Stage 1 has no references
  }
  
  // Determine if this is a high or low bracket game
  const isHighBracket = currentStage.bracketType === 'upper' || 
                       (!currentStage.bracketType && gameIndex < (currentStage.topBracketGameNum || 0));
  
  if (isHighBracket) {
    // High bracket games: 1st and 2nd place winners
    return [
      createPlayerReference(prevStage, gameIndex * 2 + 1, 1), // 1st from game A
      createPlayerReference(prevStage, gameIndex * 2 + 1, 2), // 2nd from game A  
      createPlayerReference(prevStage, gameIndex * 2 + 2, 1), // 1st from game B
      createPlayerReference(prevStage, gameIndex * 2 + 2, 2)  // 2nd from game B
    ];
  } else {
    // Low bracket games: 3rd and 4th place + previous low bracket winners
    const references = [];
    
    // Add 3rd and 4th place losers from high bracket
    references.push(
      createPlayerReference(prevStage, gameIndex + 1, 3), // 3rd place
      createPlayerReference(prevStage, gameIndex + 1, 4)  // 4th place
    );
    
    // Add winners from previous low bracket if applicable
    if (prevStage > 1) {
      references.push(
        createPlayerReference(prevStage, gameIndex + 1, 1), // Winner from low bracket
        createPlayerReference(prevStage, gameIndex + 2, 1)  // Winner from low bracket
      );
    }
    
    return references;
  }
};

// Olympic reference generation  
const generateOlympicReferences = (currentStage, gameIndex) => {
  const prevStage = currentStage.order - 1;
  
  if (prevStage < 1) {
    return []; // Stage 1 has no references
  }
  
  // Olympic: Top 2 from each game advance to next stage
  const referencesPerGame = 2;
  const gamesPerNextGame = 2; // 2 previous games feed into 1 next game
  
  const references = [];
  
  for (let i = 0; i < gamesPerNextGame; i++) {
    const sourceGameIndex = gameIndex * gamesPerNextGame + i + 1;
    
    for (let placement = 1; placement <= referencesPerGame; placement++) {
      references.push(createPlayerReference(prevStage, sourceGameIndex, placement));
    }
  }
  
  return references;
};

// Utility to get all games that a stage depends on
export const getStageGameDependencies = (stage, participants) => {
  const dependencies = [];
  
  participants.forEach(participant => {
    if (participant.sourceReference) {
      const parsed = parsePlayerReference(participant.sourceReference);
      if (parsed) {
        const depKey = `${parsed.stageOrder}.${parsed.gamePosition}`;
        if (!dependencies.includes(depKey)) {
          dependencies.push(depKey);
        }
      }
    }
  });
  
  return dependencies;
};