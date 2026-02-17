import React, { useMemo, useState, useEffect } from 'react';
import './PrestationsBoard.css';
import SetAssignmentPanel from './SetAssignmentPanel';
import { getAssignmentsForDate, getSetNamesForDate, SET_ZONES } from '../utils/inventoryAssignments';
import { sortPrestationsByDate, formatDateFR } from '../utils/prestationsUtils';

export const columns = [
  { id: 'devis_non_envoye', title: 'Devis non envoyé', color: '#c8ccd6' },
  { id: 'devis_envoye', title: 'Devis envoyé', color: '#d6b4ce' },
  { id: 'marche_conclu', title: 'Marché conclu', color: '#f1c7a0' },
  { id: 'fini', title: 'Fini', color: '#cde7d8' },
  { id: 'perdue', title: 'Perdue', color: '#d8d8d8' },
];

const TYPE_OPTIONS = [
  'Location',
  'Gala',
  'Anniversaire',
  'Mariage',
  'Rallye 1',
  'Rallye entier',
  'Soirée',
];

// Les colonnes = source de vérité des statuts (statut = column.id)
const ORIGINE_OPTIONS = ['Adrien', 'Côme', 'Martin', 'Melodix'];
const RESPONSABLE_OPTIONS = ['Adrien', 'Côme', 'Martin'];
const COMM_OPTIONS = ['Autre', 'WhatsApp', 'Insta', 'Message', 'Mail', 'Messenger', 'messages'];

