import React from 'react';

function EntrepriseSection({ entreprise, onChange }) {
  return (
    <div>
      <div className="form-group">
        <label>Nom de l'entreprise *</label>
        <input
          type="text"
          value={entreprise.nom}
          onChange={(e) => onChange('nom', e.target.value)}
          placeholder="Mon Entreprise SARL"
          required
        />
      </div>
      <div className="form-group">
        <label>Adresse *</label>
        <input
          type="text"
          value={entreprise.adresse}
          onChange={(e) => onChange('adresse', e.target.value)}
          placeholder="123 Rue Example"
          required
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Code postal *</label>
          <input
            type="text"
            value={entreprise.codePostal}
            onChange={(e) => onChange('codePostal', e.target.value)}
            placeholder="75001"
            required
          />
        </div>
        <div className="form-group">
          <label>Ville *</label>
          <input
            type="text"
            value={entreprise.ville}
            onChange={(e) => onChange('ville', e.target.value)}
            placeholder="Paris"
            required
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Téléphone</label>
          <input
            type="tel"
            value={entreprise.telephone}
            onChange={(e) => onChange('telephone', e.target.value)}
            placeholder="01 23 45 67 89"
          />
        </div>
        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            value={entreprise.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="contact@entreprise.fr"
            required
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>SIRET</label>
          <input
            type="text"
            value={entreprise.siret}
            onChange={(e) => onChange('siret', e.target.value)}
            placeholder="123 456 789 00012"
          />
        </div>
        <div className="form-group">
          <label>Code APE</label>
          <input
            type="text"
            value={entreprise.codeAPE}
            onChange={(e) => onChange('codeAPE', e.target.value)}
            placeholder="9329Z"
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>N° TVA</label>
          <input
            type="text"
            value={entreprise.tva}
            onChange={(e) => onChange('tva', e.target.value)}
            placeholder="FR12 345678901"
          />
        </div>
      </div>
    </div>
  );
}

export default EntrepriseSection;


