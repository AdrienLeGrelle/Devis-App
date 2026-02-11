import React, { useState } from 'react';
import './OptionsModal.css';

function OptionsModal({ options, onSave, onDelete, onClose, usedOptionIds = [] }) {
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ label: '', prixTTC: '', category: '' });
  const [error, setError] = useState('');

  const resetForm = () => {
    setFormData({ label: '', prixTTC: '', category: '' });
    setEditingId(null);
    setIsAdding(false);
    setError('');
  };

  const startEdit = (option) => {
    setEditingId(option.id);
    setFormData({
      label: option.label || '',
      prixTTC: option.prixTTC?.toString() || '',
      category: option.category || '',
    });
    setIsAdding(false);
    setError('');
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({ label: '', prixTTC: '', category: '' });
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
    if (isAdding) {
      const newOption = {
        id: `option-${Date.now()}`,
        label: formData.label.trim().toUpperCase(),
        prixTTC: price,
        category: formData.category.trim() || '',
        isActive: true,
      };
      onSave(newOption);
    } else if (editingId) {
      const updated = {
        id: editingId,
        label: formData.label.trim().toUpperCase(),
        prixTTC: price,
        category: formData.category.trim() || '',
        isActive: true,
      };
      onSave(updated);
    }
    resetForm();
  };

  const handleDelete = (option) => {
    // Vérifier si l'option est utilisée dans un devis en cours
    if (usedOptionIds.includes(option.id)) {
      alert(`Impossible de supprimer « ${option.label} » car elle est utilisée dans le devis en cours.\n\nRetirez d'abord cette option du devis.`);
      return;
    }
    if (window.confirm(`Supprimer l'option « ${option.label} » ?`)) {
      onDelete(option.id);
    }
  };

  return (
    <div className="options-modal-overlay" onClick={onClose}>
      <div className="options-modal" onClick={(e) => e.stopPropagation()}>
        <div className="options-modal-header">
          <h3>⚙️ Gérer les options</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="options-modal-body">
          <div className="options-list-modal">
            {options.length === 0 && (
              <p className="empty-msg">Aucune option configurée.</p>
            )}
            {options.map((opt) => (
              <div key={opt.id} className={`option-row-modal ${editingId === opt.id ? 'editing' : ''}`}>
                {editingId === opt.id ? (
                  <form className="option-edit-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                      <input
                        type="text"
                        placeholder="Nom de l'option"
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
                      placeholder="Catégorie (optionnel)"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="category-input"
                    />
                    {error && <p className="form-error">{error}</p>}
                    <div className="form-actions">
                      <button type="button" className="btn-cancel" onClick={resetForm}>Annuler</button>
                      <button type="submit" className="btn-save">Enregistrer</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="option-info">
                      <span className="option-label-modal">{opt.label}</span>
                      <span className="option-price">{opt.prixTTC.toFixed(2)} € TTC</span>
                      {opt.category && <span className="option-category">{opt.category}</span>}
                    </div>
                    <div className="option-actions-modal">
                      <button
                        type="button"
                        className="btn-icon-sm"
                        onClick={() => startEdit(opt)}
                        title="Modifier"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="btn-icon-sm btn-delete"
                        onClick={() => handleDelete(opt)}
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

          {isAdding && (
            <form className="option-add-form" onSubmit={handleSubmit}>
              <h4>Nouvelle option</h4>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Nom de l'option"
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
                placeholder="Catégorie (optionnel)"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="category-input"
              />
              {error && <p className="form-error">{error}</p>}
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={resetForm}>Annuler</button>
                <button type="submit" className="btn-save">Ajouter</button>
              </div>
            </form>
          )}

          {!isAdding && !editingId && (
            <button type="button" className="btn-add-option" onClick={startAdd}>
              + Ajouter une option
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OptionsModal;
