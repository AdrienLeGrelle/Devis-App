import React, { useState, useEffect } from 'react';
import './FacturantSelector.css';
import { melodixEntreprise } from '../config/melodix';
import EntrepriseSection from './EntrepriseSection';

const FACTURANTS = [
  { id: 'adrien', name: 'Adrien', preset: melodixEntreprise },
  { id: 'martin', name: 'Martin', preset: null },
  { id: 'come', name: 'Côme', preset: null },
];

const EMPTY_ENTREPRISE = {
  nom: '',
  adresse: '',
  codePostal: '',
  ville: '',
  telephone: '',
  email: '',
  siret: '',
  codeAPE: '',
  tva: '',
};

const STORAGE_KEY = 'facturantPresets';

function loadPresets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        martin: { ...EMPTY_ENTREPRISE, ...parsed.martin },
        come: { ...EMPTY_ENTREPRISE, ...parsed.come },
      };
    }
  } catch (e) {}
  return { martin: { ...EMPTY_ENTREPRISE }, come: { ...EMPTY_ENTREPRISE } };
}

function savePresets(presets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function FacturantSelector({ value, onChange, onEntrepriseFill }) {
  const [presets, setPresets] = useState(loadPresets);
  const [configTarget, setConfigTarget] = useState(null);
  const [configData, setConfigData] = useState({ ...EMPTY_ENTREPRISE });

  useEffect(() => {
    savePresets(presets);
  }, [presets]);

  const getEntrepriseFor = (id) => {
    if (id === 'adrien') return melodixEntreprise;
    return presets[id] || { ...EMPTY_ENTREPRISE };
  };

  const handleSelect = (id) => {
    onChange(id);
    onEntrepriseFill(getEntrepriseFor(id));
  };

  const openConfig = (id) => {
    setConfigTarget(id);
    setConfigData({ ...EMPTY_ENTREPRISE, ...presets[id] });
  };

  const saveConfig = () => {
    if (!configTarget) return;
    setPresets((prev) => ({
      ...prev,
      [configTarget]: { ...configData },
    }));
    setConfigTarget(null);
    if (value === configTarget) {
      onEntrepriseFill(configData);
    }
  };

  return (
    <div className="facturant-selector">
      <span className="facturant-label">Facturant</span>
      <div className="facturant-buttons">
        {FACTURANTS.map((f) => (
          <div key={f.id} className="facturant-option">
            <button
              type="button"
              className={`facturant-btn ${value === f.id ? 'active' : ''}`}
              onClick={() => handleSelect(f.id)}
            >
              {f.name}
            </button>
            {f.id !== 'adrien' && (
              <button
                type="button"
                className="facturant-config-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  openConfig(f.id);
                }}
                title={`Configurer ${f.name}`}
              >
                +
              </button>
            )}
          </div>
        ))}
      </div>

      {configTarget && (
        <div className="facturant-config-overlay" onClick={() => setConfigTarget(null)}>
          <div className="facturant-config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="facturant-config-header">
              <h3>Configurer {FACTURANTS.find((f) => f.id === configTarget)?.name}</h3>
              <button type="button" className="btn-close" onClick={() => setConfigTarget(null)}>
                ✕
              </button>
            </div>
            <div className="facturant-config-body">
              <EntrepriseSection
                entreprise={configData}
                onChange={(field, val) => setConfigData((prev) => ({ ...prev, [field]: val }))}
              />
            </div>
            <div className="facturant-config-actions">
              <button type="button" className="btn-secondary" onClick={() => setConfigTarget(null)}>
                Annuler
              </button>
              <button type="button" className="btn-primary" onClick={saveConfig}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FacturantSelector;
