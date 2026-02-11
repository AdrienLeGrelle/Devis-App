import React, { useState } from 'react';
import './DevisForm.css';
import EntrepriseSection from './EntrepriseSection';
import ClientSection from './ClientSection';
import FacturantSelector from './FacturantSelector';
import DevisInfoSection, { formatNumeroFromDate } from './DevisInfoSection';
import FormulasModal from './FormulasModal';
import OptionsModal from './OptionsModal';
import PricePerKmModal from './PricePerKmModal';
import {
  melodixEntreprise,
  melodixNotes,
  melodixConditions,
} from '../config/melodix';

const PRENOMS = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Thomas', 'Camille', 'Lucas', 'Emma', 'Hugo', 'Léa', 'Louis', 'Chloé', 'Arthur', 'Manon', 'Jules', 'Julie'];
const NOMS = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Petit', 'Richard', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Michel', 'Garcia', 'David', 'Roux'];
const RUES = ['rue de la Paix', 'avenue des Champs', 'boulevard Victor Hugo', 'place de la République', 'rue du Commerce', 'avenue Jean Jaurès', 'impasse des Lilas', 'allée des Roses', 'chemin des Vignes', 'rue de la Gare'];
const VILLES = [
  { cp: '75001', ville: 'Paris' }, { cp: '69001', ville: 'Lyon' }, { cp: '33000', ville: 'Bordeaux' },
  { cp: '31000', ville: 'Toulouse' }, { cp: '59000', ville: 'Lille' }, { cp: '13001', ville: 'Marseille' },
  { cp: '78000', ville: 'Versailles' }, { cp: '92100', ville: 'Boulogne' }, { cp: '69003', ville: 'Lyon 3e' },
];
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateRandomClient() {
  const prenom = pick(PRENOMS);
  const nom = pick(NOMS);
  const num = Math.floor(Math.random() * 150) + 5;
  const { cp, ville } = pick(VILLES);
  const tel = `0${4 + Math.floor(Math.random() * 6)} ${String(10000000 + Math.floor(Math.random() * 90000000)).replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4')}`;
  const email = `${prenom.toLowerCase()}.${nom.toLowerCase()}@${pick(['gmail.com', 'orange.fr', 'wanadoo.fr', 'free.fr'])}`;
  return {
    prenom,
    nom: `${nom} ${pick(['', '', 'SARL', 'EURL', 'SAS'])}`.trim(),
    adresse: `${num} ${pick(RUES)}`,
    codePostal: cp,
    ville,
    telephone: tel,
    email,
  };
}

function DevisForm({ devisData, onChange, inventory, facturant, onFacturantChange, onEntrepriseFill, formulas, onSaveFormula, onDeleteFormula, options, onSaveOption, onDeleteOption, pricePerKm, onSavePricePerKm }) {
  const [showFormulasModal, setShowFormulasModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showPriceKmModal, setShowPriceKmModal] = useState(false);

  // Formatage du prix au km en format FR (virgule)
  const formatPricePerKmFR = (value) => {
    return value.toFixed(2).replace('.', ',');
  };

  // Liste des IDs d'options actuellement utilisées dans le devis
  const usedOptionIds = (devisData.optionsChoisies || []).map((o) => o.id);

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

  const fillTestData = () => {
    const client = generateRandomClient();
    const newData = {
      ...devisData,
      client: { ...devisData.client, ...client },
      notes: devisData.notes || melodixNotes,
      conditions: devisData.conditions || melodixConditions,
    };
    if (!devisData.formuleChoisie && formulas?.[0]) {
      newData.formuleChoisie = { ...formulas[0] };
    }
    onChange(newData);
  };

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
          <div className="form-section-header">
            <h2>👤 Client</h2>
            <button type="button" className="btn-fill-test" onClick={fillTestData} title="Remplir avec des données aléatoires">
              🎲 Données test
            </button>
          </div>
          <ClientSection
            client={devisData.client}
            onChange={(field, value) => updateField('client', field, value)}
          />
        </div>

        <div className="form-section full-width">
          <div className="form-section-header">
            <h2>🎧 Formule choisie</h2>
            <button
              type="button"
              className="btn-manage-formulas"
              onClick={() => setShowFormulasModal(true)}
              title="Gérer les formules"
            >
              ⚙️
            </button>
          </div>
          <div className="form-group">
            <select
              value={devisData.formuleChoisie?.id || ''}
              onChange={(e) => {
                const id = e.target.value;
                setFormule(id ? formulas.find((f) => f.id === id) || null : null);
              }}
            >
              <option value="">— Choisir une formule —</option>
              {formulas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label} — {f.prixTTC.toFixed(2)} € TTC
                </option>
              ))}
            </select>
          </div>

          {showFormulasModal && (
            <FormulasModal
              formulas={formulas}
              onSave={onSaveFormula}
              onDelete={onDeleteFormula}
              onClose={() => setShowFormulasModal(false)}
            />
          )}
        </div>

        <div className="form-section full-width">
          <div className="form-section-header">
            <h2>➕ Options</h2>
            <button
              type="button"
              className="btn-manage-options"
              onClick={() => setShowOptionsModal(true)}
              title="Gérer les options"
            >
              ⚙️
            </button>
          </div>
          <div className="options-list">
            {options.map((opt) => (
              <label key={opt.id} className="option-checkbox">
                <input
                  type="checkbox"
                  checked={isOptionSelected(opt.id)}
                  onChange={() => toggleOption(opt)}
                />
                <span>{opt.label} — {opt.prixTTC.toFixed(2)} €</span>
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

          {showOptionsModal && (
            <OptionsModal
              options={options}
              onSave={onSaveOption}
              onDelete={onDeleteOption}
              onClose={() => setShowOptionsModal(false)}
              usedOptionIds={usedOptionIds}
            />
          )}
        </div>

        <div className="form-section">
          <div className="form-section-header">
            <h2>🚗 Frais de déplacement</h2>
            <button
              type="button"
              className="btn-manage-price-km"
              onClick={() => setShowPriceKmModal(true)}
              title="Réglages"
            >
              ⚙️
            </button>
          </div>
          <div className="form-group">
            <label>Distance (km) à partir de Versailles</label>
            <input
              type="number"
              value={devisData.kmDeplacement || ''}
              onChange={(e) => updateField(null, 'kmDeplacement', parseInt(e.target.value, 10) || 0)}
              min="0"
              placeholder="0"
            />
            <span className="form-hint">{formatPricePerKmFR(pricePerKm)} € / km</span>
          </div>

          {showPriceKmModal && (
            <PricePerKmModal
              currentPrice={pricePerKm}
              onSave={onSavePricePerKm}
              onClose={() => setShowPriceKmModal(false)}
            />
          )}
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
