import React, { useMemo } from 'react';
import './ComptabiliteView.css';

const TAUX_POT_COMMUN = 0.05; // 5%
const RESPONSABLES_LABELS = ['Adrien', 'Côme', 'Martin'];
const LABEL_NON_ATTRIBUE = 'Non attribué';

function ComptabiliteView({ prestations }) {
  const stats = useMemo(() => {
    const byResponsable = {};
    RESPONSABLES_LABELS.forEach((r) => {
      byResponsable[r] = { nb: 0, total: 0, pot: 0 };
    });
    byResponsable[LABEL_NON_ATTRIBUE] = { nb: 0, total: 0, pot: 0 };

    prestations.forEach((p) => {
      const montant = Number(p.montant) || 0;
      const resp = (p.responsable && p.responsable.trim()) || LABEL_NON_ATTRIBUE;
      if (!byResponsable[resp]) {
        byResponsable[resp] = { nb: 0, total: 0, pot: 0 };
      }
      byResponsable[resp].nb += 1;
      byResponsable[resp].total += montant;
      byResponsable[resp].pot += montant * TAUX_POT_COMMUN;
    });

    const totalPot = Object.values(byResponsable).reduce((s, x) => s + x.pot, 0);
    const totalGlobal = prestations.reduce((s, p) => s + (Number(p.montant) || 0), 0);
    const nbTotal = prestations.length;

    return {
      byResponsable,
      totalPot,
      totalGlobal,
      nbTotal,
    };
  }, [prestations]);

  const orderedKeys = useMemo(() => {
    const known = RESPONSABLES_LABELS.filter((r) => stats.byResponsable[r]?.nb > 0);
    const other = Object.keys(stats.byResponsable).filter(
      (k) => !RESPONSABLES_LABELS.includes(k) && stats.byResponsable[k]?.nb > 0
    );
    return [...known, ...other];
  }, [stats.byResponsable]);

  const formatEuro = (n) => `${Number(n).toFixed(2)} €`;

  return (
    <div className="comptabilite">
      <div className="comptabilite-header">
        <h2>📊 Comptabilité</h2>
        <p className="comptabilite-subtitle">
          Nombre de prestations et totaux par responsable. Chaque prestation verse 5 % au pot commun.
        </p>
      </div>

      <div className="comptabilite-global">
        <div className="global-card">
          <span className="global-label">Total prestations</span>
          <span className="global-value">{stats.nbTotal}</span>
        </div>
        <div className="global-card">
          <span className="global-label">Chiffre d'affaires total</span>
          <span className="global-value">{formatEuro(stats.totalGlobal)}</span>
        </div>
        <div className="global-card highlight">
          <span className="global-label">Pot commun (5 %)</span>
          <span className="global-value">{formatEuro(stats.totalPot)}</span>
        </div>
      </div>

      <div className="comptabilite-table-wrap">
        <table className="comptabilite-table">
          <thead>
            <tr>
              <th>Responsable</th>
              <th className="num">Nb prestations</th>
              <th className="num">Total CA</th>
              <th className="num">5 % dû au pot</th>
            </tr>
          </thead>
          <tbody>
            {orderedKeys.map((key) => {
              const s = stats.byResponsable[key];
              if (!s || s.nb === 0) return null;
              return (
                <tr key={key}>
                  <td className="resp-name">{key}</td>
                  <td className="num">{s.nb}</td>
                  <td className="num">{formatEuro(s.total)}</td>
                  <td className="num pot-cell">{formatEuro(s.pot)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="comptabilite-rule">
        <strong>Règle :</strong> chaque personne qui fait une prestation doit 5 % du montant de la prestation au pot commun.
        Pour que les chiffres soient par personne, renseigne le champ <strong>Responsable</strong> sur chaque prestation (onglet Prestations).
      </div>
    </div>
  );
}

export default ComptabiliteView;
