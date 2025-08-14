export const getTournamentStatus = (startDate, endDate) => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) {
    return 'Планируется';
  }
  if (now > end) {
    return 'Закончен';
  }
  return 'Идет';
};

export const getTypeLabel = (type) => {
  const types = {
    'Своя Игра': 'СИ',
    'Эрудит-квартет': 'ЭК',
    'SI': 'СИ',
    'EK': 'ЭК',
    1: 'СИ',
    2: 'ЭК',
    '1': 'СИ',
    '2': 'ЭК',
  };
  return types[type] || '';
};
