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
  // Handle integer IDs as primary format
  if (type === 1 || type === '1') return 'СИ';
  if (type === 2 || type === '2') return 'ЭК';
  if (type === 3 || type === '3') return 'БР';

  // Fallback for legacy string names during transition
  if (type === 'Своя игра') return 'СИ';
  if (type === 'Эрудит-квартет') return 'ЭК';
  if (type === 'Брейн-ринг') return 'БР';

  return '';
};
