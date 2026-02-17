import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import fr from 'date-fns/locale/fr';
import { getItemsBySet, calculerTotalDevis } from './devisUtils';
import { formatFooterEntreprise } from './formatFooterEntreprise';

class PDFGenerator {
  static generate(devisData, inventory = {}, pricePerKm = 0.60) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let y = margin;

    const primaryColor = [102, 126, 234];
    const gray = [100, 100, 100];

    // En-tête : uniquement "DEVIS" en bleu
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('DEVIS', margin, 28);

    y = 55;

    // Deux cards côte à côte : Client (gauche) et Devis Info (droite)
    const client = devisData.client || {};
    const cardWidth = (pageWidth - 2 * margin - 24) / 2; // 24px de gap
    const leftX = margin;
    const rightX = margin + cardWidth + 24;
    let yLeft = y;
    let yRight = y;
    
    doc.setTextColor(0, 0, 0);
    
    // Card Client (gauche)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Facturé à :', leftX, yLeft);
    yLeft += 6;
    doc.setFont('helvetica', 'normal');
    const nomDisplay = client.nom || 'Nom du client';
    if (client.prenom) {
      doc.text(client.prenom + ' ', leftX, yLeft);
      doc.setFont('helvetica', 'bold');
      doc.text(nomDisplay, leftX + doc.getTextWidth(client.prenom + ' '), yLeft);
      doc.setFont('helvetica', 'normal');
    } else {
      doc.setFont('helvetica', 'bold');
      doc.text(nomDisplay, leftX, yLeft);
      doc.setFont('helvetica', 'normal');
    }
    yLeft += 5;
    if (client.adresse) {
      doc.text(client.adresse, leftX, yLeft);
      yLeft += 5;
    }
    if (client.codePostal || client.ville) {
      doc.text(`${client.codePostal || ''} ${client.ville || ''}`.trim(), leftX, yLeft);
      yLeft += 5;
    }
    if (client.telephone) {
      doc.text(`Tél : ${client.telephone}`, leftX, yLeft);
      yLeft += 5;
    }
    if (client.email) {
      doc.text(`Email : ${client.email}`, leftX, yLeft);
      yLeft += 5;
    }
    
    // Card Devis Info (droite)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Devis', rightX, yRight);
    yRight += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (devisData.numero) {
      doc.text(`N° : ${devisData.numero}`, rightX, yRight);
      yRight += 5;
    }
    if (devisData.date) {
      const dateDevis = format(new Date(devisData.date), 'dd/MM/yyyy', { locale: fr });
      doc.text(`Date : ${dateDevis}`, rightX, yRight);
      yRight += 5;
    }
    if (devisData.validite) {
      const validiteJours = Number(devisData.validite);
      let validiteStr = `Validité : ${validiteJours} jour${validiteJours > 1 ? 's' : ''}`;
      if (devisData.date) {
        const dateFin = format(
          new Date(new Date(devisData.date).getTime() + validiteJours * 24 * 60 * 60 * 1000),
          'dd/MM/yyyy',
          { locale: fr }
        );
        validiteStr += ` (→ ${dateFin})`;
      }
      doc.text(validiteStr, rightX, yRight);
      yRight += 5;
    }
    if (devisData.dateDebutPrestation || devisData.horairePrestation || devisData.lieuPrestation) {
      const prestaParts = [];
      if (devisData.dateDebutPrestation) {
        prestaParts.push(format(new Date(devisData.dateDebutPrestation), 'dd/MM/yyyy', { locale: fr }));
      }
      if (devisData.horairePrestation) prestaParts.push(devisData.horairePrestation);
      if (devisData.lieuPrestation) prestaParts.push(devisData.lieuPrestation);
      if (prestaParts.length > 0) {
        doc.text(`Prestation : ${prestaParts.join(' • ')}`, rightX, yRight);
        yRight += 5;
      }
    }
    
    // Prendre le max des deux colonnes pour continuer
    y = Math.max(yLeft, yRight) + 10;

