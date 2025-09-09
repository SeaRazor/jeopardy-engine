export const getGamePollingInterval = (game) => {
  if (!game) return false;
  
  if (game.status === 'completed' || game.completed === true) {
    return false;
  }
  
  if (!game.participants || game.participants.length === 0) {
    return false;
  }
  
  return 5000;
};

export const getStagePollingInterval = (games) => {
  if (!games || games.length === 0) return false;
  
  const hasActiveGames = games.some(game => {
    return game.status !== 'completed' && 
           game.completed !== true &&
           game.participants && 
           game.participants.length > 0;
  });
  
  return hasActiveGames ? 10000 : false;
};

export const getTournamentPollingInterval = (allGames) => {
  if (!allGames || allGames.length === 0) return false;
  
  const hasActiveGames = allGames.some(game => {
    return game.status !== 'completed' && 
           game.completed !== true &&
           game.participants && 
           game.participants.length > 0;
  });
  
  return hasActiveGames ? 15000 : false;
};

export const isGameActive = (game) => {
  if (!game) return false;
  
  return game.status !== 'completed' && 
         game.completed !== true &&
         game.participants && 
         game.participants.length > 0;
};

export const isGameCompleted = (game) => {
  if (!game) return false;
  
  return game.status === 'completed' || game.completed === true;
};

export const getActiveGamesCount = (games) => {
  if (!games) return 0;
  return games.filter(isGameActive).length;
};

export const getCompletedGamesCount = (games) => {
  if (!games) return 0;
  return games.filter(isGameCompleted).length;
};