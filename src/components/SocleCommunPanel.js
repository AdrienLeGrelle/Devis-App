import React, { useState } from 'react';
import './SocleCommunPanel.css';
import { FORMULES, CATEGORIES } from '../utils/stockCommunAnnexe';

function SocleCommunPanel({
  stockAnnexe = {},
  onStockAnnexeChange,
}) {
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingFormule, setEditingFormule] = useState(null);
  const [newItemFormule, setNewItemFormule] = useState(null);
  const [newItemData, setNewItemData] = useState({ label: '', qty: 1, category: 'SON' });

  // Organiser les items par catégorie pour chaque formule
  const getItemsByCategory = (formule) => {
    const items = stockAnnexe[formule] || [];
    const byCategory = {};
    CATEGORIES.forEach(cat => {
      byCategory[cat] = items.filter(item => item.category === cat);
    });
    return byCategory;
  };

  const handleQuantityChange = (formule, itemId, newQty) => {
    const qty = Math.max(1, Number(newQty) || 1);
    const items = stockAnnexe[formule] || [];
    const updated = items.map(item =>
      item.id === itemId ? { ...item, qty } : item
    );
    onStockAnnexeChange({
      ...stockAnnexe,
      [formule]: updated,
    });
  };

  const handleLabelChange = (formule, itemId, newLabel) => {
    const items = stockAnnexe[formule] || [];
    const updated = items.map(item =>
      item.id === itemId ? { ...item, label: newLabel } : item
    );
    onStockAnnexeChange({
      ...stockAnnexe,
      [formule]: updated,
    });
  };

  const handleRemoveItem = (formule, itemId) => {
    const items = stockAnnexe[formule] || [];
    const updated = items.filter(item => item.id !== itemId);
    onStockAnnexeChange({
      ...stockAnnexe,
      [formule]: updated,
    });
  };

  const handleAddItem = (formule) => {
    if (!newItemData.label.trim()) return;
    
    const items = stockAnnexe[formule] || [];
    const newItem = {
      id: `annexe-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      label: newItemData.label.trim(),
      qty: Math.max(1, Number(newItemData.qty) || 1),
      category: newItemData.category,
    };
    
    onStockAnnexeChange({
      ...stockAnnexe,
      [formule]: [...items, newItem],
    });
    
    setNewItemData({ label: '', qty: 1, category: 'SON' });
    setNewItemFormule(null);
  };

  return (
    <div className="socle-commun-panel">
      <div className="socle-formules">
        {FORMULES.map((formule) => {
          const itemsByCategory = getItemsByCategory(formule);
          const totalItems = stockAnnexe[formule]?.length || 0;
          
          return (
            <div key={formule} className="formule-card">
              <div className="formule-header">
                <h4>{formule}</h4>
                <button
                  type="button"
                  className="btn-add-item-formule"
                  onClick={() => setNewItemFormule(newItemFormule === formule ? null : formule)}
                  title="Ajouter un item"
                >
                  + Ajouter
                </button>
              </div>
              
              {newItemFormule === formule && (
                <div className="new-item-form">
                  <input
                    type="text"
                    placeholder="Nom du matériel"
                    value={newItemData.label}
                    onChange={(e) => setNewItemData({ ...newItemData, label: e.target.value })}
                    className="new-item-input"
                  />
                  <select
                    value={newItemData.category}
                    onChange={(e) => setNewItemData({ ...newItemData, category: e.target.value })}
                    className="new-item-select"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    placeholder="Qté"
                    value={newItemData.qty}
                    onChange={(e) => setNewItemData({ ...newItemData, qty: e.target.value })}
                    className="new-item-qty"
                  />
                  <button
                    type="button"
                    className="btn-confirm-add"
                    onClick={() => handleAddItem(formule)}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    className="btn-cancel-add"
                    onClick={() => {
                      setNewItemFormule(null);
                      setNewItemData({ label: '', qty: 1, category: 'SON' });
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
              
              <div className="formule-items">
                {totalItems === 0 ? (
                  <div className="formule-empty">Aucun matériel. Clique sur "+ Ajouter" pour commencer.</div>
                ) : (
                  CATEGORIES.map((category) => {
                    const categoryItems = itemsByCategory[category] || [];
                    if (categoryItems.length === 0) return null;
                    
                    return (
                      <div key={category} className="formule-category-group">
                        <div className="category-title">{category}</div>
                        <table className="category-table">
                          <thead>
                            <tr>
                              <th className="col-material">Matériel</th>
                              <th className="col-qty">Qté</th>
                              <th className="col-actions"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {categoryItems.map((item) => {
                              const isEditing = editingItemId === item.id && editingFormule === formule;
                              
                              return (
                                <tr key={item.id} className={isEditing ? 'editing' : ''}>
                                  <td className="col-material">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        className="item-label-input"
                                        value={item.label}
                                        onChange={(e) => handleLabelChange(formule, item.id, e.target.value)}
                                        onBlur={() => {
                                          setEditingItemId(null);
                                          setEditingFormule(null);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === 'Escape') {
                                            setEditingItemId(null);
                                            setEditingFormule(null);
                                          }
                                        }}
                                        autoFocus
                                      />
                                    ) : (
                                      <span
                                        className="item-label"
                                        onClick={() => {
                                          setEditingItemId(item.id);
                                          setEditingFormule(formule);
                                        }}
                                        title="Cliquer pour éditer"
                                      >
                                        {item.label}
                                      </span>
                                    )}
                                  </td>
                                  <td className="col-qty">
                                    <input
                                      type="number"
                                      min="1"
                                      className="item-qty-input"
                                      value={item.qty}
                                      onChange={(e) => handleQuantityChange(formule, item.id, e.target.value)}
                                      onFocus={(e) => e.target.select()}
                                    />
                                  </td>
                                  <td className="col-actions">
                                    <button
                                      type="button"
                                      className="btn-remove-item"
                                      onClick={() => handleRemoveItem(formule, item.id)}
                                      title="Supprimer"
                                    >
                                      ×
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SocleCommunPanel;
