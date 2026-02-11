/**
 * Construit une ligne de footer à partir des coordonnées entreprise.
 * Ne jamais afficher les champs vides.
 * Gère nom/adresse/codePostal/ville ou equivalences (name, address, zip, city).
 * @param {Object} entreprise - Objet entreprise (devis.entreprise, etc.)
 * @returns {string}
 */
export function formatFooterEntreprise(entreprise) {
  if (!entreprise) return '';
  const e = entreprise;
  const name = (e.nom || e.name || '').trim();
  const address = (e.adresse || e.address || '').trim();
  const zip = (e.codePostal || e.zip || '').trim();
  const city = (e.ville || e.city || '').trim();
  const phone = (e.telephone || e.phone || '').trim();
  const email = (e.email || '').trim();
  const siret = (e.siret || '').trim();
  const ape = (e.codeAPE || e.ape || '').trim();
  const tva = (e.tva || '').trim();

  const parts = [];
  if (name) parts.push(name);
  const addrParts = [address, [zip, city].filter(Boolean).join(' ')].filter(Boolean);
  const addrLine = addrParts.join(', ').replace(/\s+/g, ' ').trim();
  if (addrLine) parts.push(addrLine);
  if (phone) parts.push(`Tél : ${phone}`);
  if (email) parts.push(email);
  if (siret) parts.push(`SIRET : ${siret}`);
  if (ape) parts.push(`APE : ${ape}`);
  if (tva) parts.push(`TVA : ${tva}`);

  return parts.join(' — ').replace(/\s*—\s*—\s*/g, ' — ').trim();
}