function PrestationsBoard({ prestations, onChange, inventory, onInventoryChange, onPreparePrestation }) {
  const [formData, setFormData] = useState(null);
  const [mode, setMode] = useState('create'); // 'create' | 'edit'
  const [editorTab, setEditorTab] = useState('infos'); // 'infos' | 'materiel'
  const [materialDragId, setMaterialDragId] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [hoverColumn, setHoverColumn] = useState(null);

  const grouped = useMemo(
    () =>
      columns.map((col) => {
        const filtered = prestations.filter((p) => p.statut === col.id);
        const sortOrder = col.id === 'marche_conclu' || col.id === 'devis_envoye' ? 'asc' : 'desc';
        return { ...col, items: sortPrestationsByDate(filtered, sortOrder) };
      }),
    [prestations]
  );

  const totalsByColumn = useMemo(
    () =>
      grouped.map((col) => ({
        ...col,
        total: col.items.reduce((sum, item) => sum + (item.montant || 0), 0),
      })),
    [grouped]
  );

  const startCreate = (defaultStatut) => {
    setMode('create');
    const initialStatut = defaultStatut || columns[0].id;
    setFormData({
      id: `p-${Date.now()}`,
      nom: '',
      type: '',
      montant: 0,
      date: '',
      statut: initialStatut,
      note: '',
      setId: null,
      prepChecklist: [],
      horaire: '',
      lieu: '',
      origineContrat: '',
      relationsGerePar: '',
      moyenCommunication: '',
      responsable: '',
      taille: '',
    });
  };

  const startEdit = (item) => {
    setMode('edit');
    setEditorTab('infos');
    setFormData({ ...item });
  };

  // Sync formData.statut si la prestation est mise à jour par drag-drop pendant que le form est ouvert
  useEffect(() => {
    if (!formData || mode !== 'edit') return;
    const updated = prestations.find((p) => p.id === formData.id);
    if (updated && updated.statut !== formData.statut) {
      setFormData((prev) => (prev ? { ...prev, statut: updated.statut } : null));
    }
  }, [prestations]);

  const closeForm = () => {
    setFormData(null);
  };

  const saveForm = (e) => {
    e.preventDefault();
    if (!formData.nom?.trim()) return;

    if (mode === 'edit') {
      onChange(
        prestations.map((p) => (p.id === formData.id ? { ...formData, montant: Number(formData.montant) || 0 } : p))
      );
    } else {
      onChange([
        ...prestations,
        {
          ...formData,
          montant: Number(formData.montant) || 0,
          setId: formData.setId || null,
          prepChecklist: formData.prepChecklist || [],
        },
      ]);
    }
    closeForm();
  };

  const handleDrop = (columnId) => {
    if (!draggedId) return;
    onChange(
      prestations.map((p) => (p.id === draggedId ? { ...p, statut: columnId } : p))
    );
    setDraggedId(null);
    setHoverColumn(null);
  };

  const handleDelete = (item, e) => {
    e.stopPropagation();
    if (window.confirm(`Supprimer la prestation « ${item.nom} » ?`)) {
      onChange(prestations.filter((p) => p.id !== item.id));
    }
  };

  return (
    <div className="prestations-board">
      <div className="board-actions">
        <button className="btn-add" onClick={() => startCreate()}>➕ Nouvelle prestation</button>
      </div>

      {grouped.map((col) => (
        <div
          key={col.id}
          className={`board-column ${hoverColumn === col.id ? 'droppable' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setHoverColumn(col.id);
          }}
          onDragLeave={() => setHoverColumn(null)}
          onDrop={() => handleDrop(col.id)}
        >
          <div className="column-header" style={{ backgroundColor: col.color }}>
            <div className="column-title">{col.title}</div>
            <div className="column-meta">
              <span className="column-count">{col.items.length}</span>
              <span className="column-total">
                {totalsByColumn.find((c) => c.id === col.id)?.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          </div>
          <div className="column-body">
            {col.items.length === 0 && (
              <div className="empty">
                Aucune prestation
                <button type="button" className="btn-add-in-column" onClick={(e) => { e.stopPropagation(); startCreate(col.id); }}>
                  ➕ Ajouter
                </button>
              </div>
            )}
            {col.items.map((item) => (
              <div
                key={item.id}
                className={`card ${draggedId === item.id ? 'dragging' : ''}`}
                draggable
                onDragStart={() => setDraggedId(item.id)}
                onDragEnd={() => {
                  setDraggedId(null);
                  setHoverColumn(null);
                }}
                onClick={() => startEdit(item)}
              >
                <div className="card-title">{item.nom}</div>
                <div className="card-tags">
                  {item.type && <span className="tag">{item.type}</span>}
                  {item.note && <span className="tag soft">{item.note}</span>}
                  {item.setId && <span className="tag assign">Set: {item.setId}</span>}
                </div>
                <div className="card-footer">
                  <span className="date">{formatDateFR(item.date) || 'Date à planifier'}</span>
                  <span className="price">
                    {(item.montant || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-trash"
                  onClick={(e) => handleDelete(item, e)}
                  title="Supprimer"
                >
                  🗑️
                </button>
                <div className="card-actions">
                  <button
                    className="btn-ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreparePrestation?.(item);
                    }}
                  >
                    Préparer
                  </button>
                </div>
                </div>
              ))}
            {col.items.length > 0 && (
              <button type="button" className="btn-add-in-column" onClick={(e) => { e.stopPropagation(); startCreate(col.id); }}>
                ➕ Ajouter
              </button>
            )}
          </div>
        </div>
      ))}

      {formData && (
        <div className="editor-overlay" onClick={closeForm}>
          <div className="editor editor-with-tabs" onClick={(e) => e.stopPropagation()}>
            <div className="editor-header">
              <h3>{mode === 'edit' ? 'Modifier la prestation' : 'Nouvelle prestation'}</h3>
              <button className="btn-close" onClick={closeForm}>✕</button>
            </div>
            <div className="editor-tabs">
              <button
                type="button"
                className={editorTab === 'infos' ? 'active' : ''}
                onClick={() => setEditorTab('infos')}
              >
                Infos
              </button>
              <button
                type="button"
                className={editorTab === 'materiel' ? 'active' : ''}
                onClick={() => setEditorTab('materiel')}
              >
                Matériel
              </button>
            </div>
            {editorTab === 'infos' ? (
            <form className="editor-form" onSubmit={saveForm}>
              <div className="editor-form-fields">
                <label className="editor-field">
                  <span className="editor-label">Nom</span>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                    placeholder="Nom du client ou de la prestation"
                  />
                </label>
                <label className="editor-field">
                  <span className="editor-label"><span className="editor-icon">🗓</span> Date</span>
                  <input
                    type="date"
                    value={formData.date || ''}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </label>
                <label className="editor-field">
                  <span className="editor-label"><span className="editor-icon">🎧</span> Prestation</span>
                  <select
                    value={formData.type || ''}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="">— Sélectionner —</option>
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                    {formData.type && !TYPE_OPTIONS.includes(formData.type) && (
                      <option value={formData.type}>{formData.type}</option>
                    )}
                  </select>
                </label>
                <label className="editor-field">
                  <span className="editor-label"><span className="editor-icon">📌</span> Status</span>
                  <select
                    value={formData.statut || columns[0].id}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                  >
                    {columns.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </label>
                <label className="editor-field">
                  <span className="editor-label"><span className="editor-icon">≡</span> horaire</span>
                  <input
                    type="text"
                    value={formData.horaire || ''}
                    onChange={(e) => setFormData({ ...formData, horaire: e.target.value })}
                    placeholder="Ex : 20h00 → 5h00"
                  />
                </label>
                <label className="editor-field">
                  <span className="editor-label"><span className="editor-icon">📍</span> Lieux</span>
                  <input
                    type="text"
                    value={formData.lieu || ''}
                    onChange={(e) => setFormData({ ...formData, lieu: e.target.value })}
                    placeholder="Ex : La Roche Thévenin, 85 600 Montaigu"
                  />
                </label>
                <label className="editor-field">
                  <span className="editor-label"><span className="editor-icon">#</span> Tarifs</span>
                  <input
                    type="number"
                    value={formData.montant}
                    onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                    min="0"
                    step="50"
                  />
                </label>
                <label className="editor-field">
                  <span className="editor-label"><span className="editor-icon">🔗</span> Origine du contrat</span>
                  <select
                    value={formData.origineContrat || ''}
                    onChange={(e) => setFormData({ ...formData, origineContrat: e.target.value })}
                  >
                    <option value="">— Sélectionner —</option>
                    {ORIGINE_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </label>
                <label className="editor-field">
                  <span className="editor-label"><span className="editor-icon">▦</span> Relations géré par</span>
                  <select
                    value={formData.relationsGerePar || ''}
                    onChange={(e) => setFormData({ ...formData, relationsGerePar: e.target.value })}
                  >
                    <option value="">— Sélectionner —</option>
                    {RESPONSABLE_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </label>
                <label className="editor-field">
                  <span className="editor-label"><span className="editor-icon">💬</span> Moyen de comm.</span>
                  <select
                    value={formData.moyenCommunication || ''}
                    onChange={(e) => setFormData({ ...formData, moyenCommunication: e.target.value })}
                  >
                    <option value="">— Sélectionner —</option>
                    {COMM_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </label>
                <label className="editor-field">
                  <span className="editor-label"><span className="editor-icon">👤</span> Respo et accom.</span>
                  <select
                    value={formData.responsable || ''}
                    onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                  >
                    <option value="">— Sélectionner —</option>
                    {RESPONSABLE_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </label>
                <label className="editor-field">
                  <span className="editor-label"><span className="editor-icon">📦</span> Taille</span>
                  <input
                    type="text"
                    value={formData.taille || ''}
                    onChange={(e) => setFormData({ ...formData, taille: e.target.value })}
                    placeholder="Ex : 150, 300 dîner..."
                  />
                </label>

                <label className="editor-field editor-field-note">
                  <span className="editor-label editor-label-note">Note</span>
                  <textarea
                    value={formData.note || ''}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    rows={2}
                    placeholder=""
                    className="editor-note-textarea"
                  />
                </label>
              </div>

              <div className="editor-actions">
                <button type="button" className="btn-secondary" onClick={closeForm}>Annuler</button>
                <button type="submit" className="btn-primary">{mode === 'edit' ? 'Enregistrer' : 'Créer'}</button>
              </div>
            </form>
            ) : (
            <div className="editor-materiel-tab">
              <p className="materiel-tab-info">
                Configuration des sets pour le {formatDateFR(formData.date) || '—'} (date de la prestation).
                Les modifications sont enregistrées dans l'inventaire.
              </p>
              {formData.date ? (
                onInventoryChange && (
                  <SetAssignmentPanel
                    items={inventory?.items || []}
                    assignmentsForDate={getAssignmentsForDate(inventory, formData.date)}
                    onAssignmentsChange={(updated) => {
                      const byDate = { ...(inventory?.assignmentsByDate || {}) };
                      byDate[formData.date] = updated;
                      onInventoryChange({ ...inventory, assignmentsByDate: byDate });
                    }}
                    dragItemId={materialDragId}
                    setDragItemId={setMaterialDragId}
                    compact
                    setNamesForDate={getSetNamesForDate(inventory, formData.date)}
                    onSetNameChange={(setId, name) => {
                      const byDate = { ...(inventory?.setNamesByDate || {}) };
                      byDate[formData.date] = { ...(byDate[formData.date] || {}), [setId]: name };
                      onInventoryChange({ ...inventory, setNamesByDate: byDate });
                    }}
                    defectNotes={inventory?.defectNotes || {}}
                    formulePresets={inventory?.formulePresets || {}}
                    onApplyFormule={(setId, presetId) => {
                      const preset = inventory?.formulePresets?.[presetId];
                      if (!preset?.itemIds?.length) return;
                      const itemsList = inventory?.items || [];
                      const itemMap = new Map(itemsList.map((i) => [i.id, i]));
                      const assignmentsForDate = getAssignmentsForDate(inventory, formData.date);
                      const updated = { ...assignmentsForDate };
                      Object.keys(updated).forEach((itemId) => {
                        const tags = updated[itemId] || [];
                        if (tags.some((t) => String(t).startsWith(`${setId}:`))) {
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
                      const byDate = { ...(inventory?.assignmentsByDate || {}) };
                      byDate[formData.date] = updated;
                      onInventoryChange({ ...inventory, assignmentsByDate: byDate });
                    }}
                  />
                )
              ) : (
                <p className="materiel-tab-no-date">Renseigne la date de la prestation pour configurer le matériel.</p>
              )}
            </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default PrestationsBoard;

