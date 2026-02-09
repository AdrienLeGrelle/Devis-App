import { format } from 'date-fns';
import fr from 'date-fns/locale/fr';
import { getItemsBySet, calculerTotalDevis } from './devisUtils';
import { TARIF_KM } from '../config/melodix';

function buildArticlesRows(formule, options, km, montantTransport) {
  const rows = [];
  if (formule) {
    rows.push({ designation: formule.label, qty: 1, pu: (formule.prixTTC / 1.2).toFixed(2), tva: '20 %', total: formule.prixTTC.toFixed(2) });
  }
  options.forEach((opt) => {
    const qty = Number(opt.quantite) || 1;
    const totalOpt = (opt.prixTTC || 0) * qty;
    const htOpt = totalOpt / 1.2;
    rows.push({ designation: `Option : ${opt.label}`, qty, pu: (htOpt / qty).toFixed(2), tva: '20 %', total: totalOpt.toFixed(2) });
  });
  if (km > 0) {
    rows.push({ designation: `Transport (${km} km × ${TARIF_KM} €/km)`, qty: 1, pu: montantTransport.toFixed(2), tva: '0 %', total: montantTransport.toFixed(2) });
  }
  return rows;
}

/**
 * Résout la valeur d'un champ à partir de devisData et inventory
 */
export function resolveFieldValue(fieldKey, devisData, inventory) {
  const ent = devisData?.entreprise || {};
  const client = devisData?.client || {};
  const formule = devisData?.formuleChoisie;
  const options = devisData?.optionsChoisies || [];
  const km = Number(devisData?.kmDeplacement) || 0;
  const montantTransport = km * TARIF_KM;
  const totalTTC = calculerTotalDevis(devisData || {});

  const dateDevis = devisData?.date ? format(new Date(devisData.date), 'dd/MM/yyyy', { locale: fr }) : '';
  const dateValidite =
    devisData?.date && devisData?.validite
      ? format(
          new Date(new Date(devisData.date).getTime() + devisData.validite * 24 * 60 * 60 * 1000),
          'dd/MM/yyyy',
          { locale: fr }
        )
      : '';

  const datePresta = devisData?.dateDebutPrestation || devisData?.date;
  const detailMateriel = formule?.setId ? getItemsBySet(inventory || {}, formule.setId, datePresta) : [];

  switch (fieldKey) {
    case 'titre':
      return 'DEVIS';
    case 'numero':
      return `N° : ${devisData?.numero || '—'}`;
    case 'date':
      return `Date : ${dateDevis}`;
    case 'dateValidite':
      return `Valide jusqu'au : ${dateValidite}`;
    case 'entreprise':
      return [
        ent.nom || 'Votre Entreprise',
        ent.adresse,
        `${ent.codePostal || ''} ${ent.ville || ''}`.trim(),
        ent.telephone && `Tél : ${ent.telephone}`,
        ent.email && `Email : ${ent.email}`,
        ent.siret && `SIRET : ${ent.siret}`,
        ent.codeAPE && `Code APE : ${ent.codeAPE}`,
        ent.tva && `TVA : ${ent.tva}`,
      ]
        .filter(Boolean)
        .join('\n');
    case 'client':
      return [
        `Facturé à :`,
        client.nom ? `\n${client.nom}` : '',
        client.adresse,
        `${client.codePostal || ''} ${client.ville || ''}`.trim(),
        client.telephone && `Tél : ${client.telephone}`,
        client.email && `Email : ${client.email}`,
      ]
        .filter(Boolean)
        .join('\n');
    case 'articlesTable': {
      const rows = buildArticlesRows(formule, options, km, montantTransport);
      return rows.length ? { type: 'table', rows } : '—';
    }
    case 'detailMateriel':
      if (detailMateriel.length === 0) return '';
      return `Détail matériel (Set ${formule?.setId})\n${detailMateriel.map((i) => (i.qty > 1 ? `${i.qty} × ${i.name}` : i.name)).join('\n')}`;
    case 'totalTTC':
      return `Total TTC : ${totalTTC.toFixed(2)} €`;
    case 'notes':
      return devisData?.notes ? `Notes :\n${devisData.notes}` : '';
    case 'conditions':
      return devisData?.conditions ? `Conditions :\n${devisData.conditions}` : '';
    case 'footer':
      return 'Merci de votre confiance !';
    default:
      return '';
  }
}
