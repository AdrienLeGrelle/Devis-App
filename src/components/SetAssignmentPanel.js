import React, { useMemo } from 'react';
import './SetAssignmentPanel.css';
import {
  SET_ZONES,
  SETS,
  buildAssignmentsMap,
} from '../utils/inventoryAssignments';

function SetAssignmentPanel({
  items,
  assignmentsForDate,
  onAssignmentsChange,
  onDeleteItem,
  dragItemId,
  setDragItemId,
  compact = false,
  setNamesForDate = {},
  onSetNameChange,
  defectNotes = {},
  formulePresets = {},
  onApplyFormule,
}) {
  const isAssigned = (itemId) => (assignmentsForDate[itemId] || []).length > 0;

  const assignments = useMemo(
    () => buildAssignmentsMap(items, assignmentsForDate),
    [items, assignmentsForDate]
  );

  const handleDropToSet = (setId) => {
    if (!dragItemId) return;
    const item = items.find((i) => i.id === dragItemId);
    const targetZone = item && SET_ZONES.includes(item.category) ? item.category : SET_ZONES[0];
    const current = assignmentsForDate[dragItemId] || [];
    const filtered = current.filter((t) => !String(t).startsWith('set'));
    const updated = { ...assignmentsForDate, [dragItemId]: [...filtered, `${setId}:${targetZone}`] };
    onAssignmentsChange(updated);
    setDragItemId(null);
  };

  const handleDropToPool = () => {
    if (!dragItemId) return;
    const updated = { ...assignmentsForDate, [dragItemId]: [] };
    onAssignmentsChange(updated);
    setDragItemId(null);
  };

  return (
    <div className={`set-assignment-panel ${compact ? 'compact' : ''}`}>
      <div
        className="assignment-pool"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropToPool}
      >
        <div className="pool-header">
          <h4>Matériel disponible</h4>
          <p>Glisse ici pour retirer d'un set.</p>
        </div>
        <div className="pool-items pool-items-by-category">
          {SET_ZONES.map((cat) => {
            const catItems = items.filter((it) => it.category === cat);
            return (
              <div key={cat} className="pool-column">
                <div className="pool-column-title">{cat}</div>
                <div className="pool-column-items">
                  {catItems.map((it) => {
                    const assigned = isAssigned(it.id);
                    return (
                      <div
                        key={it.id}
                        className={`item-row ${assigned ? 'assigned' : ''} ${defectNotes[it.id] ? 'has-defect' : ''}`}
                        draggable={!assigned}
                        onDragStart={!assigned ? () => setDragItemId(it.id) : undefined}
                      >
                        <div>
                          <div className="item-name">
                            {assigned && <span className="assigned-cross" title="Assigné à un set">✕</span>}
                            {defectNotes[it.id] && (
                              <span className="defect-indicator" title={defectNotes[it.id]}>▲</span>
                            )}
                            {it.name}
                          </div>
                          <div className="item-meta">{it.qty} pcs</div>
                        </div>
                        {onDeleteItem && !assigned && (
                          <button
                            type="button"
                            className="btn-trash-item"
                            onClick={(e) => { e.stopPropagation(); onDeleteItem(it.id); }}
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {catItems.length === 0 && (
                    <p className="pool-empty">—</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="assignment-sets">
        {SETS.map((set) => (
          <div
            key={set.id}
            className="set-card"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDropToSet(set.id)}
          >
            <div className="set-header">
              <div className="set-header-top">
                <h4>{set.name}</h4>
                {onSetNameChange && (
                  <input
                    type="text"
                    className="set-name-input"
                    placeholder="Nom prestation"
                    value={setNamesForDate[set.id] || ''}
                    onChange={(e) => onSetNameChange(set.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </div>
              {onApplyFormule && Object.keys(formulePresets).length > 0 && (
                <select
                  className="set-formule-select"
                  value=""
                  onChange={(e) => {
                    const presetId = e.target.value;
                    if (presetId) {
                      onApplyFormule(set.id, presetId);
                      e.target.value = '';
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">— Formule —</option>
                  {Object.entries(formulePresets).map(([id, p]) => (
                    <option key={id} value={id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
            {SET_ZONES.map((zone) => (
              <div key={zone} className="set-zone">
                <div className="zone-title">{zone}</div>
                <div
                  className="zone-drop"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.stopPropagation(); handleDropToSet(set.id); }}
                >
                  {assignments[set.id][zone].length === 0 && (
                    <div className="zone-empty">Glisse ici</div>
                  )}
                  {assignments[set.id][zone].map((it) => (
                    <div
                      key={it.id}
                      className={`chip ${defectNotes[it.id] ? 'has-defect' : ''}`}
                      draggable
                      onDragStart={() => setDragItemId(it.id)}
                      title={defectNotes[it.id] || undefined}
                    >
                      {defectNotes[it.id] && <span className="defect-indicator">▲</span>}
                      {it.name} ({it.qty})
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SetAssignmentPanel;
