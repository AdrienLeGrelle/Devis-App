import React, { useEffect, useState, useCallback, useRef } from 'react';
import './App.css';
import DevisForm from './components/DevisForm';
import DevisPreview from './components/DevisPreview';
import PDFGenerator from './utils/PDFGenerator';
import { calculerTotalDevis } from './utils/devisUtils';
import PrestationsView from './components/PrestationsView';
import InventoryView from './components/InventoryView';
import ComptabiliteView from './components/ComptabiliteView';
import inventorySeed from './data/inventory.json';
import { SETS, DEFAULT_FORMULE_PRESETS } from './utils/inventoryAssignments';
import { melodixEntreprise } from './config/melodix';
import { useUndoRedo } from './hooks/useUndoRedo';

function App() {
  const [devisData, setDevisData] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    const y = today.slice(0, 4);
    const m = today.slice(5, 7);
    const d = today.slice(8, 10);
    return {
    numero: `DEV-${y}${m}${d}`,
    date: today,
    validite: 30,
    dateDebutPrestation: '',
    horairePrestation: '',
    lieuPrestation: '',
    formuleChoisie: null,
    optionsChoisies: [],
    kmDeplacement: 0,
    entreprise: {
      nom: '',
      adresse: '',
      codePostal: '',
      ville: '',
      telephone: '',
      email: '',
      siret: '',
      codeAPE: '',
      tva: ''
    },
    client: {
      nom: '',
      adresse: '',
      codePostal: '',
      ville: '',
      telephone: '',
      email: ''
    },
    notes: '',
    conditions: 'Paiement à réception de facture. Délai de paiement : 30 jours.'
  };
  });

  const [activeTab, setActiveTab] = useState('form');
  const [facturant, setFacturant] = useState('adrien');
  const activeUndoManagerRef = useRef(null);
  const [activeUndoState, setActiveUndoState] = useState({ canUndo: false, canRedo: false });
  const [inventory, setInventory] = useState({ items: [], sets: [] });
  const [inventoryDate, setInventoryDate] = useState(() => new Date().toISOString().split('T')[0]);
  // Jeu de données par défaut inspiré de tes tableaux
  const basePrestations = [
    {
      id: 'p1',
      nom: 'Rallye Milly Philly',
      type: 'Rallye entier',
      montant: 650,
      date: '2026-01-10',
      statut: 'marche_conclu',
      note: 'Cercle National des Armées',
    },
    {
      id: 'p2',
      nom: 'Rodriguez Paul',
      type: 'Mariage',
      montant: 1450,
      date: '2026-01-17',
      statut: 'marche_conclu',
      note: 'Domaine de Ouezy – Google Form – Côme Templier',
    },
    {
      id: 'p3',
      nom: 'dsv loc',
      type: 'Location',
      montant: 200,
      date: '2026-01-24',
      statut: 'marche_conclu',
      note: '',
    },
    {
      id: 'p4',
      nom: 'Gala n…',
      type: 'Gala',
      montant: 950,
      date: '2026-02-07',
      statut: 'marche_conclu',
      note: 'Paris – 1000 pers – 22h30→5h – Adrien',
    },
    {
      id: 'p5',
      nom: 'Rallye Milly Philly',
      type: 'Rallye entier',
      montant: 650,
      date: '2026-02-14',
      statut: 'marche_conclu',
      note: 'Île Monsieur',
    },
    {
      id: 'p6',
      nom: 'Laura Van Islande',
      type: 'Mariage',
      montant: 1380,
      date: '2026-04-25',
      statut: 'marche_conclu',
      note: 'Premium – Château Bouret – Mail/WhatsApp – Côme Templier',
    },
    {
      id: 'p7',
      nom: 'frère Moreau',
      type: 'Mariage',
      montant: 1000,
      date: '2026-05-09',
      statut: 'marche_conclu',
      note: 'Plouezec Paimpol',
    },
    {
      id: 'p8',
      nom: 'Rallye Charlotte de P…',
      type: 'Rallye 1',
      montant: 767,
      date: '2026-05-30',
      statut: 'marche_conclu',
      note: '29 rue Grenelle, Paris – 300 pers – 20h→1h – Adrien',
    },
    {
      id: 'p9',
      nom: 'Bal Naval',
      type: 'Gala',
      montant: 850,
      date: '2026-06-27',
      statut: 'marche_conclu',
      note: 'École Navale – 1000 pers – Adrien',
    },
    {
      id: 'p10',
      nom: 'Benjamin Marimborg',
      type: 'Mariage',
      montant: 1450,
      date: '2026-07-04',
      statut: 'marche_conclu',
      note: 'Angerville (Essonne)',
    },
    {
      id: 'p11',
      nom: 'Louis Fraval',
      type: 'Soirée',
      montant: 1285,
      date: '2026-07-04',
      statut: 'marche_conclu',
      note: '20h→5h – Charles-de-Gaulle',
    },
    {
      id: 'p12',
      nom: 'Raphaël de Varax',
      type: 'Mariage',
      montant: 0,
      date: '2026-07-11',
      statut: 'marche_conclu',
      note: '',
    },
    {
      id: 'p13',
      nom: 'Eloi Guinamard',
      type: 'Mariage',
      montant: 1580,
      date: '2026-07-18',
      statut: 'marche_conclu',
      note: 'Beaujolais – Formule Premium – Resp Côme Templier',
    },
    {
      id: 'p14',
      nom: 'Pierre Georges',
      type: 'Mariage',
      montant: 1530,
      date: '2026-07-18',
      statut: 'marche_conclu',
      note: 'Arsenal Metz – Formule Premium – Resp Côme Templier',
    },
    {
      id: 'p15',
      nom: 'Maxime Longueau',
      type: 'Mariage',
      montant: 1650,
      date: '2026-07-18',
      statut: 'marche_conclu',
      note: 'Château de la Tronchade (Angoulême) – 300 pers – Premium – Resp Côme',
    },
    {
      id: 'p16',
      nom: 'François Kernier',
      type: '',
      montant: 0,
      date: '2026-07-25',
      statut: 'marche_conclu',
      note: 'Bruges',
    },
    {
      id: 'p17',
      nom: 'Maylis de Mentque',
      type: 'Mariage',
      montant: 1150,
      date: '2026-08-15',
      statut: 'marche_conclu',
      note: 'Château du Deffay – Resp Adrien Le Grelle',
    },
    {
      id: 'p18',
      nom: 'Raphael Boyer Vidal',
      type: 'Mariage',
      montant: 0,
      date: '2026-08-29',
      statut: 'marche_conclu',
      note: 'Bourgogne – Message – Resp Adrien Le Grelle',
    },
    {
      id: 'p19',
      nom: 'Cyprien Bodon',
      type: 'Mariage',
      montant: 1300,
      date: '2026-08-30',
      statut: 'marche_conclu',
      note: 'Avranches / Coutances – WhatsApp – Resp Adrien Le Grelle',
    },
    {
      id: 'p20',
      nom: 'Solène Le Grelle',
      type: 'Mariage',
      montant: 1550,
      date: '2026-09-19',
      statut: 'marche_conclu',
      note: 'Saint-Cast – WhatsApp – Resp Adrien Le Grelle',
    },
    {
      id: 'p21',
      nom: 'Livois (1)',
      type: 'Rallye 1',
      montant: 900,
      date: '2026-09-26',
      statut: 'marche_conclu',
      note: 'Brafle, Belgique – 2h15 – WhatsApp – Resp Adrien Le Grelle',
    },
    {
      id: 'p22',
      nom: 'La Rochefoucauld / cr…',
      type: 'Rallye 1',
      montant: 0,
      date: '2026-11-14',
      statut: 'marche_conclu',
      note: 'Bercuit, Belgique',
    },
    {
      id: 'p23',
      nom: 'Antoinette de Phily',
      type: 'Mariage',
      montant: 0,
      date: '2026-08-08',
      statut: 'devis_envoye',
      note: '',
    },
    {
      id: 'p24',
      nom: 'Loïc de La Morinière',
      type: 'Mariage',
      montant: 0,
      date: '2026-09-19',
      statut: 'devis_envoye',
      note: 'Château de Keralio',
    },
    {
      id: 'p25',
      nom: 'Camille PESME',
      type: 'Mariage',
      montant: 0,
      date: '2026-05-30',
      statut: 'devis_envoye',
      note: '',
    },
    {
      id: 'p26',
      nom: 'Clarisse Bruvier',
      type: 'Mariage',
      montant: 0,
      date: '2026-07-25',
      statut: 'devis_envoye',
      note: '',
    },
    {
      id: 'p27',
      nom: 'Bonnaille Marie-Alice',
      type: 'Mariage',
      montant: 0,
      date: '2026-08-29',
      statut: 'devis_envoye',
      note: '',
    },
    {
      id: 'p28',
      nom: 'Anne H.',
      type: 'Mariage',
      montant: 0,
      date: '2026-05-02',
      statut: 'devis_envoye',
      note: '300 dîner',
    },
    {
      id: 'p29',
      nom: 'Marguerite de Peute',
      type: 'Mariage',
      montant: 0,
      date: '2026-06-13',
      statut: 'devis_envoye',
      note: 'Candé-sur-Beuvron – devis Camille',
    },
    {
      id: 'p30',
      nom: 'Juliette Perol',
      type: 'Mariage',
      montant: 0,
      date: '2026-07-04',
      statut: 'devis_envoye',
      note: 'Château de Bresse-sur…',
    },
    {
      id: 'p31',
      nom: 'Roméo de Beauregard',
      type: 'Mariage',
      montant: 0,
      date: '2026-07-11',
      statut: 'devis_envoye',
      note: 'Près de Mauriac',
    },
    {
      id: 'p32',
      nom: 'Cyprien Fouilland',
      type: 'Mariage',
      montant: 0,
      date: '2026-08-08',
      statut: 'devis_envoye',
      note: '',
    },
    {
      id: 'p33',
      nom: 'Isaure Pluyette',
      type: 'Mariage',
      montant: 0,
      date: '2026-04-25',
      statut: 'devis_envoye',
      note: 'La Roche Thévenin (85)',
    },
    {
      id: 'p34',
      nom: 'CARICHON Noyale',
      type: 'Mariage',
      montant: 0,
      date: '2026-08-15',
      statut: 'devis_envoye',
      note: 'Château de Craon (Mayenne)',
    },
    {
      id: 'p35',
      nom: 'Enguerran de La R…',
      type: 'Mariage',
      montant: 0,
      date: '2026-06-27',
      statut: 'devis_envoye',
      note: 'Arradon, Bretagne – 300 pers',
    },
    {
      id: 'p36',
      nom: 'Rallye Coubertin',
      type: 'Rallye 1',
      montant: 350,
      date: '2025-12-06',
      statut: 'fini',
      note: 'Château de Ville-d’Avray',
    },
    {
      id: 'p37',
      nom: 'Soline de Pirey',
      type: 'Soirée',
      montant: 450,
      date: '2025-11-08',
      statut: 'fini',
      note: 'Versailles – Resp Elzear',
    },
    {
      id: 'p38',
      nom: 'Rallye Charlotte de R.',
      type: 'Rallye 1',
      montant: 767,
      date: '2026-05-30',
      statut: 'fini',
      note: '7e arrondissement, Paris – 300 pers',
    },
    {
      id: 'p39',
      nom: 'Rallye Alienor',
      type: 'Rallye 1',
      montant: 900,
      date: '2025-11-15',
      statut: 'fini',
      note: 'Cercle National (Intérallié)',
    },
    {
      id: 'p40',
      nom: 'Rallye Milly Philly',
      type: 'Rallye entier',
      montant: 650,
      date: '2025-09-27',
      statut: 'fini',
      note: '29 rue Grenelle, Paris 7',
    },
    {
      id: 'p41',
      nom: 'Marie Arnaud',
      type: 'Mariage',
      montant: 900,
      date: '2025-10-04',
      statut: 'fini',
      note: 'Château de Dommerville – 150 pers – Resp Côme',
    },
    {
      id: 'p42',
      nom: 'Rallye Milly Philly',
      type: 'Rallye entier',
      montant: 850,
      date: '2025-12-06',
      statut: 'fini',
      note: 'Jockey Club',
    },
    {
      id: 'p43',
      nom: 'Rallye (non précisé)',
      type: 'Rallye 1',
      montant: 600,
      date: '2025-12-13',
      statut: 'fini',
      note: 'Villa de Chevreloop',
    },
    {
      id: 'p44',
      nom: 'Rallye (non précisé)',
      type: 'Rallye 1',
      montant: 600,
      date: '2025-09-13',
      statut: 'fini',
      note: 'Orphelins d’Auteuil',
    },
    {
      id: 'p45',
      nom: 'Rallye Péniche',
      type: 'Rallye 1',
      montant: 750,
      date: '2025-10-11',
      statut: 'fini',
      note: 'Péniche Concorde Atlantique',
    },
    {
      id: 'p46',
      nom: 'Guillemette de Preval',
      type: 'Mariage',
      montant: 1778,
      date: '2025-11-15',
      statut: 'fini',
      note: 'Manoir du Tronchet',
    },
    {
      id: 'p47',
      nom: 'Typhaine Boyer Vidal',
      type: 'Mariage',
      montant: 1970,
      date: '2025-09-13',
      statut: 'fini',
      note: 'Bourgogne (lieu à redéfinir) – Resp Ambroise du Chazaud',
    },
    {
      id: 'p48',
      nom: 'Philippine de Preval',
      type: 'Mariage',
      montant: 1380,
      date: '2025-09-13',
      statut: 'fini',
      note: 'Saint-Rémy-lès-Chevreuse – Resp Elzear de Monspey',
    },
    {
      id: 'p49',
      nom: 'Calixte de Sorbay',
      type: 'Mariage',
      montant: 1400,
      date: '2025-09-13',
      statut: 'fini',
      note: 'Mayenne, L’Ansaudière – 250 pers – Resp Côme Templier',
    },
  ];

  const defaultPrestations = basePrestations.map((p) => ({
    ...p,
    setId: p.setId ?? null,
    prepChecklist: p.prepChecklist ?? [],
  }));

  const prestationsUndo = useUndoRedo(defaultPrestations, 50);
  const prestations = prestationsUndo.present;

  const handlePrestationsChange = useCallback(
    (newVal) => {
      const newPrestations = typeof newVal === 'function' ? newVal(prestationsUndo.present) : newVal;
      prestationsUndo.setPresent(newPrestations, { commit: true });
    },
    [prestationsUndo]
  );

  const registerUndoManager = useCallback((manager) => {
    activeUndoManagerRef.current = manager;
    setActiveUndoState(
      manager ? { canUndo: manager.canUndo, canRedo: manager.canRedo } : { canUndo: false, canRedo: false }
    );
  }, []);

  // Sauvegarder à chaque changement
  useEffect(() => {
    if (prestations.length) {
      localStorage.setItem('prestations', JSON.stringify(prestations));
    }
  }, [prestations]);

  // Enregistrer l'undo manager actif selon l'onglet
  useEffect(() => {
    if (activeTab === 'prestations') {
      registerUndoManager({
        undo: prestationsUndo.undo,
        redo: prestationsUndo.redo,
        canUndo: prestationsUndo.canUndo,
        canRedo: prestationsUndo.canRedo,
      });
    } else if (activeTab !== 'preview') {
      registerUndoManager(null);
    }
  }, [activeTab, prestationsUndo, registerUndoManager]);

  // Raccourcis clavier Undo/Redo globaux
  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = document.activeElement;
      const isEditable =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.getAttribute?.('contenteditable') === 'true';
      if (isEditable) return;

      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        activeUndoManagerRef.current?.undo?.();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        activeUndoManagerRef.current?.redo?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Inventaire : chargement + persistance (si vide ou absent, on charge la liste par défaut)
  useEffect(() => {
    const savedInventory = localStorage.getItem('inventory');
    let inv;
    if (savedInventory) {
      const parsed = JSON.parse(savedInventory);
      if (parsed?.items?.length > 0) {
        inv = {
          ...parsed,
          assignmentsByDate: parsed.assignmentsByDate || {},
          setNamesByDate: parsed.setNamesByDate || {},
          defectNotes: parsed.defectNotes || {},
          shoppingList: parsed.shoppingList || [],
          formulePresets: parsed.formulePresets || { ...DEFAULT_FORMULE_PRESETS },
        };
      } else {
        inv = {
          ...inventorySeed,
          assignmentsByDate: inventorySeed.assignmentsByDate || {},
          setNamesByDate: inventorySeed.setNamesByDate || {},
          defectNotes: {},
          shoppingList: [],
          formulePresets: { ...DEFAULT_FORMULE_PRESETS },
        };
      }
    } else {
      inv = {
        ...inventorySeed,
        assignmentsByDate: inventorySeed.assignmentsByDate || {},
        setNamesByDate: inventorySeed.setNamesByDate || {},
        defectNotes: {},
        shoppingList: [],
        formulePresets: { ...DEFAULT_FORMULE_PRESETS },
      };
    }
    setInventory(inv);
    localStorage.setItem('inventory', JSON.stringify(inv));
  }, []);

  useEffect(() => {
    if (inventory?.items?.length) {
      localStorage.setItem('inventory', JSON.stringify(inventory));
    }
  }, [inventory]);

  const handleDevisChange = (newData) => {
    setDevisData(newData);
  };

  useEffect(() => {
    const presets = (() => {
      try {
        const raw = localStorage.getItem('facturantPresets');
        return raw ? JSON.parse(raw) : {};
      } catch (e) {
        return {};
      }
    })();
    const getEntreprise = (id) => {
      if (id === 'adrien') return melodixEntreprise;
      return { nom: '', adresse: '', codePostal: '', ville: '', telephone: '', email: '', siret: '', codeAPE: '', tva: '', ...presets[id] };
    };
    setDevisData((prev) => ({ ...prev, entreprise: getEntreprise(facturant) }));
  }, [facturant]);

  const createPrestationFromDevis = () => {
    const client = devisData.client?.nom?.trim();
    if (!client) {
      alert('Renseigne au moins le nom du client pour créer une case.');
      return;
    }
    const formule = devisData.formuleChoisie;
    const total = calculerTotalDevis(devisData);
    const options = (devisData.optionsChoisies || []).map((o) => {
      const qty = Number(o.quantite) || 1;
      return `${o.label} (×${qty})`;
    });
    const noteParts = [];
    if (formule) noteParts.push(`Formule : ${formule.label}`);
    if (options.length) noteParts.push(`Options : ${options.join(', ')}`);
    if (devisData.lieuPrestation) noteParts.push(`Lieu : ${devisData.lieuPrestation}`);
    if (devisData.horairePrestation) noteParts.push(`Horaire : ${devisData.horairePrestation}`);
    if (devisData.numero) noteParts.push(`Devis n° ${devisData.numero}`);

    const newPrestation = {
      id: `p-${Date.now()}`,
      nom: client,
      type: formule?.label || '',
      montant: total,
      date: devisData.dateDebutPrestation || devisData.date || '',
      statut: 'devis_non_envoye',
      note: noteParts.join(' • '),
      setId: formule?.setId || null,
      prepChecklist: [],
      devisRef: devisData.numero || '',
      formuleChoix: formule?.label || '',
      lieu: devisData.lieuPrestation || '',
      horaire: devisData.horairePrestation || '',
    };

    handlePrestationsChange((prev) => [newPrestation, ...prev]);
    setActiveTab('prestations');
  };

  const generatePDF = async () => {
    try {
      const pdfBlob = PDFGenerator.generate(devisData, inventory);
      
      if (window.electronAPI) {
        const filename = `Devis_${devisData.numero || 'Nouveau'}_${devisData.date}.pdf`;
        // Convertir le blob en ArrayBuffer puis en array
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const result = await window.electronAPI.savePDF(
          Array.from(new Uint8Array(arrayBuffer)),
          filename
        );
        
        if (result.success) {
          alert(`Devis enregistré avec succès : ${result.path}`);
        } else if (!result.canceled) {
          alert(`Erreur lors de l'enregistrement : ${result.error}`);
        }
      } else {
        // Fallback pour le navigateur
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Devis_${devisData.numero || 'Nouveau'}_${devisData.date}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      alert(`Erreur lors de la génération du PDF : ${error.message}`);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>📄 Générateur de Devis</h1>
        <div className="header-actions">
          <button
            type="button"
            className="btn-icon"
            onClick={() => activeUndoManagerRef.current?.undo?.()}
            disabled={!activeUndoState.canUndo}
            title="Annuler (Ctrl+Z)"
          >
            ↩️
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={() => activeUndoManagerRef.current?.redo?.()}
            disabled={!activeUndoState.canRedo}
            title="Rétablir (Ctrl+Shift+Z / Ctrl+Y)"
          >
            ↪️
          </button>
          <button className="btn-primary" onClick={generatePDF}>
            💾 Générer le PDF
          </button>
          <button className="btn-secondary" onClick={createPrestationFromDevis}>
            📋 Créer une presta
          </button>
        </div>
      </header>

      <div className="tabs">
        <button 
          className={activeTab === 'form' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('form')}
        >
          📝 Formulaire
        </button>
        <button 
          className={activeTab === 'preview' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('preview')}
        >
          👁️ Aperçu
        </button>
        <button 
          className={activeTab === 'prestations' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('prestations')}
        >
          📋 Prestations
        </button>
        <button 
          className={activeTab === 'inventory' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('inventory')}
        >
          🎛️ Inventaire
        </button>
        <button 
          className={activeTab === 'compta' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('compta')}
        >
          📊 Comptabilité
        </button>
      </div>

      <main className="App-main">
        {activeTab === 'form' ? (
          <DevisForm
            devisData={devisData}
            onChange={handleDevisChange}
            inventory={inventory}
            facturant={facturant}
            onFacturantChange={setFacturant}
            onEntrepriseFill={(entreprise) =>
              setDevisData((prev) => ({ ...prev, entreprise: { ...prev.entreprise, ...entreprise } }))
            }
          />
        ) : activeTab === 'preview' ? (
          <DevisPreview
            devisData={devisData}
            inventory={inventory}
            registerUndoManager={registerUndoManager}
          />
        ) : activeTab === 'prestations' ? (
          <PrestationsView
            prestations={prestations}
            onChange={handlePrestationsChange}
            inventory={inventory}
            onInventoryChange={setInventory}
            onPreparePrestation={(presta) => {
              const date = presta?.date || new Date().toISOString().split('T')[0];
              const assignedSetIds = new Set(
                prestations
                  .filter((p) => p.date === date && p.id !== presta.id && p.setId)
                  .map((p) => p.setId)
              );
              const chosenSetId = SETS.find((s) => !assignedSetIds.has(s.id))?.id || SETS[0]?.id;

              handlePrestationsChange((prev) =>
                prev.map((p) => (p.id === presta.id ? { ...p, setId: chosenSetId } : p))
              );
              setInventory((prev) => ({
                ...prev,
                setNamesByDate: {
                  ...(prev.setNamesByDate || {}),
                  [date]: {
                    ...(prev.setNamesByDate?.[date] || {}),
                    [chosenSetId]: presta.nom || '',
                  },
                },
              }));
              setActiveTab('inventory');
              setInventoryDate(date);
            }}
          />
        ) : activeTab === 'compta' ? (
          <ComptabiliteView prestations={prestations} />
        ) : (
          <InventoryView
            inventory={inventory}
            onInventoryChange={setInventory}
            selectedDate={inventoryDate}
            onDateChange={setInventoryDate}
          />
        )}
      </main>
    </div>
  );
}

export default App;

