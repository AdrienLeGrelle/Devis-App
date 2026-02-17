import React, { useState } from 'react';
import './InventoryView.css';
import SetAssignmentPanel from './SetAssignmentPanel';
import { getAssignmentsForDate, getSetNamesForDate, SET_ZONES } from '../utils/inventoryAssignments';

const CATEGORIES = ['SON', 'LUMIERE', 'DJ'];

function InventoryView({ inventory, onInventoryChange, selectedDate: selectedDateProp, onDateChange }) {
  const items = inventory?.items || [];
  const today = new Date().toISOString().split('T')[0];
  const [localDate, setLocalDate] = useState(today);
  const selectedDate = selectedDateProp ?? localDate;
  const handleDateChange = (val) => {
    if (onDateChange) onDateChange(val);
    else setLocalDate(val);
  };
  const [dragItemId, setDragItemId] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', category: 'SON', qty: 1 });
  const [defectMaterialId, setDefectMaterialId] = useState('');
  const [showReglages, setShowReglages] = useState(false);
  const [showMaterielManager, setShowMaterielManager] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('ALL');

  const assignmentsForDate = getAssignmentsForDate(inventory, selectedDate);
  const setNamesForDate = getSetNamesForDate(inventory, selectedDate);

  const handleAssignmentsChange = (updated) => {
    const byDate = { ...(inventory?.assignmentsByDate || {}) };
    byDate[selectedDate] = updated;
    onInventoryChange({ ...inventory, assignmentsByDate: byDate });
  };

  const handleSetNameChange = (setId, name) => {
    const byDate = { ...(inventory?.setNamesByDate || {}) };
    byDate[selectedDate] = { ...(byDate[selectedDate] || {}), [setId]: name };
    onInventoryChange({ ...inventory, setNamesByDate: byDate });
  };

  const handleApplyFormule = (setId, presetId) => {
    const preset = inventory?.formulePresets?.[presetId];
    if (!preset?.itemIds?.length) return;
    const itemMap = new Map(items.map((i) => [i.id, i]));
    const updated = { ...assignmentsForDate };
    Object.keys(updated).forEach((itemId) => {
      const tags = updated[itemId] || [];
      const inThisSet = tags.filter((t) => String(t).startsWith(`${setId}:`));
      if (inThisSet.length) {
        const rest = tags.filter((t) => !String(t).startsWith(`${setId}:`));
        updated[itemId] = rest;
      }
    });
    preset.itemIds.forEach((itemId) => {
      const item = itemMap.get(itemId);
      if (!item) return;
      const zone = SET_ZONES.includes(item.category) ? item.category : SET_ZONES[0];
      const current = updated[itemId] || [];
      const filtered = current.filter((t) => !String(t).startsWith('set'));
      updated[itemId] = [...filtered, `${setId}:${zone}`];
    });
    handleAssignmentsChange(updated);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;
    const item = {
      id: `it-${Date.now()}`,
      name: newItem.name.trim(),
      category: newItem.category || 'SON',
      status: 'OK',
      qty: Number(newItem.qty) || 1,
    };
    onInventoryChange({ ...inventory, items: [...items, item] });
    setNewItem({ name: '', category: 'SON', qty: 1 });
  };

  const defectNotes = inventory?.defectNotes || {};
  const shoppingList = inventory?.shoppingList || [];

  const handleDefectChange = (itemId, note) => {
    const next = { ...defectNotes };
    if (note.trim()) next[itemId] = note.trim();
    else delete next[itemId];
    onInventoryChange({ ...inventory, defectNotes: next });
  };

  const handleAddToShoppingList = (e) => {
    e.preventDefault();
    const input = e.target.querySelector('input');
    const val = input?.value?.trim();
    if (!val) return;
    onInventoryChange({ ...inventory, shoppingList: [...shoppingList, val] });
    input.value = '';
  };

  const handleRemoveFromShoppingList = (idx) => {
    onInventoryChange({
      ...inventory,
      shoppingList: shoppingList.filter((_, i) => i !== idx),
    });
  };

  const formulePresets = inventory?.formulePresets || {};
  const handleFormulePresetChange = (presetId, itemIds) => {
    const preset = formulePresets[presetId];
    if (!preset) return;
    onInventoryChange({
      ...inventory,
      formulePresets: {
        ...formulePresets,
        [presetId]: { ...preset, itemIds },
      },
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('Supprimer ce matériel ?')) {
      const byDate = { ...(inventory?.assignmentsByDate || {}) };
      Object.keys(byDate).forEach((d) => {
        if (byDate[d][id]) {
          const next = { ...byDate[d] };
          delete next[id];
          byDate[d] = next;
        }
      });
      onInventoryChange({
        ...inventory,
        items: items.filter((it) => it.id !== id),
        assignmentsByDate: byDate,
      });
    }
  };

  const handleUpdateItem = (id, updates) => {
    onInventoryChange({
      ...inventory,
      items: items.map((it) => (it.id === id ? { ...it, ...updates } : it)),
    });
  };

  const filteredItems = filterCategory === 'ALL'
    ? items
    : items.filter((it) => it.category === filterCategory);

  return (
    <div className="inventory">
      <div className="inventory-header">
        <h2>Inventaire par date</h2>
        <p className="subtitle">
          Choisis une date pour configurer tes 4 sets. Chaque date peut avoir une configuration différente
          (ex : 4 juillet ≠ 12 mars).
        </p>
      </div>

      <div className="inventory-date-row">
        <label>
          <span>Date :</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
          />
        </label>
      </div>

      <form className="inventory-add-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Nom du matériel"
          value={newItem.name}
          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          required
        />
        <select
          value={newItem.category}
          onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          placeholder="Qté"
          value={newItem.qty}
          onChange={(e) => setNewItem({ ...newItem, qty: e.target.value })}
        />
        <button type="submit" className="btn-add-item">+ Ajouter</button>
      </form>

      <SetAssignmentPanel
        items={items}
        assignmentsForDate={assignmentsForDate}
        onAssignmentsChange={handleAssignmentsChange}
        onDeleteItem={handleDelete}
        dragItemId={dragItemId}
        setDragItemId={setDragItemId}
        setNamesForDate={setNamesForDate}
        onSetNameChange={handleSetNameChange}
        defectNotes={defectNotes}
        formulePresets={inventory?.formulePresets || {}}
        onApplyFormule={handleApplyFormule}
      />

      <div className="inventory-notes">
        <h3>Notes</h3>
        <div className="notes-section">
          <h4>Défauts par matériel</h4>
          <form
            className="defect-add-form"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.target.querySelector('input');
              const note = input?.value?.trim();
              if (defectMaterialId && note) {
                handleDefectChange(defectMaterialId, note);
                setDefectMaterialId('');
                input.value = '';
              }
            }}
          >
            <select
              value={defectMaterialId}
              onChange={(e) => setDefectMaterialId(e.target.value)}
            >
              <option value="">Choisir un matériel</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>{it.name}</option>
              ))}
            </select>
            <input type="text" placeholder="Décris le défaut..." />
            <button type="submit">Ajouter</button>
          </form>
          <div className="defect-notes-list">
            {items.filter((it) => defectNotes[it.id]).map((it) => (
              <div key={it.id} className="defect-note-row">
                <span className="defect-material">{it.name}</span>
                <input
                  type="text"
                  placeholder="Défaut, panne..."
                  value={defectNotes[it.id] || ''}
                  onChange={(e) => handleDefectChange(it.id, e.target.value)}
                />
                <button type="button" onClick={() => handleDefectChange(it.id, '')} title="Retirer">×</button>
              </div>
            ))}
            {items.filter((it) => defectNotes[it.id]).length === 0 && (
              <p className="notes-empty">Aucun défaut noté.</p>
            )}
          </div>
        </div>
        <div className="notes-section">
          <h4>À acheter</h4>
          <form className="shopping-add-form" onSubmit={handleAddToShoppingList}>
            <input type="text" placeholder="Ex: Câble XLR, pile 9V..." />
            <button type="submit">+ Ajouter</button>
          </form>
          <ul className="shopping-list">
            {shoppingList.map((item, idx) => (
              <li key={idx}>
                <span>{item}</span>
                <button type="button" onClick={() => handleRemoveFromShoppingList(idx)} title="Retirer">×</button>
              </li>
            ))}
            {shoppingList.length === 0 && (
              <li className="shopping-empty">Rien à acheter.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="inventory-reglages">
        <button
          type="button"
          className="reglages-toggle"
          onClick={() => setShowReglages(!showReglages)}
        >
          ⚙️ Réglages
        </button>
        {showReglages && (
          <div className="reglages-content">
            <h4>Formules – pré-remplissage des sets</h4>
            <p className="reglages-desc">Configure le matériel de chaque formule. Quand tu choisis une formule dans un set, le matériel est appliqué automatiquement.</p>
            {Object.entries(formulePresets).map(([presetId, preset]) => (
              <div key={presetId} className="formule-preset-config">
                <h5>{preset.name}</h5>
                <div className="formule-preset-items">
                  {(preset.itemIds || []).map((itemId) => {
                    const it = items.find((i) => i.id === itemId);
                    return it ? (
                      <span key={itemId} className="formule-chip">
                        {it.name}
                        <button
                          type="button"
                          onClick={() => handleFormulePresetChange(
                            presetId,
                            (preset.itemIds || []).filter((id) => id !== itemId)
                          )}
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                  <select
                    onChange={(e) => {
                      const id = e.target.value;
                      if (id && !(preset.itemIds || []).includes(id)) {
                        handleFormulePresetChange(presetId, [...(preset.itemIds || []), id]);
                      }
                      e.target.value = '';
                    }}
                  >
                    <option value="">+ Ajouter</option>
                    {items
                      .filter((it) => !(preset.itemIds || []).includes(it.id))
                      .map((it) => (
                        <option key={it.id} value={it.id}>{it.name}</option>
                      ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="inventory-materiel-manager">
        <button
          type="button"
          className="materiel-manager-toggle"
          onClick={() => setShowMaterielManager(!showMaterielManager)}
        >
          📝 Gérer les noms du matériel
        </button>
        {showMaterielManager && (
          <div className="materiel-manager-content">
            <p className="materiel-manager-desc">
              Ajoute un nom complet pour chaque matériel. Ce nom sera utilisé sur le devis (ex: "Système BOSE L1 Pro32" au lieu de "SET BOSE").
            </p>
            <div className="materiel-filter">
              <label>Filtrer par catégorie :</label>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="ALL">Tous</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="materiel-list">
              <div className="materiel-list-header">
                <span className="col-name">Nom court</span>
                <span className="col-fullname">Nom complet (devis)</span>
                <span className="col-actions"></span>
              </div>
              {filteredItems.map((it) => (
                <div key={it.id} className="materiel-row">
                  <span className="col-name">{it.name}</span>
                  {editingItemId === it.id ? (
                    <input
                      type="text"
                      className="col-fullname-input"
                      placeholder="Nom complet pour le devis..."
                      defaultValue={it.fullName || ''}
                      autoFocus
                      onBlur={(e) => {
                        handleUpdateItem(it.id, { fullName: e.target.value.trim() });
                        setEditingItemId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateItem(it.id, { fullName: e.target.value.trim() });
                          setEditingItemId(null);
                        }
                        if (e.key === 'Escape') {
                          setEditingItemId(null);
                        }
                      }}
                    />
                  ) : (
                    <span
                      className={`col-fullname ${it.fullName ? '' : 'empty'}`}
                      onClick={() => setEditingItemId(it.id)}
                      title="Cliquer pour éditer"
                    >
                      {it.fullName || '—'}
                    </span>
                  )}
                  <span className="col-actions">
                    <button
                      type="button"
                      className="btn-edit-fullname"
                      onClick={() => setEditingItemId(it.id)}
                      title="Modifier le nom complet"
                    >
                      ✏️
                    </button>
                  </span>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <p className="materiel-empty">Aucun matériel dans cette catégorie.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default InventoryView;
