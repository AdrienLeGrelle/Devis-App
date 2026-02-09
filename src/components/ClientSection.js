import React from 'react';

function ClientSection({ client, onChange }) {
  return (
    <div>
      <div className="form-group">
        <label>Nom / Raison sociale *</label>
        <input
          type="text"
          value={client.nom}
          onChange={(e) => onChange('nom', e.target.value)}
          placeholder="Client SARL"
          required
        />
      </div>
      <div className="form-group">
        <label>Adresse *</label>
        <input
          type="text"
          value={client.adresse}
          onChange={(e) => onChange('adresse', e.target.value)}
          placeholder="456 Avenue Client"
          required
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Code postal *</label>
          <input
            type="text"
            value={client.codePostal}
            onChange={(e) => onChange('codePostal', e.target.value)}
            placeholder="69001"
            required
          />
        </div>
        <div className="form-group">
          <label>Ville *</label>
          <input
            type="text"
            value={client.ville}
            onChange={(e) => onChange('ville', e.target.value)}
            placeholder="Lyon"
            required
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Téléphone</label>
          <input
            type="tel"
            value={client.telephone}
            onChange={(e) => onChange('telephone', e.target.value)}
            placeholder="04 12 34 56 78"
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={client.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="client@example.fr"
          />
        </div>
      </div>
    </div>
  );
}

export default ClientSection;


