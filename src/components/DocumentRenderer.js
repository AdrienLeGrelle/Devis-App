import React, { useRef, useCallback } from 'react';
import { format } from 'date-fns';
import fr from 'date-fns/locale/fr';
import { Rnd } from 'react-rnd';
import { getItemsBySet, calculerTotalDevis } from '../utils/devisUtils';
import { formatFooterEntreprise } from '../utils/formatFooterEntreprise';
import DraggableBlock from './DraggableBlock';
import { PAGE_PADDING } from '../utils/docLayout';
import { getStockCommunAnnexeForFormule } from '../utils/stockCommunAnnexe';
import './DocumentRenderer.css';

const IMAGE_GRID = 8;
const snap = (v) => Math.round(v / IMAGE_GRID) * IMAGE_GRID;

/**
 * Composant unique qui rend TOUT le devis (page 1 + éventuelle page MATÉRIEL).
 * En mode édition (editLayoutMode + docLayout), les blocs sont déplaçables sans changer l'aperçu.
 */
const DocumentRenderer = React.forwardRef(function DocumentRenderer(
  { devisData, inventory, pricePerKm = 0.60, editLayoutMode = false, docLayout, onDocLayoutChange },
  ref
) {
  const pageInnerRef = useRef(null);

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
  // Set utilisé pour le matériel : celui de la formule ou set1 par défaut
  const materialSetId = formule?.setId || 'set1';
  const materials = formule
    ? getItemsBySet(inventory || {}, materialSetId, datePresta)
    : [];
  // Afficher la page matériel dès qu'une formule est sélectionnée
  const hasMaterialPage = !!formule;
  
  // Organiser le matériel par catégories (DJ, SON, LUMIERE)
  const materialsByCategory = {
    DJ: materials.filter((item) => item.category === 'DJ'),
    SON: materials.filter((item) => item.category === 'SON'),
    LUMIERE: materials.filter((item) => item.category === 'LUMIERE'),
  };
  
  // Récupérer le stock commun annexe pour la formule choisie
  const annexes = formule?.label
    ? getStockCommunAnnexeForFormule(inventory, formule.label)
    : [];
  
  // Vérifier s'il y a du matériel dans au moins une catégorie
  const hasAnyMaterial = Object.values(materialsByCategory).some((items) => items.length > 0);
  const footerLine = formatFooterEntreprise(devisData.entreprise || {});

  const getBlock = useCallback(
    (id) => (docLayout?.blocks || []).find((b) => b.id === id),
    [docLayout]
  );

  const handleDragStop = useCallback(
    (id, x, y) => {
      if (!onDocLayoutChange || !docLayout) return;
      const blocks = docLayout.blocks.map((b) =>
        b.id === id ? { ...b, x, y } : b
      );
      onDocLayoutChange({ ...docLayout, blocks });
    },
    [docLayout, onDocLayoutChange]
  );

  const handleImageUpdate = useCallback(
    (id, updates) => {
      if (!onDocLayoutChange || !docLayout) return;
      const images = (docLayout.images || []).map((img) =>
        img.id === id ? { ...img, ...updates } : img
      );
      onDocLayoutChange({ ...docLayout, images });
    },
    [docLayout, onDocLayoutChange]
  );

  const renderPageFooter = () => (
    <div className="doc-page-footer">
      <div className="doc-page-footer-border" />
      <div className="doc-page-footer-content">{footerLine || ' '}</div>
    </div>
  );

  const wrapBlock = (id, content) => {
    if (!editLayoutMode || !docLayout) return content;
    const block = getBlock(id);
    if (!block) return content;
    return (
      <DraggableBlock
        id={id}
        pageRef={pageInnerRef}
        baseX={PAGE_PADDING}
        baseY={PAGE_PADDING}
        currentX={block.x}
        currentY={block.y}
        width={block.w}
        height={block.h}
        contentWidth={docLayout.contentWidth}
        contentHeight={docLayout.contentHeight}
        footerHeight={docLayout.footerHeight || 30}
        onDragStop={handleDragStop}
        editMode={true}
      >
        <div className="layout-overlay-frame doc-edit-block">
          <span className="layout-drag-handle" title="Déplacer">⋮⋮</span>
          <div className="doc-edit-block-content">{content}</div>
        </div>
      </DraggableBlock>
    );
  };

  return (
    <div ref={ref} className={`document-renderer${editLayoutMode ? ' doc-edit-mode' : ''}`}>
      {/* Page 1 : Devis */}
      <div className="page doc-page">
        <div ref={pageInnerRef} className="page-inner">
          {editLayoutMode && docLayout ? (
            <>
              {wrapBlock(
                'header',
                <>
                  <div className="doc-header">
                    <h1>DEVIS</h1>
                  </div>
                  <div className="doc-separator" />
                </>
              )}
              {wrapBlock(
                'client',
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
              )}
              {wrapBlock(
                'devisInfo',
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
              )}
              {wrapBlock(
                'table',
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
                                {(formule.prixTTC / 1.2).toFixed(2)} €
                              </span>
                            </td>
                            <td className="num percent">
                              <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                                20 %
                              </span>
                            </td>
                            <td className="num amount">
                              <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                                {formule.prixTTC.toFixed(2)} €
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
                                    {bd.amountTTC.toFixed(2)} €
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
                                {(htOpt / qty).toFixed(2)} €
                              </span>
                            </td>
                            <td className="num percent">
                              <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                                20 %
                              </span>
                            </td>
                            <td className="num amount">
                              <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                                {totalOpt.toFixed(2)} €
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
                              {montantTransport.toFixed(2)} €
                            </span>
                          </td>
                          <td className="num percent">
                            <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                              0 %
                            </span>
                          </td>
                          <td className="num amount">
                            <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                              {montantTransport.toFixed(2)} €
                            </span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {wrapBlock(
                'totals',
                <div className="doc-totals-section">
                  <div className="doc-totals-table">
                    <div className="total-row total-final">
                      <span>Total TTC :</span>
                      <span className="amount" style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                        {totalTTC.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {wrapBlock(
                'conditions',
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
              {/* Images déplaçables et redimensionnables (Rnd = drag + resize par les coins) */}
              {(docLayout.images || []).map((img) => {
                const x = img.x ?? 100;
                const y = img.y ?? 100;
                const w = img.w ?? 200;
                const h = img.h ?? 150;
                return (
                  <Rnd
                    key={img.id}
                    position={{ x, y }}
                    size={{ width: w, height: h }}
                    onDragStop={(e, d) => {
                      handleImageUpdate(img.id, { x: snap(d.x), y: snap(d.y) });
                    }}
                    onResizeStop={(e, direction, ref, delta, position) => {
                      handleImageUpdate(img.id, {
                        w: snap(parseInt(ref.style.width, 10)),
                        h: snap(parseInt(ref.style.height, 10)),
                        x: snap(position.x),
                        y: snap(position.y),
                      });
                    }}
                    bounds="parent"
                    dragGrid={[IMAGE_GRID, IMAGE_GRID]}
                    resizeGrid={[IMAGE_GRID, IMAGE_GRID]}
                    minWidth={40}
                    minHeight={40}
                    enableResizing={true}
                    disableDragging={false}
                    className="doc-image-rnd"
                    style={{ zIndex: 10 }}
                  >
                    <div className="layout-overlay-frame doc-edit-block doc-edit-image">
                      <button
                        type="button"
                        className="image-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDocLayoutChange && docLayout) {
                            const images = (docLayout.images || []).filter((i) => i.id !== img.id);
                            onDocLayoutChange({ ...docLayout, images });
                          }
                        }}
                        title="Supprimer l'image"
                      >
                        ×
                      </button>
                      <div className="doc-edit-block-content">
                        <img
                          src={img.src}
                          alt=""
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            display: 'block',
                            pointerEvents: 'none',
                          }}
                        />
                      </div>
                    </div>
                  </Rnd>
                );
              })}
            </>
          ) : (
            <>
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
                          {(formule.prixTTC / 1.2).toFixed(2)} €
                        </span>
                      </td>
                      <td className="num percent">
                        <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                          20 %
                        </span>
                      </td>
                      <td className="num amount">
                        <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                          {formule.prixTTC.toFixed(2)} €
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
                              {bd.amountTTC.toFixed(2)} €
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
                          {(htOpt / qty).toFixed(2)} €
                        </span>
                      </td>
                      <td className="num percent">
                        <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                          20 %
                        </span>
                      </td>
                      <td className="num amount">
                        <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                          {totalOpt.toFixed(2)} €
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
                        {montantTransport.toFixed(2)} €
                      </span>
                    </td>
                    <td className="num percent">
                      <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                        0 %
                      </span>
                    </td>
                    <td className="num amount">
                      <span style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
                        {montantTransport.toFixed(2)} €
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
                  {totalTTC.toFixed(2)} €
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
            </>
          )}
          {/* Images en mode aperçu : même repère que en édition (relatif à page-inner) */}
          {!editLayoutMode && docLayout && (docLayout.images || []).map((img) => (
            <div
              key={img.id}
              style={{
                position: 'absolute',
                left: img.x ?? 0,
                top: img.y ?? 0,
                width: img.w || 200,
                height: img.h || 150,
                zIndex: 1,
              }}
            >
              <img
                src={img.src}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
          ))}
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
            <div className="doc-separator" />
            <div className="doc-materiel-subtitle">
              {[client.prenom, client.nom].filter(Boolean).join(' ')}
              {devisData.numero && `  •  N° ${devisData.numero}`}
              {dateDevis && `  •  ${dateDevis}`}
            </div>
            <div className="doc-materiel-table">
              {hasAnyMaterial ? (
                <>
                  {Object.entries(materialsByCategory).map(([category, items]) => {
                    if (items.length === 0) return null;
                    return (
                      <div key={category} className="doc-materiel-category">
                        <h3 className="doc-materiel-category-title">{category}</h3>
                        <table>
                          <thead>
                            <tr>
                              <th>Matériel</th>
                              <th className="num qty">Qté</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item) => (
                              <tr key={item.id}>
                                <td>{item.fullName || item.name}</td>
                                <td className="num qty">{item.qty ?? 1}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </>
              ) : null}
              
              {/* Section ANNEXES - Stock commun annexe (tous les éléments affichés) */}
              {annexes.length > 0 && (
                <div className="doc-materiel-category doc-materiel-annexes">
                  <h3 className="doc-materiel-category-title">ANNEXES</h3>
                  <div className="doc-annexes-wrapper">
                    <table className="doc-annexes-table">
                      <thead>
                        <tr>
                          <th>Matériel</th>
                          <th className="num qty">Qté</th>
                        </tr>
                      </thead>
                      <tbody>
                        {annexes.map((item) => (
                          <tr key={item.id}>
                            <td>{item.label}</td>
                            <td className="num qty">{item.qty ?? 1}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {!hasAnyMaterial && annexes.length === 0 && (
                <div className="doc-materiel-empty">
                  <p>Aucun matériel assigné pour cette date de prestation.</p>
                  <p className="doc-materiel-empty-hint">
                    Renseigne le matériel dans l'onglet "Inventaire" pour la date du {datePresta ? format(new Date(datePresta), 'dd/MM/yyyy', { locale: fr }) : 'devis'}.
                  </p>
                </div>
              )}
            </div>
          </div>
          {renderPageFooter()}
        </div>
      )}
    </div>
  );
});

export default DocumentRenderer;
