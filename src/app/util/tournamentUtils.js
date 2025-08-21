// Utility functions for tournament type handling

/**
 * Fetch game type data from API
 * @param {number} gameTypeId - The game type ID
 * @returns {Promise<Object>} - Game type object with playerType
 */
export const fetchGameType = async (gameTypeId) => {
  try {
    const response = await fetch('/api/types');
    if (!response.ok) throw new Error('Failed to fetch game types');
    const gameTypes = await response.json();
    return gameTypes.find(type => type.id === gameTypeId);
  } catch (error) {
    console.error('Error fetching game type:', error);
    return null;
  }
};

/**
 * Get the player type (person/team) for a tournament based on its type ID
 * @param {number} tournamentTypeId - The tournament type ID
 * @returns {Promise<string>} - Either 'person' or 'team'
 */
export const getPlayerTypeFromTournamentType = async (tournamentTypeId) => {
  const gameType = await fetchGameType(tournamentTypeId);
  return gameType ? gameType.playerType : 'person'; // Default to 'person' if not found
};

/**
 * Get the tournament type name from its ID
 * @param {number} tournamentTypeId - The tournament type ID
 * @returns {Promise<string>} - The tournament type name
 */
export const getTournamentTypeName = async (tournamentTypeId) => {
  const gameType = await fetchGameType(tournamentTypeId);
  return gameType ? gameType.name : 'Unknown';
};

/**
 * Validate if a player can be added to a tournament based on player type
 * @param {Object} player - The player object with playerType
 * @param {number} tournamentTypeId - The tournament type ID
 * @returns {Promise<boolean>} - True if player can be added
 */
export const validatePlayerForTournament = async (player, tournamentTypeId) => {
  const requiredPlayerType = await getPlayerTypeFromTournamentType(tournamentTypeId);
  return player.playerType === requiredPlayerType;
};

/**
 * Get the required player type for a tournament
 * @param {Object} tournament - Tournament object with type field
 * @returns {Promise<string>} - Either 'person' or 'team'
 */
export const getRequiredPlayerType = async (tournament) => {
  return await getPlayerTypeFromTournamentType(tournament?.type);
};