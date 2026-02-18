/**
 * Génère un PDF par capture du DOM de l'aperçu (même rendu) puis téléchargement direct.
 * Flux : wait assets (fonts + images) → html2canvas → jsPDF (multi-pages A4) → download.
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/**
 * Attend que les polices et les images du conteneur soient prêtes.
 */
async function waitForAssets(container) {
  // Attendre les polices si l'API est disponible
  if (document.fonts && typeof document.fonts.ready === 'function') {
    await document.fonts.ready();
  } else {
    // Fallback : attendre un délai raisonnable pour le chargement des polices
    await new Promise((r) => setTimeout(r, 200));
  }
  
  // Attendre le chargement des images
  const images = container.querySelectorAll('img');
  await Promise.all(
    Array.from(images).map((img) => {
      if (img.complete && img.naturalHeight !== 0) {
        return Promise.resolve();
      }
      return img.decode ? img.decode() : new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );
}

/**
 * Capture l'élément DOM et télécharge un PDF fidèle (multi-pages A4 si besoin).
 * @param {HTMLElement} element - Le conteneur à capturer (ex: .canvas-page)
 * @param {string} filename - Nom du fichier (ex: "Devis_DEV-xxx.pdf")
 */
export async function captureAndDownloadPdf(element, filename = 'Devis.pdf') {
  if (!element || !element.offsetParent) {
    console.warn('pdfFromPreview: element non visible');
    return;
  }

  window.dispatchEvent(new Event('pdf-capture-start'));
  await new Promise((r) => setTimeout(r, 150));

  await waitForAssets(element);

  // Scale 6 = très haute résolution (≈ 225 DPI), PDF net pour impression et logos
  const scale = 6;
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    imageTimeout: 0,
    foreignObjectRendering: false,
  });

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidthMm = A4_WIDTH_MM;
  const pageHeightMm = A4_HEIGHT_MM;

  // En mm, largeur max = page, hauteur proportionnelle
  const contentWidthMm = pageWidthMm;
  const contentHeightMm = (imgHeight / imgWidth) * contentWidthMm;

  const totalPages = Math.max(1, Math.ceil(contentHeightMm / pageHeightMm));
  const imgData = canvas.toDataURL('image/png');

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage();
    const yOffsetMm = -page * pageHeightMm;
    pdf.addImage(imgData, 'PNG', 0, yOffsetMm, contentWidthMm, contentHeightMm);
  }

  pdf.save(filename);
}
