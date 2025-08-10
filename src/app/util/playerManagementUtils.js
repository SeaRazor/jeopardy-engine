// Utility functions for player management access control

export const canManagePlayersInStage = (tournament, stageOrder) => {
  // Always allow player management for stages other than 1
  if (stageOrder !== 1) {
    return true;
  }
  
  // For stage 1, check if games were created with "emptyGames" method
  // Default to true for backward compatibility with existing tournaments
  const gameCreationMethod = tournament?.gameCreationMethod || 'emptyGames';
  return gameCreationMethod === 'emptyGames';
};

export const getPlayerManagementState = (tournament, stageOrder) => {
  const canManage = canManagePlayersInStage(tournament, stageOrder);
  
  return {
    canAdd: canManage,
    canEdit: canManage,
    canDelete: canManage,
    restrictionReason: canManage ? null : 
      'Изменение участников недоступно. Игры созданы не через "Создать пустые бои".'
  };
};