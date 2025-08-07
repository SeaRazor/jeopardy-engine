import schemes from '../../templates/schemes.json';

export const initialTournaments = schemes.map((scheme, index) => {
  const gameTypes = ['Своя игра', 'Эрудит-квартет'];
  const gameType = gameTypes[index % 2];
  
  return {
    id: index + 1,
    name: `${gameType} ${scheme.schemeName} ${scheme.participantsNum}`,
    startDate: '2025-01-15',
    endDate: '2025-01-25',
    type: gameType,
    schema: scheme,
    participants: [], // Tournaments start with no participants
  };
});
