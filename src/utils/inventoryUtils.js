export function getSetContents(set, items) {
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const setItems = (set.item_ids || []).map((id) => itemMap.get(id)).filter(Boolean);
  return {
    items: setItems,
    structure: set.structure_summary || {},
    cables: set.cable_summary || {},
  };
}

export function computeAlerts(set, items) {
  const { items: setItems, cables } = getSetContents(set, items);
  const statusCounters = setItems.reduce(
    (acc, item) => {
      if (item?.status === 'HS') acc.hs += 1;
      if (item?.status === 'A_SURVEILLER') acc.toWatch += 1;
      return acc;
    },
    { hs: 0, toWatch: 0 }
  );

  const cableCritical =
    cables?.etat_global === 'CRITIQUE' ||
    Object.values(cables?.estimation || {}).some((v) => v === 'CRITIQUE');

  return {
    ...statusCounters,
    cableCritical,
  };
}

export function generateChecklist({ set, items, prestation }) {
  const baseTasks = [
    'Charger le set complet (contrôleur + sono + lumières)',
    'Vérifier câblerie : check visuel + longueurs',
    'Tester micros (HF + filaire)',
  ];

  const prestationTasks = [];
  if ((prestation?.type || '').toLowerCase().includes('mariage')) {
    prestationTasks.push('Prévoir micro discours + musique ouverture de bal');
  }
  if ((prestation?.type || '').toLowerCase().includes('gala')) {
    prestationTasks.push('Prévoir kit light dynamique + hazer');
  }
  if ((prestation?.type || '').toLowerCase().includes('rallye')) {
    prestationTasks.push('Prévoir set compact + batterie secours');
  }

  const cableNote = set?.cable_summary?.note
    ? `Note câblerie: ${set.cable_summary.note}`
    : 'Câblerie: pas de note spécifique';

  const setItems = getSetContents(set, items).items.map((it) => `- ${it.name} (${it.qty})`);

  return {
    title: `Checklist ${set?.name || ''}`,
    tasks: [...baseTasks, ...prestationTasks, 'Pack sécurité (multiprises, rallonges, gaffer)'],
    items: setItems,
    reminder: cableNote,
  };
}


