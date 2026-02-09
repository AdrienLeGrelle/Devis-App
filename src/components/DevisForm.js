import React from 'react';
import './DevisForm.css';
import EntrepriseSection from './EntrepriseSection';
import ClientSection from './ClientSection';
import FacturantSelector from './FacturantSelector';
import DevisInfoSection, { formatNumeroFromDate } from './DevisInfoSection';
import {
  melodixEntreprise,
  melodixFormules,
  melodixOptions,
  melodixNotes,
  melodixConditions,
} from '../config/melodix';

function DevisForm({ devisData, onChange, inventory, facturant, onFacturantChange, onEntrepriseFill }) {
  const updateField = (section, field, value) => {
    const newData = { ...devisData };
    if (section) {
      newData[section] = { ...newData[section], [field]: value };
    } else {
      newData[field] = value;
    }
    onChange(newData);
  };

  const setFormule = (formule) => {
    onChange({
      ...devisData,
      formuleChoisie: formule ? { ...formule } : null,
      notes: melodixNotes,
      conditions: melodixConditions,
    });
  };

  const toggleOption = (option) => {
    const current = devisData.optionsChoisies || [];
    const exists = current.some((o) => o.id === option.id);
    const next = exists
      ? current.filter((o) => o.id !== option.id)
      : [...current, { ...option, quantite: 1 }];
    onChange({ ...devisData, optionsChoisies: next });
  };

  const updateOption = (optionId, field, value) => {
    const next = (devisData.optionsChoisies || []).map((o) => {
      if (o.id !== optionId) return o;
      const v = field === 'quantite' ? (parseInt(value, 10) || 1) : (parseFloat(value) || 0);
      return { ...o, [field]: v };
    });
    onChange({ ...devisData, optionsChoisies: next });
  };

  const isOptionSelected = (optionId) =>
    (devisData.optionsChoisies || []).some((o) => o.id === optionId);

  return (
    <div className="devis-form">
      <div className="form-grid">
        <div className="form-section">
          <h2>📋 Informations du Devis</h2>
          <DevisInfoSection
            devisData={devisData}
            onChange={updateField}
            onDateChange={(dateStr) => onChange({
              ...devisData,
              date: dateStr,
              numero: formatNumeroFromDate(dateStr),
            })}
          />
        </div>

        <div className="form-section">
          <h2>🏢 Votre Entreprise</h2>
          <div className="entreprise-facturant">
            <FacturantSelector
              value={facturant}
              onChange={onFacturantChange}
              onEntrepriseFill={onEntrepriseFill}
            />
          </div>
          <EntrepriseSection
            entreprise={devisData.entreprise}
            onChange={(field, value) => updateField('entreprise', field, value)}
          />
        </div>

        <div className="form-section">
          <h2>👤 Client</h2>
          <ClientSection
            client={devisData.client}
            onChange={(field, value) => updateField('client', field, value)}
          />
        </div>

        <div className="form-section full-width">
          <h2>🎧 Formule choisie</h2>
          <div className="form-group">
            <select
              value={devisData.formuleChoisie?.id || ''}
              onChange={(e) => {
                const id = e.target.value;
                setFormule(id ? melodixFormules.find((f) => f.id === id) || null : null);
              }}
            >
              <option value="">— Choisir une formule —</option>
              {melodixFormules.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label} — {f.prixTTC} € TTC (Set {f.setId})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-section full-width">
          <h2>➕ Options</h2>
          <div className="options-list">
            {melodixOptions.map((opt) => (
              <label key={opt.id} className="option-checkbox">
                <input
                  type="checkbox"
                  checked={isOptionSelected(opt.id)}
                  onChange={() => toggleOption(opt)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
          {(devisData.optionsChoisies || []).length > 0 && (
            <div className="options-selected">
              <h4>Options sélectionnées (prix et quantité modifiables)</h4>
              {(devisData.optionsChoisies || []).map((opt) => (
                <div key={opt.id} className="option-row">
                  <span className="option-label">{opt.label}</span>
                  <div className="option-fields">
                    <label>
                      Qté
                      <input
                        type="number"
                        min="1"
                        value={opt.quantite ?? 1}
                        onChange={(e) => updateOption(opt.id, 'quantite', e.target.value)}
                      />
                    </label>
                    <label>
                      Prix TTC (€)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={opt.prixTTC ?? 0}
                        onChange={(e) => updateOption(opt.id, 'prixTTC', e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-section">
          <h2>🚗 Frais de déplacement</h2>
          <div className="form-group">
            <label>Distance (km) à partir de Versailles</label>
            <input
              type="number"
              value={devisData.kmDeplacement || ''}
              onChange={(e) => updateField(null, 'kmDeplacement', parseInt(e.target.value, 10) || 0)}
              min="0"
              placeholder="0"
            />
            <span className="form-hint">0,60 € / km</span>
          </div>
        </div>

        <div className="form-section full-width">
          <h2>📝 Notes et Conditions</h2>
          <div className="form-group">
            <label>Notes (optionnel)</label>
            <textarea
              value={devisData.notes}
              onChange={(e) => updateField(null, 'notes', e.target.value)}
              rows="3"
              placeholder="Notes additionnelles..."
            />
          </div>
          <div className="form-group">
            <label>Conditions de paiement</label>
            <textarea
              value={devisData.conditions}
              onChange={(e) => updateField(null, 'conditions', e.target.value)}
              rows="3"
              placeholder="Conditions de paiement..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DevisForm;
