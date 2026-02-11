import React, { useState } from 'react';
import './FormulasModal.css';

const DEFAULT_BREAKDOWN = [
  { id: `bd-${Date.now()}-1`, label: 'Prestation DJ', amountTTC: 0 },
  { id: `bd-${Date.now()}-2`, label: 'Matériel (son + lumière)', amountTTC: 0 },
];

function FormulasModal({ formulas, onSave, onDelete, onClose }) {
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ label: '', prixTTC: '', description: '', breakdown: [] });
  const [error, setError] = useState('');

  const resetForm = () => {
    setFormData({ label: '', prixTTC: '', description: '', breakdown: [] });
    setEditingId(null);
    setIsAdding(false);
    setError('');
  };

  const startEdit = (formula) => {
    setEditingId(formula.id);
    setFormData({
      label: formula.label || '',
      prixTTC: formula.prixTTC?.toString() || '',
      description: formula.description || '',
      breakdown: formula.breakdown?.length > 0
        ? formula.breakdown.map((b) => ({ ...b }))
        : DEFAULT_BREAKDOWN.map((b) => ({ ...b, id: `bd-${Date.now()}-${Math.random()}` })),
    });
    setIsAdding(false);
    setError('');
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    const now = Date.now();
    setFormData({
      label: '',
      prixTTC: '',
      description: '',
      breakdown: [
        { id: `bd-${now}-1`, label: 'Prestation DJ', amountTTC: 0 },
        { id: `bd-${now}-2`, label: 'Matériel (son + lumière)', amountTTC: 0 },
      ],
    });
    setError('');
  };

  const validate = () => {
    if (!formData.label.trim()) {
      setError('Le nom est requis');
      return false;
    }
    const price = parseFloat(formData.prixTTC);
    if (isNaN(price) || price < 0) {
      setError('Le prix doit être un nombre >= 0');
      return false;
    }
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const price = parseFloat(formData.prixTTC);
    const breakdown = formData.breakdown.map((b) => ({
      id: b.id,
      label: b.label.trim(),
      amountTTC: parseFloat(b.amountTTC) || 0,
    }));

    if (isAdding) {
      const newFormula = {
        id: `formula-${Date.now()}`,
        label: formData.label.trim(),
        prixTTC: price,
        description: formData.description.trim() || '',
        isActive: true,
        breakdown,
      };
      onSave(newFormula);
    } else if (editingId) {
      const updated = {
        id: editingId,
        label: formData.label.trim(),
        prixTTC: price,
        description: formData.description.trim() || '',
        isActive: true,
        breakdown,
      };
      onSave(updated);
    }
    resetForm();
  };

  const handleDelete = (formula) => {
    if (window.confirm(`Supprimer la formule « ${formula.label} » ?`)) {
      const result = onDelete(formula.id);
      if (result?.error) {
        alert(result.error);
      }
    }
  };

  // Breakdown management
  const addBreakdownLine = () => {
    setFormData({
      ...formData,
      breakdown: [
        ...formData.breakdown,
        { id: `bd-${Date.now()}`, label: '', amountTTC: 0 },
      ],
    });
  };

  const removeBreakdownLine = (id) => {
    setFormData({
      ...formData,
      breakdown: formData.breakdown.filter((b) => b.id !== id),
    });
  };

  const updateBreakdownLine = (id, field, value) => {
    setFormData({
      ...formData,
      breakdown: formData.breakdown.map((b) =>
        b.id === id ? { ...b, [field]: value } : b
      ),
    });
  };

  const totalBreakdown = formData.breakdown.reduce(
    (sum, b) => sum + (parseFloat(b.amountTTC) || 0),
    0
  );
  const prixFormule = parseFloat(formData.prixTTC) || 0;
  const mismatch = Math.abs(totalBreakdown - prixFormule) > 0.01 && formData.breakdown.length > 0;

  const renderBreakdownEditor = () => (
    <div className="breakdown-section">
      <h5>Composition de la formule</h5>
      <div className="breakdown-lines">
        {formData.breakdown.map((b, idx) => (
          <div key={b.id} className="breakdown-line">
            <input
              type="text"
              placeholder="Libellé du poste"
              value={b.label}
              onChange={(e) => updateBreakdownLine(b.id, 'label', e.target.value)}
            />
            <input
              type="number"
              placeholder="Montant TTC"
              value={b.amountTTC}
              onChange={(e) => updateBreakdownLine(b.id, 'amountTTC', e.target.value)}
              min="0"
              step="0.01"
            />
            <button
              type="button"
              className="btn-remove-line"
              onClick={() => removeBreakdownLine(b.id)}
              title="Supprimer ce poste"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn-add-line" onClick={addBreakdownLine}>
        + Ajouter un poste
      </button>
      <div className="breakdown-totals">
        <div className="breakdown-total-row">
          <span>Total composition :</span>
          <span className={mismatch ? 'mismatch' : ''}>{totalBreakdown.toFixed(2)} €</span>
        </div>
        <div className="breakdown-total-row">
          <span>Prix formule :</span>
          <span>{prixFormule.toFixed(2)} €</span>
        </div>
        {mismatch && (
          <p className="breakdown-warning">
            ⚠️ Le total de la composition ne correspond pas au prix de la formule
          </p>
        )}
      </div>
    </div>
  );

  const renderEditForm = (isNew = false) => (
    <form className={isNew ? 'formula-add-form' : 'formula-edit-form'} onSubmit={handleSubmit}>
      {isNew && <h4>Nouvelle formule</h4>}
      <div className="form-row">
        <input
          type="text"
          placeholder="Nom de la formule"
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          autoFocus
        />
        <input
          type="number"
          placeholder="Prix TTC (€)"
          value={formData.prixTTC}
          onChange={(e) => setFormData({ ...formData, prixTTC: e.target.value })}
          min="0"
          step="0.01"
        />
      </div>
      <input
        type="text"
        placeholder="Description (optionnel)"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        className="desc-input"
      />
      {renderBreakdownEditor()}
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn-cancel" onClick={resetForm}>Annuler</button>
        <button type="submit" className="btn-save">{isNew ? 'Ajouter' : 'Enregistrer'}</button>
      </div>
    </form>
  );

  return (
    <div className="formulas-modal-overlay" onClick={onClose}>
      <div className="formulas-modal" onClick={(e) => e.stopPropagation()}>
        <div className="formulas-modal-header">
          <h3>⚙️ Gérer les formules</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="formulas-modal-body">
          <div className="formulas-list">
            {formulas.length === 0 && (
              <p className="empty-msg">Aucune formule configurée.</p>
            )}
            {formulas.map((f) => (
              <div key={f.id} className={`formula-row ${editingId === f.id ? 'editing' : ''}`}>
                {editingId === f.id ? (
                  renderEditForm(false)
                ) : (
                  <>
                    <div className="formula-info">
                      <span className="formula-label">{f.label}</span>
                      <span className="formula-price">{f.prixTTC.toFixed(2)} € TTC</span>
                      {f.description && <span className="formula-desc">{f.description}</span>}
                      {f.breakdown?.length > 0 && (
                        <span className="formula-breakdown-preview">
                          {f.breakdown.map((b) => b.label).join(' • ')}
                        </span>
                      )}
                    </div>
                    <div className="formula-actions">
                      <button
                        type="button"
                        className="btn-icon-sm"
                        onClick={() => startEdit(f)}
                        title="Modifier"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="btn-icon-sm btn-delete"
                        onClick={() => handleDelete(f)}
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {isAdding && renderEditForm(true)}

          {!isAdding && !editingId && (
            <button type="button" className="btn-add-formula" onClick={startAdd}>
              + Ajouter une formule
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default FormulasModal;
