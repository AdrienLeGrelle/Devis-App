import React, { useMemo, useState } from 'react';
import './PrestationsBoard.css';
import SetAssignmentPanel from './SetAssignmentPanel';
import { getAssignmentsForDate, getSetNamesForDate, SET_ZONES } from '../utils/inventoryAssignments';

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

const STATUS_SUGGESTIONS = ['À faire', 'Confirmé', 'Terminé', 'Annulé'];
const ORIGINE_OPTIONS = ['Adrien', 'Côme', 'Martin', 'Melodix'];
const RESPONSABLE_OPTIONS = ['Adrien', 'Côme', 'Martin'];
const COMM_OPTIONS = ['Autre', 'WhatsApp', 'Insta', 'Message', 'Mail', 'Messenger', 'messages'];
const FORMULE_CHOICES = ['Formule excellence', 'Formule premium', 'Formule classique'];

function PrestationsBoard({ prestations, onChange, inventory, onInventoryChange, onPreparePrestation }) {
  const [formData, setFormData] = useState(null);
  const [mode, setMode] = useState('create'); // 'create' | 'edit'
  const [editorTab, setEditorTab] = useState('infos'); // 'infos' | 'materiel'
  const [materialDragId, setMaterialDragId] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [hoverColumn, setHoverColumn] = useState(null);

  const grouped = useMemo(
    () =>
      columns.map((col) => ({
        ...col,
        items: prestations.filter((p) => p.statut === col.id),
      })),
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

  const startCreate = () => {
    setMode('create');
    setFormData({
      id: `p-${Date.now()}`,
      nom: '',
      type: '',
      montant: 0,
      date: '',
      statut: columns[0].id,
      note: '',
      setId: null,
      prepChecklist: [],
      // Champs détaillés façon fiche Notion, alignés sur ta liste
      status: '',
      horaire: '',
      lieu: '',
      origineContrat: '',
      responsable: '',
      moyenCommunication: '',
      taille: '',
      devisRef: '',
      formuleCatalogue: '',
      formuleChoix: '',
      materielUtilise: '',
    });
  };

  const startEdit = (item) => {
    setMode('edit');
    setEditorTab('infos');
    setFormData({ ...item });
  };

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
        <button className="btn-add" onClick={startCreate}>➕ Nouvelle prestation</button>
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
              <div className="empty">Aucune prestation</div>
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
                  <span className="date">{item.date || 'Date à planifier'}</span>
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
              <label>
                Nom
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                />
              </label>
              <label>
                🎧 Prestation
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
              <label>
                🗓 Date
                <input
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </label>
              <label>
                📌 Status
                <input
                  type="text"
                  list="status-suggestions"
                  value={formData.status || ''}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  placeholder="Ex : À faire, Confirmé..."
                />
                <datalist id="status-suggestions">
                  {STATUS_SUGGESTIONS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>
              <label>
                💶 Tarifs (€)
                <input
                  type="number"
                  value={formData.montant}
                  onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                  min="0"
                  step="50"
                />
              </label>

              <label>
                Note (résumé)
                <textarea
                  value={formData.note || ''}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={2}
                />
              </label>

              {/* Détails avancés façon fiche Isaure */}
              <div className="editor-subsection-title">Détails de la prestation</div>
              <label>
                ⏰ Horaire
                <input
                  type="text"
                  value={formData.horaire || ''}
                  onChange={(e) => setFormData({ ...formData, horaire: e.target.value })}
                  placeholder="Ex : 20h00 → 5h00"
                />
              </label>
              <label>
                📍 Lieux
                <input
                  type="text"
                  value={formData.lieu || ''}
                  onChange={(e) => setFormData({ ...formData, lieu: e.target.value })}
                  placeholder="Ex : La Roche Thévenin, 85 600 Montaigu"
                />
              </label>
              <label>
                🔗 Origine du contrat
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
              <label>
                👤 Responsable
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
              <label>
                💬 Moyen de communication
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
              <label>
                📦 Taille
                <input
                  type="text"
                  value={formData.taille || ''}
                  onChange={(e) => setFormData({ ...formData, taille: e.target.value })}
                  placeholder="Ex : 150, 300 dîner..."
                />
              </label>
              <label>
                📎 Devis (lien ou référence)
                <input
                  type="text"
                  value={formData.devisRef || ''}
                  onChange={(e) => setFormData({ ...formData, devisRef: e.target.value })}
                  placeholder="URL ou nom de fichier"
                />
              </label>
              <label>
                🎼 Formule (catalogue)
                <input
                  type="text"
                  value={formData.formuleCatalogue || ''}
                  onChange={(e) => setFormData({ ...formData, formuleCatalogue: e.target.value })}
                  placeholder="Ex : Premium, Classique..."
                />
              </label>
              <label>
                ❓ Formule ?
                <select
                  value={formData.formuleChoix || ''}
                  onChange={(e) => setFormData({ ...formData, formuleChoix: e.target.value })}
                >
                  <option value="">— Sélectionner —</option>
                  {FORMULE_CHOICES.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </label>
              <label>
                Matériel utilisé (résumé)
                <input
                  type="text"
                  value={formData.materielUtilise || ''}
                  onChange={(e) => setFormData({ ...formData, materielUtilise: e.target.value })}
                  placeholder="Ex : SET1 + lyres beam + hazer..."
                />
              </label>

              <div className="editor-actions">
                <button type="button" className="btn-secondary" onClick={closeForm}>Annuler</button>
                <button type="submit" className="btn-primary">{mode === 'edit' ? 'Enregistrer' : 'Créer'}</button>
              </div>
            </form>
            ) : (
            <div className="editor-materiel-tab">
              <p className="materiel-tab-info">
                Configuration des sets pour le {formData.date || '—'} (date de la prestation).
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

