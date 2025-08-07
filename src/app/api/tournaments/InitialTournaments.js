import schemes from '../../templates/schemes.json';

export const initialTournaments = schemes.map((scheme, index) => ({
    id: index + 1,
    name: `Tournament based on ${scheme.schemeName}`,
    startDate: '2025-01-01',
    endDate: '2025-01-10',
    type: index % 2 === 0 ? 'Своя игра' : 'Эрудит-квартет',
    schema: scheme,
    participants: [],
}));
