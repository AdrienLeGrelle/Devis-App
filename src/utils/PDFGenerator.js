import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import fr from 'date-fns/locale/fr';
import { getItemsBySet, calculerTotalDevis } from './devisUtils';
import { TARIF_KM } from '../config/melodix';

class PDFGenerator {
  static generate(devisData, inventory = {}) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let y = margin;

    const primaryColor = [102, 126, 234];
    const gray = [100, 100, 100];

    // En-tête
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('DEVIS', margin, 28);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`N° : ${devisData.numero || '—'}`, pageWidth - margin, 18, { align: 'right' });
    const dateDevis = devisData.date ? format(new Date(devisData.date), 'dd/MM/yyyy', { locale: fr }) : '';
    doc.text(`Date : ${dateDevis}`, pageWidth - margin, 25, { align: 'right' });
    const dateValidite =
      devisData.date && devisData.validite
        ? format(
            new Date(new Date(devisData.date).getTime() + devisData.validite * 24 * 60 * 60 * 1000),
            'dd/MM/yyyy',
            { locale: fr }
          )
        : '';
    doc.text(`Valide jusqu'au : ${dateValidite}`, pageWidth - margin, 32, { align: 'right' });

    y = 55;

    // Entreprise
    const ent = devisData.entreprise || {};
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(ent.nom || 'Votre Entreprise', margin, y);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    y += 6;
    doc.text(`${ent.adresse || ''}`, margin, y);
    y += 5;
    doc.text(`${ent.codePostal || ''} ${ent.ville || ''}`, margin, y);
    y += 5;
    if (ent.telephone) doc.text(`Tél : ${ent.telephone}`, margin, y);
    y += 5;
    if (ent.email) doc.text(`Email : ${ent.email}`, margin, y);
    y += 5;
    if (ent.siret) doc.text(`SIRET : ${ent.siret}`, margin, y);
    if (ent.codeAPE) doc.text(`Code APE : ${ent.codeAPE}`, margin, y + 5);
    y += 15;

    // Client
    const client = devisData.client || {};
    doc.setFont('helvetica', 'bold');
    doc.text('Facturé à :', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(client.nom || 'Nom du client', margin, y);
    y += 5;
    doc.text(`${client.adresse || ''}`, margin, y);
    y += 5;
    doc.text(`${client.codePostal || ''} ${client.ville || ''}`, margin, y);
    if (client.telephone) {
      y += 5;
      doc.text(`Tél : ${client.telephone}`, margin, y);
    }
    if (client.email) {
      y += 5;
      doc.text(`Email : ${client.email}`, margin, y);
    }
    y += 15;

    // Tableau
    const formule = devisData.formuleChoisie;
    const options = devisData.optionsChoisies || [];
    const km = Number(devisData.kmDeplacement) || 0;
    const montantTransport = km * TARIF_KM;

    const tableData = [];
    if (formule) {
      const ht = formule.prixTTC / 1.2;
      tableData.push([formule.label, '1', `${ht.toFixed(2)} €`, '20 %', `${formule.prixTTC.toFixed(2)} €`]);
    }
    options.forEach((opt) => {
      const qty = Number(opt.quantite) || 1;
      const totalOpt = (opt.prixTTC || 0) * qty;
      const htOpt = totalOpt / 1.2;
      tableData.push([
        `Option : ${opt.label}`,
        String(qty),
        `${(htOpt / qty).toFixed(2)} €`,
        '20 %',
        `${totalOpt.toFixed(2)} €`,
      ]);
    });
    if (km > 0) {
      tableData.push([
        `Transport (${km} km × ${TARIF_KM} €/km)`,
        '1',
        `${montantTransport.toFixed(2)} €`,
        '0 %',
        `${montantTransport.toFixed(2)} €`,
      ]);
    }

    if (tableData.length > 0) {
      doc.autoTable({
        startY: y,
        head: [['Désignation', 'Qté', 'Prix unitaire HT', 'TVA', 'Total TTC']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10,
        },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'center' },
          4: { halign: 'right' },
        },
        margin: { left: margin, right: margin },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // Détail matériel
    const datePresta = devisData.dateDebutPrestation || devisData.date;
    const detailMateriel = formule?.setId ? getItemsBySet(inventory, formule.setId, datePresta) : [];
    if (detailMateriel.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Détail du matériel inclus (Set ${formule.setId})`, margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      detailMateriel.forEach((item) => {
        const qty = item.qty > 1 ? `${item.qty} × ` : '';
        doc.text(`• ${qty}${item.name}`, margin + 2, y);
        y += 5;
      });
      y += 8;
    }

    // Total TTC
    const totalTTC = calculerTotalDevis(devisData);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total TTC :', pageWidth - margin - 50, y);
    doc.text(`${totalTTC.toFixed(2)} €`, pageWidth - margin, y, { align: 'right' });
    y += 15;

    // Notes et conditions
    if (devisData.notes || devisData.conditions) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      if (devisData.notes) {
        doc.setFont('helvetica', 'bold');
        doc.text('Notes :', margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(devisData.notes, pageWidth - 2 * margin);
        doc.text(lines, margin, y);
        y += lines.length * 4 + 5;
      }
      if (devisData.conditions) {
        doc.setFont('helvetica', 'bold');
        doc.text('Conditions de paiement :', margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(devisData.conditions, pageWidth - 2 * margin);
        doc.text(lines, margin, y);
      }
    }

    // Pied de page
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text('Merci de votre confiance !', pageWidth / 2, pageHeight - 15, { align: 'center' });

    const pdfOutput = doc.output('arraybuffer');
    return new Blob([pdfOutput], { type: 'application/pdf' });
  }
}

export default PDFGenerator;
