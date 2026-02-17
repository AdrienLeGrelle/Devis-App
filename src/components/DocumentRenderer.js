import React from 'react';
import { format } from 'date-fns';
import fr from 'date-fns/locale/fr';
import { getItemsBySet, calculerTotalDevis } from '../utils/devisUtils';
import { formatFooterEntreprise } from '../utils/formatFooterEntreprise';
import './DocumentRenderer.css';

/**
 * Composant unique qui rend TOUT le devis (page 1 + éventuelle page MATÉRIEL).
 * Utilisé par la preview ET par l'export PDF (window.print sur le même HTML/CSS).
 * Page 2 MATÉRIEL : rendue UNIQUEMENT si materials.length > 0.
 */
const DocumentRenderer = React.forwardRef(function DocumentRenderer(
  { devisData, inventory, pricePerKm = 0.60 },
  ref
) {
  if (!devisData) {
    return null;
  }

  const totalTTC = calculerTotalDevis(devisData, pricePerKm);
  const dateDevis = devisData.date
    ? format(new Date(devisData.date), 'dd/MM/yyyy', { locale: fr })
    : '';
  const dateValidite =
    devisData.date && devisData.validite
      ? format(
          new Date(
            new Date(devisData.date).getTime() + devisData.validite * 24 * 60 * 60 * 1000
          ),
          'dd/MM/yyyy',
          { locale: fr }
        )
      : '';
  const client = devisData.client || {};
  const formule = devisData.formuleChoisie;
  const options = devisData.optionsChoisies || [];
  const km = Number(devisData.kmDeplacement) || 0;
  const montantTransport = km * pricePerKm;
  const datePresta = devisData.dateDebutPrestation || devisData.date;
  const materials = formule?.setId
    ? getItemsBySet(inventory || {}, formule.setId, datePresta)
    : [];
  const hasMaterialPage = materials.length > 0;
  const footerLine = formatFooterEntreprise(devisData.entreprise || {});

  const renderPageFooter = () => (
    <div className="doc-page-footer">
      <div className="doc-page-footer-border" />
      <div className="doc-page-footer-content">{footerLine || '\u00A0'}</div>
    </div>
  );

  return (
    <div ref={ref} className="document-renderer">
      {/* Page 1 : Devis */}
      <div className="page doc-page">
        <div className="page-inner">
          <div className="doc-header">
            <h1>DEVIS</h1>
          </div>
          <div className="doc-separator" />
          <div className="doc-top-row">
            <div className="doc-client-section">
              <h3>Facturé à :</h3>
              <div className="doc-client-box">
                <p>
                  {client.prenom && <>{client.prenom} </>}
                  <strong>{client.nom || 'Nom du client'}</strong>
                </p>
                {client.adresse && <p>{client.adresse}</p>}
                {(client.codePostal || client.ville) && (
                  <p>
                    {client.codePostal} {client.ville}
                  </p>
                )}
                {client.telephone && <p>Tél : {client.telephone}</p>}
                {client.email && <p>Email : {client.email}</p>}
              </div>
            </div>
            <div className="doc-devis-info-section">
              <h3>Devis</h3>
              <div className="doc-devis-info-box">
                {devisData.numero && (
                  <p>
                    <strong>N° :</strong> {devisData.numero}
                  </p>
                )}
                {dateDevis && (
                  <p>
                    <strong>Date :</strong> {dateDevis}
                  </p>
                )}
                {devisData.validite && (
                  <p>
                    <strong>Validité :</strong> {devisData.validite} jour
                    {Number(devisData.validite) > 1 ? 's' : ''}
                    {dateValidite && ` (→ ${dateValidite})`}
                  </p>
                )}
                {(devisData.dateDebutPrestation ||
                  devisData.horairePrestation ||
                  devisData.lieuPrestation) && (
                  <p>
                    <strong>Prestation :</strong>{' '}
                    {[
                      devisData.dateDebutPrestation &&
                        format(new Date(devisData.dateDebutPrestation), 'dd/MM/yyyy', {
                          locale: fr,
                        }),
                      devisData.horairePrestation,
                      devisData.lieuPrestation,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="doc-articles-table">
            <table>
              <thead>
                <tr>
                  <th>Désignation</th>
                  <th className="num qty">Quantité</th>
                  <th className="num amount">Prix unitaire HT</th>
                  <th className="num percent">TVA</th>
                  <th className="num amount">Total TTC</th>
                </tr>
              </thead>
              <tbody>
                {formule && (
                  <>
                    <tr>
                      <td>{formule.label}</td>
                      <td className="num qty">1</td>
                      <td className="num amount">
                        <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                          {(formule.prixTTC / 1.2).toFixed(2)}\u00A0€
                        </span>
                      </td>
                      <td className="num percent">
                        <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                          20\u00A0%
                        </span>
                      </td>
                      <td className="num amount">
                        <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                          {formule.prixTTC.toFixed(2)}\u00A0€
                        </span>
                      </td>
                    </tr>
                    {formule.breakdown?.length > 0 &&
                      formule.breakdown.map((bd) => (
                        <tr key={bd.id} className="breakdown-row">
                          <td colSpan="4" className="breakdown-label">
                            {bd.label}
                          </td>
                          <td className="num amount breakdown-amount">
                            <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                              {bd.amountTTC.toFixed(2)}\u00A0€
                            </span>
                          </td>
                        </tr>
                      ))}
                  </>
                )}
                {options.map((opt) => {
                  const qty = Number(opt.quantite) || 1;
                  const totalOpt = (opt.prixTTC || 0) * qty;
                  const htOpt = totalOpt / 1.2;
                  return (
                    <tr key={opt.id}>
                      <td>Option : {opt.label}</td>
                      <td className="num qty">{qty}</td>
                      <td className="num amount">
                        <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                          {(htOpt / qty).toFixed(2)}\u00A0€
                        </span>
                      </td>
                      <td className="num percent">
                        <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                          20\u00A0%
                        </span>
                      </td>
                      <td className="num amount">
                        <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                          {totalOpt.toFixed(2)}\u00A0€
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {km > 0 && (
                  <tr>
                    <td>
                      Transport ({km} km × {pricePerKm.toFixed(2)} €/km)
                    </td>
                    <td className="num qty">1</td>
                    <td className="num amount">
                      <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                        {montantTransport.toFixed(2)}\u00A0€
                      </span>
                    </td>
                    <td className="num percent">
                      <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                        0\u00A0%
                      </span>
                    </td>
                    <td className="num amount">
                      <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                        {montantTransport.toFixed(2)}\u00A0€
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="doc-totals-section">
            <div className="doc-totals-table">
              <div className="total-row total-final">
                <span>Total TTC :</span>
                <span className="amount" style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                  {totalTTC.toFixed(2)}\u00A0€
                </span>
              </div>
            </div>
          </div>

          {(devisData.notes || devisData.conditions) && (
            <div className="doc-notes-section">
              {devisData.notes && (
                <div className="doc-notes-box">
                  <h4>Notes :</h4>
                  <p>{devisData.notes}</p>
                </div>
              )}
              {devisData.conditions && (
                <div className="doc-conditions-box">
                  <h4>Conditions de paiement :</h4>
                  <p>{devisData.conditions}</p>
                </div>
              )}
            </div>
          )}
        </div>
        {renderPageFooter()}
      </div>

      {/* Page 2 : MATÉRIEL - uniquement si materials.length > 0 */}
      {hasMaterialPage && (
        <div className="page doc-page page-break doc-materiel-page">
          <div className="page-inner">
            <div className="doc-header">
              <h1>MATÉRIEL</h1>
            </div>
            <div className="doc-materiel-subtitle">
              {[client.prenom, client.nom].filter(Boolean).join(' ')}
              {devisData.numero && `  •  N° ${devisData.numero}`}
              {dateDevis && `  •  ${dateDevis}`}
            </div>
            <div className="doc-materiel-table">
              <table>
                <thead>
                  <tr>
                    <th>Réf / Matériel</th>
                    <th className="num qty">Qté</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td className="num qty">{item.qty ?? 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {renderPageFooter()}
        </div>
      )}
    </div>
  );
});

export default DocumentRenderer;
