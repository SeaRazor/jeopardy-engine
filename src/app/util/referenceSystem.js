// Universal Reference System for Tournament Progression
// Handles player references between stages for both Double Elimination and Olympic tournaments

// Reference format: "tournament.gameNumber.position" (e.g., "4.29.1" = 1st place from game 29 in tournament 4)

export const createPlayerReference = (tournamentId, gameNumber, placement) => {
  return `${tournamentId}.${gameNumber}.${placement}`;
};

export const parsePlayerReference = (reference) => {
  if (!reference || typeof reference !== 'string') {
    return null;
  }
  
  const parts = reference.split('.');
  if (parts.length !== 3) {
    return null;
  }
  
  const [tournamentId, gameNumber, placement] = parts.map(p => parseInt(p));
  
  if (isNaN(tournamentId) || isNaN(gameNumber) || isNaN(placement)) {
    return null;
  }
  
  return {
    tournamentId,
    gameNumber,
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
    tieBreakResult: options.tieBreakResult || null,
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
    tieBreakResult: options.tieBreakResult || null,
    resolved: true,
    lossBracket: options.lossBracket || false,
    eliminationCount: options.eliminationCount || 0
  };
};

// Check if participant has a reference that needs resolution
export const needsResolution = (participant) => {
  return participant.sourceReference && !participant.resolved && !participant.playerId;
};

// Get all unique game dependencies for a list of participants
export const getGameDependencies = (participants) => {
  const dependencies = new Set();
  
  participants.forEach(participant => {
    if (participant.sourceReference) {
      const parsed = parsePlayerReference(participant.sourceReference);
      if (parsed) {
        dependencies.add(parsed.gameNumber);
      }
    }
  });
  
  return Array.from(dependencies).sort((a, b) => a - b);
};

// Validate reference format and constraints
export const validateReference = (reference, currentTournamentId, currentGameNumber) => {
  const parsed = parsePlayerReference(reference);
  
  if (!parsed) {
    return { valid: false, error: 'Invalid reference format' };
  }
  
  if (parsed.tournamentId !== currentTournamentId) {
    return { valid: false, error: 'Cannot reference games from different tournaments' };
  }
  
  if (parsed.gameNumber >= currentGameNumber) {
    return { valid: false, error: 'Cannot reference current or future games' };
  }
  
  if (parsed.placement < 1 || parsed.placement > 4) {
    return { valid: false, error: 'Placement must be between 1 and 4' };
  }
  
  return { valid: true };
};

// Generate reference display text with absolute game numbers
export const getReferenceDisplayText = (reference) => {
  const parsed = parsePlayerReference(reference);
  
  if (!parsed) {
    return 'Invalid Reference';
  }
  
  const positionText = getPositionText(parsed.placement);
  return `${positionText} из Игры ${parsed.gameNumber}`;
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


// Utility to get all games that a stage depends on
export const getStageGameDependencies = (stage, participants) => {
  const dependencies = [];
  
  participants.forEach(participant => {
    if (participant.sourceReference) {
      const parsed = parsePlayerReference(participant.sourceReference);
      if (parsed) {
        if (!dependencies.includes(parsed.gameNumber)) {
          dependencies.push(parsed.gameNumber);
        }
      }
    }
  });
  
  return dependencies.sort((a, b) => a - b);
};