    // Tableau
    const formule = devisData.formuleChoisie;
    const options = devisData.optionsChoisies || [];
    const km = Number(devisData.kmDeplacement) || 0;
    const montantTransport = km * pricePerKm;

    const tableData = [];
    const breakdownRowIndices = []; // Track breakdown row indices for special styling
    if (formule) {
      const ht = formule.prixTTC / 1.2;
      tableData.push([formule.label, '1', `${ht.toFixed(2)} €`, '20 %', `${formule.prixTTC.toFixed(2)} €`]);
      // Add breakdown rows if present
      if (formule.breakdown?.length > 0) {
        formule.breakdown.forEach((bd) => {
          breakdownRowIndices.push(tableData.length);
          tableData.push([`    ${bd.label}`, '', '', '', `${bd.amountTTC.toFixed(2)} €`]);
        });
      }
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
        `Transport (${km} km × ${pricePerKm.toFixed(2)} €/km)`,
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
        didParseCell: (data) => {
          // Style breakdown rows
          if (data.section === 'body' && breakdownRowIndices.includes(data.row.index)) {
            data.cell.styles.fontSize = 8;
            data.cell.styles.textColor = [100, 100, 100];
            data.cell.styles.fontStyle = 'italic';
            data.cell.styles.fillColor = [250, 251, 255];
          }
        },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // Détail matériel : masqué (données conservées pour inventaire / préparation)

    // Total TTC
    const totalTTC = calculerTotalDevis(devisData, pricePerKm);
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

    // Pied de page : ligne entreprise construite automatiquement
    const footerLine = formatFooterEntreprise(devisData.entreprise || {});
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'normal');
    if (footerLine) {
      doc.text(footerLine, pageWidth / 2, pageHeight - 15, { align: 'center' });
    }
    doc.text('Merci de votre confiance !', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // ==================== PAGE 2 : MATÉRIEL ====================
    doc.addPage();
    let y2 = margin;

    // En-tête page 2 : même style que page 1
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('MATÉRIEL', margin, 28);

    y2 = 55;

    // Sous-titre : Client + N° devis + date
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const clientName = [client.prenom, client.nom].filter(Boolean).join(' ') || 'Client';
    const devisNum = devisData.numero || '';
    const dateDevisP2 = devisData.date ? format(new Date(devisData.date), 'dd/MM/yyyy', { locale: fr }) : '';
    
    const subtitleParts = [];
    if (clientName) subtitleParts.push(clientName);
    if (devisNum) subtitleParts.push(`N° ${devisNum}`);
    if (dateDevisP2) subtitleParts.push(dateDevisP2);
    
    if (subtitleParts.length > 0) {
      doc.text(subtitleParts.join('  •  '), margin, y2);
      y2 += 10;
    }

    // Tableau placeholder Matériel
    const materielData = [];
    
    // Pour l'instant : données factices placeholder
    // TODO: remplacer par les vraies données du set/inventaire
    const placeholderItems = [
      { ref: '—', qty: '—' },
      { ref: '—', qty: '—' },
      { ref: '—', qty: '—' },
      { ref: '(Aucune donnée)', qty: '' },
    ];
    
    placeholderItems.forEach((item) => {
      materielData.push([item.ref, item.qty]);
    });

    doc.autoTable({
      startY: y2,
      head: [['Réf / Matériel', 'Qté']],
      body: materielData,
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
        1: { halign: 'center', cellWidth: 40 },
      },
      margin: { left: margin, right: margin },
    });

    // Pied de page 2
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'normal');
    if (footerLine) {
      doc.text(footerLine, pageWidth / 2, pageHeight - 15, { align: 'center' });
    }
    doc.text('Page 2 / 2', pageWidth / 2, pageHeight - 10, { align: 'center' });

    const pdfOutput = doc.output('arraybuffer');
    return new Blob([pdfOutput], { type: 'application/pdf' });
  }
}

export default PDFGenerator;
