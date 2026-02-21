import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import './App.css';
import DevisForm from './components/DevisForm';
import DevisPreview from './components/DevisPreview';
import { calculerTotalDevis } from './utils/devisUtils';
import { captureAndDownloadPdf } from './utils/pdfFromPreview';
import PrestationsView from './components/PrestationsView';
import InventoryView from './components/InventoryView';
import ComptabiliteView from './components/ComptabiliteView';
import inventorySeed from './data/inventory.json';
import { SETS, DEFAULT_FORMULE_PRESETS } from './utils/inventoryAssignments';
import { initializeStockCommunAnnexe } from './utils/stockCommunAnnexe';
import { melodixEntreprise } from './config/melodix';
import { useUndoRedo } from './hooks/useUndoRedo';
import { migrateMarcheConcluToFini } from './utils/prestationsUtils';
import { loadStateFromSupabase, createDebouncedSave, serializeAppState } from './services/appStateSync';
import { saveAppState, isSupabaseAvailable } from './services/appStateApi';

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
      prenom: '',
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
  const previewPdfRef = useRef(null);
  const [syncStatus, setSyncStatus] = useState('loading'); // 'loading' | 'synced' | 'offline'
  const syncStatusRef = useRef('loading'); // Ref pour éviter les boucles
  const debouncedSaveRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const hasHydratedRef = useRef(false);
  const isHydratingRef = useRef(false);
  const prestationsUndoRef = useRef(null);

  // Gestion des formules (CRUD + persistance localStorage)
  const DEFAULT_FORMULAS = [
    {
      id: 'classique',
      label: 'Formule Classique',
      prixTTC: 1200,
      description: '',
      isActive: true,
      breakdown: [
        { id: 'dj-1', label: 'Prestation DJ', amountTTC: 600 },
        { id: 'materiel-1', label: 'Matériel (son + lumière)', amountTTC: 600 },
      ],
    },
    {
      id: 'premium',
      label: 'Formule Premium',
      prixTTC: 1450,
      description: '',
      isActive: true,
      breakdown: [
        { id: 'dj-2', label: 'Prestation DJ', amountTTC: 750 },
        { id: 'materiel-2', label: 'Matériel (son + lumière)', amountTTC: 700 },
      ],
    },
    {
      id: 'excellence',
      label: 'Formule Excellence',
      prixTTC: 1750,
      description: '',
      isActive: true,
      breakdown: [
        { id: 'dj-3', label: 'Prestation DJ', amountTTC: 900 },
        { id: 'materiel-3', label: 'Matériel (son + lumière)', amountTTC: 850 },
      ],
    },
  ];
  const FORMULAS_STORAGE_KEY = 'melodix_formulas';

  const [formulas, setFormulas] = useState(() => {
    try {
      const raw = localStorage.getItem(FORMULAS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_FORMULAS;
    } catch (e) {
      return DEFAULT_FORMULAS;
    }
  });

  useEffect(() => {
    localStorage.setItem(FORMULAS_STORAGE_KEY, JSON.stringify(formulas));
  }, [formulas]);

  const handleSaveFormula = useCallback((formula) => {
    setFormulas((prev) => {
      const idx = prev.findIndex((f) => f.id === formula.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = formula;
        return next;
      }
      return [...prev, formula];
    });
  }, []);

  const handleDeleteFormula = useCallback((formulaId) => {
    // Note: on ne vérifie pas si la formule est utilisée car les devis stockent un snapshot
    setFormulas((prev) => prev.filter((f) => f.id !== formulaId));
    return { success: true };
  }, []);

  // Gestion des options (CRUD + persistance localStorage)
  const DEFAULT_OPTIONS = [
    { id: 'photobooth-400', label: 'PHOTOBOOTH 400', prixTTC: 580, category: '', isActive: true },
    { id: 'photobooth-800', label: 'PHOTOBOOTH 800', prixTTC: 650, category: '', isActive: true },
    { id: 'photobooth-no-limit', label: 'PHOTOBOOTH NO LIMIT', prixTTC: 750, category: '', isActive: true },
    { id: 'pars-led-batterie', label: '6 PARS LED BATTERIE', prixTTC: 80, category: 'Éclairage', isActive: true },
    { id: 'bar-lasers-rouge', label: 'BAR LASERS ROUGE', prixTTC: 120, category: 'Éclairage', isActive: true },
    { id: 'stroboscope', label: 'STROBOSCOPE', prixTTC: 80, category: 'Éclairage', isActive: true },
  ];
  const OPTIONS_STORAGE_KEY = 'melodix_options';

  const [options, setOptions] = useState(() => {
    try {
      const raw = localStorage.getItem(OPTIONS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_OPTIONS;
    } catch (e) {
      return DEFAULT_OPTIONS;
    }
  });

  useEffect(() => {
    localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(options));
  }, [options]);

  const handleSaveOption = useCallback((option) => {
    setOptions((prev) => {
      const idx = prev.findIndex((o) => o.id === option.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = option;
        return next;
      }
      return [...prev, option];
    });
  }, []);

  const handleDeleteOption = useCallback((optionId) => {
    setOptions((prev) => prev.filter((o) => o.id !== optionId));
    return { success: true };
  }, []);

  // Gestion du prix au km (persistance localStorage)
  const DEFAULT_PRICE_PER_KM = 0.60;
  const PRICE_PER_KM_STORAGE_KEY = 'melodix_price_per_km';

  const [pricePerKm, setPricePerKm] = useState(() => {
    try {
      const raw = localStorage.getItem(PRICE_PER_KM_STORAGE_KEY);
      const parsed = raw ? parseFloat(raw) : null;
      return parsed != null && !isNaN(parsed) && parsed >= 0 ? parsed : DEFAULT_PRICE_PER_KM;
    } catch (e) {
      return DEFAULT_PRICE_PER_KM;
    }
  });

  useEffect(() => {
    localStorage.setItem(PRICE_PER_KM_STORAGE_KEY, pricePerKm.toString());
  }, [pricePerKm]);

  const handleSavePricePerKm = useCallback((value) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed >= 0) {
      setPricePerKm(Math.round(parsed * 100) / 100); // arrondi à 2 décimales
    }
  }, []);

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

  const initialPrestations = React.useMemo(() => {
    try {
      const raw = localStorage.getItem('prestations');
      const parsed = raw ? JSON.parse(raw) : null;
      const base =
        parsed && Array.isArray(parsed) && parsed.length > 0
          ? parsed.map((p) => ({ ...p, setId: p.setId ?? null, prepChecklist: p.prepChecklist ?? [] }))
          : defaultPrestations;
      const { prestations: migrated } = migrateMarcheConcluToFini(base);
      return migrated;
    } catch (e) {
      return defaultPrestations;
    }
  }, []);

  const prestationsUndo = useUndoRedo(initialPrestations, 50);
  const prestations = prestationsUndo.present;
  prestationsUndoRef.current = prestationsUndo;

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

  // Vérification périodique : Marché conclu → Fini si date passée (toutes les 5 min)
  const prestationsRef = useRef(prestations);
  prestationsRef.current = prestations;
  useEffect(() => {
    const runMigration = () => {
      const { prestations: migrated, changed } = migrateMarcheConcluToFini(prestationsRef.current);
      if (changed) {
        handlePrestationsChange(migrated);
      }
    };
    const interval = setInterval(runMigration, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [handlePrestationsChange]);

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

  // Initialisation : Chargement depuis Supabase au démarrage (UNE SEULE FOIS)
  useEffect(() => {
    // Garde-fou : ne pas exécuter si déjà hydraté
    if (hasHydratedRef.current) {
      return;
    }
    
    let mounted = true;
    isHydratingRef.current = true;
    
    const initializeFromSupabase = async () => {
      if (!isSupabaseAvailable()) {
        console.log('[AppState] Supabase non disponible, utilisation du localStorage local');
        syncStatusRef.current = 'offline';
        setSyncStatus('offline');
        isInitialLoadRef.current = false;
        hasHydratedRef.current = true;
        isHydratingRef.current = false;
        return;
      }

      try {
        // État par défaut depuis localStorage
        const defaultState = {
          devisData: (() => {
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
              entreprise: { nom: '', adresse: '', codePostal: '', ville: '', telephone: '', email: '', siret: '', codeAPE: '', tva: '' },
              client: { prenom: '', nom: '', adresse: '', codePostal: '', ville: '', telephone: '', email: '' },
              notes: '',
              conditions: 'Paiement à réception de facture. Délai de paiement : 30 jours.'
            };
          })(),
          formulas: (() => {
            try {
              const raw = localStorage.getItem('melodix_formulas');
              const parsed = raw ? JSON.parse(raw) : null;
              return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_FORMULAS;
            } catch (e) {
              return DEFAULT_FORMULAS;
            }
          })(),
          options: (() => {
            try {
              const raw = localStorage.getItem('melodix_options');
              const parsed = raw ? JSON.parse(raw) : null;
              return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_OPTIONS;
            } catch (e) {
              return DEFAULT_OPTIONS;
            }
          })(),
          pricePerKm: (() => {
            try {
              const raw = localStorage.getItem('melodix_price_per_km');
              const parsed = raw ? parseFloat(raw) : null;
              return parsed != null && !isNaN(parsed) && parsed >= 0 ? parsed : DEFAULT_PRICE_PER_KM;
            } catch (e) {
              return DEFAULT_PRICE_PER_KM;
            }
          })(),
          inventory: (() => {
            try {
              const raw = localStorage.getItem('inventory');
              return raw ? JSON.parse(raw) : { items: [], sets: [] };
            } catch (e) {
              return { items: [], sets: [] };
            }
          })(),
          prestations: (() => {
            try {
              const raw = localStorage.getItem('prestations');
              return raw ? JSON.parse(raw) : [];
            } catch (e) {
              return [];
            }
          })(),
          facturant: (() => {
            try {
              return localStorage.getItem('facturant') || 'adrien';
            } catch (e) {
              return 'adrien';
            }
          })(),
          facturantPresets: (() => {
            try {
              const raw = localStorage.getItem('facturantPresets');
              return raw ? JSON.parse(raw) : {};
            } catch (e) {
              return {};
            }
          })(),
        };

        const loadedState = await loadStateFromSupabase(defaultState);
        
        if (!mounted) return;

        if (loadedState) {
          // Hydrater depuis Supabase
          console.log('[AppState] État chargé depuis Supabase, hydratation...');
          
          // IMPORTANT: isHydratingRef.current = true empêche la sauvegarde automatique
          // Mettre à jour tous les états en batch (React les batch automatiquement)
          // Ces setState ne déclencheront PAS la sauvegarde car le useEffect de sauvegarde vérifie isHydratingRef
          
          // Comparer avant de setState pour éviter les updates inutiles
          const shouldUpdateDevis = JSON.stringify(devisData) !== JSON.stringify(loadedState.devisData);
          const shouldUpdateFormulas = JSON.stringify(formulas) !== JSON.stringify(loadedState.formulas);
          const shouldUpdateOptions = JSON.stringify(options) !== JSON.stringify(loadedState.options);
          const shouldUpdatePricePerKm = pricePerKm !== loadedState.pricePerKm;
          const shouldUpdateFacturant = facturant !== loadedState.facturant;
          
          if (shouldUpdateDevis) setDevisData(loadedState.devisData);
          if (shouldUpdateFormulas) setFormulas(loadedState.formulas);
          if (shouldUpdateOptions) setOptions(loadedState.options);
          if (shouldUpdatePricePerKm) setPricePerKm(loadedState.pricePerKm);
          if (shouldUpdateFacturant) setFacturant(loadedState.facturant);
          
          // Inventory nécessite une initialisation spéciale
          if (loadedState.inventory && (loadedState.inventory.items || loadedState.inventory.socleCommun)) {
            const inv = initializeStockCommunAnnexe(loadedState.inventory);
            const shouldUpdateInventory = JSON.stringify(inventory) !== JSON.stringify(inv);
            if (shouldUpdateInventory) {
              setInventory(inv);
              localStorage.setItem('inventory', JSON.stringify(inv));
            }
          }
          
          // Prestations
          if (loadedState.prestations && Array.isArray(loadedState.prestations) && loadedState.prestations.length > 0) {
            const { prestations: migrated } = migrateMarcheConcluToFini(loadedState.prestations);
            localStorage.setItem('prestations', JSON.stringify(migrated));
            // Appliquer via le ref après que prestationsUndo soit créé
            setTimeout(() => {
              if (prestationsUndoRef.current && mounted) {
                prestationsUndoRef.current.setPresent(migrated, { commit: false });
              }
            }, 100);
          }
          
          // Facturant presets
          if (loadedState.facturantPresets) {
            localStorage.setItem('facturantPresets', JSON.stringify(loadedState.facturantPresets));
          }
          
          syncStatusRef.current = 'synced';
          setSyncStatus('synced');
          console.log('[AppState] ✓ Hydratation terminée');
        } else {
          // Pas d'état dans Supabase, initialiser avec l'état local actuel
          console.log('[AppState] Aucun état dans Supabase, initialisation avec l\'état local');
          
          // Utiliser defaultState au lieu des états React (qui peuvent être vides au premier render)
          const currentState = serializeAppState({
            devisData: defaultState.devisData,
            formulas: defaultState.formulas,
            options: defaultState.options,
            pricePerKm: defaultState.pricePerKm,
            inventory: defaultState.inventory,
            prestations: defaultState.prestations,
            facturant: defaultState.facturant,
            facturantPresets: defaultState.facturantPresets,
          });
          
          // Sauvegarder directement (pas via debounce) car c'est l'initialisation
          // isHydratingRef est toujours true ici, donc pas de conflit
          const saved = await saveAppState(currentState);
          const newStatus = saved ? 'synced' : 'offline';
          syncStatusRef.current = newStatus;
          setSyncStatus(newStatus);
          if (saved) {
            console.log('[AppState] ✓ État local sauvegardé dans Supabase');
          }
        }
      } catch (error) {
        console.error('[AppState] Erreur lors de l\'initialisation:', error);
        syncStatusRef.current = 'offline';
        setSyncStatus('offline');
      } finally {
        if (mounted) {
          // IMPORTANT: Marquer l'hydratation comme terminée APRÈS tous les setState
          // Cela garantit que le useEffect de sauvegarde ne se déclenchera pas
          isInitialLoadRef.current = false;
          isHydratingRef.current = false;
          // Marquer hasHydrated APRÈS avoir fini l'hydratation
          setTimeout(() => {
            hasHydratedRef.current = true;
            console.log('[AppState] ✓ Hydratation complète, sauvegarde automatique activée');
          }, 100);
        }
      }
    };

    // Attendre un peu pour que tous les hooks soient initialisés
    setTimeout(() => {
      initializeFromSupabase();
    }, 100);

    return () => {
      mounted = false;
    };
  }, []); // Seulement au montage - dépendances vides pour exécution unique

  // Initialiser le debounced save
  useEffect(() => {
    debouncedSaveRef.current = createDebouncedSave(500);
  }, []);

  // Mémoriser facturantPresets pour éviter les recréations (lu depuis localStorage, stable)
  const facturantPresets = useMemo(() => {
    try {
      const raw = localStorage.getItem('facturantPresets');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }, []); // Ne dépend de rien, lu depuis localStorage une seule fois

  // Créer un objet stable pour la persistance (useMemo pour éviter les recréations)
  const stateToPersist = useMemo(() => {
    return {
      devisData,
      formulas,
      options,
      pricePerKm,
      inventory,
      prestations,
      facturant,
      facturantPresets,
    };
  }, [devisData, formulas, options, pricePerKm, inventory, prestations, facturant, facturantPresets]);

  // Sauvegarde automatique vers Supabase à chaque changement d'état
  useEffect(() => {
    // GARDE-FOUS STRICTS pour éviter toute boucle :
    // 1. Ne pas sauvegarder pendant le chargement initial
    // 2. Ne pas sauvegarder si pas encore hydraté
    // 3. Ne pas sauvegarder si en cours d'hydratation
    // 4. Ne pas sauvegarder si debounce non initialisé
    if (isInitialLoadRef.current || !hasHydratedRef.current || isHydratingRef.current || !debouncedSaveRef.current) {
      return;
    }

    // Sauvegarder via debounce (ne fait PAS de setState, donc pas de boucle)
    debouncedSaveRef.current(stateToPersist, (success) => {
      // Le callback met à jour syncStatus via ref ET useState pour éviter les boucles
      const newStatus = success ? 'synced' : 'offline';
      if (syncStatusRef.current !== newStatus) {
        syncStatusRef.current = newStatus;
        setSyncStatus(newStatus);
      }
    });
  }, [stateToPersist]); // Dépend uniquement de l'objet stable

  // Inventaire : chargement + persistance (si vide ou absent, on charge la liste par défaut)
  // IMPORTANT: Ne s'exécute QUE si pas encore hydraté depuis Supabase
  useEffect(() => {
    // Ne pas réinitialiser si déjà chargé depuis Supabase ou si en cours d'hydratation
    if (!isInitialLoadRef.current || hasHydratedRef.current || isHydratingRef.current) {
      return;
    }
    
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
          socleCommun: parsed.socleCommun || {},
        };
        // Initialiser le stock commun annexe si manquant
        inv = initializeStockCommunAnnexe(inv);
      } else {
        inv = {
          ...inventorySeed,
          assignmentsByDate: inventorySeed.assignmentsByDate || {},
          setNamesByDate: inventorySeed.setNamesByDate || {},
          defectNotes: {},
          shoppingList: [],
          formulePresets: { ...DEFAULT_FORMULE_PRESETS },
          socleCommun: {},
        };
        // Initialiser le stock commun annexe
        inv = initializeStockCommunAnnexe(inv);
      }
    } else {
      inv = {
        ...inventorySeed,
        assignmentsByDate: inventorySeed.assignmentsByDate || {},
        setNamesByDate: inventorySeed.setNamesByDate || {},
        defectNotes: {},
        shoppingList: [],
        formulePresets: { ...DEFAULT_FORMULE_PRESETS },
        socleCommun: {},
      };
      // Initialiser le stock commun annexe
      inv = initializeStockCommunAnnexe(inv);
    }
    setInventory(inv);
    localStorage.setItem('inventory', JSON.stringify(inv));
  }, []);

  // Persistance inventory dans localStorage (seulement si pas en cours d'hydratation)
  useEffect(() => {
    // Ne pas sauvegarder pendant l'hydratation Supabase
    if (isHydratingRef.current || !hasHydratedRef.current) {
      return;
    }
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
    const newEntreprise = getEntreprise(facturant);
    setDevisData((prev) => {
      // Comparer avant de mettre à jour pour éviter les updates inutiles
      const currentEntreprise = prev.entreprise || {};
      const entreprisesEqual = JSON.stringify(currentEntreprise) === JSON.stringify(newEntreprise);
      if (entreprisesEqual) {
        return prev; // Pas de changement, retourner l'objet précédent
      }
      return { ...prev, entreprise: newEntreprise };
    });
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
      setId: null,
      prepChecklist: [],
      lieu: devisData.lieuPrestation || '',
      horaire: devisData.horairePrestation || '',
    };

    handlePrestationsChange((prev) => [newPrestation, ...prev]);
    setActiveTab('prestations');
  };

  const generatePDF = useCallback(async () => {
    setActiveTab('preview');
    await new Promise((r) => setTimeout(r, 450));
    const el = previewPdfRef.current;
    if (!el) return;
    const num = devisData?.numero || 'devis';
    const date = devisData?.date ? new Date(devisData.date).toISOString().slice(0, 10) : '';
    await captureAndDownloadPdf(el, `Devis_${num}_${date}.pdf`);
  }, [devisData?.numero, devisData?.date]);

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

      {/* Indicateur de synchronisation (optionnel, discret) */}
      {isSupabaseAvailable() && (
        <div className="sync-indicator" title={`Synchronisation: ${syncStatus === 'synced' ? 'Synchronisé' : syncStatus === 'loading' ? 'Chargement...' : 'Hors ligne'}`}>
          {syncStatus === 'synced' && '✓ Synced'}
          {syncStatus === 'loading' && '⟳ Loading...'}
          {syncStatus === 'offline' && '⚠ Offline'}
        </div>
      )}
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
            formulas={formulas}
            onSaveFormula={handleSaveFormula}
            onDeleteFormula={handleDeleteFormula}
            options={options}
            onSaveOption={handleSaveOption}
            onDeleteOption={handleDeleteOption}
            pricePerKm={pricePerKm}
            onSavePricePerKm={handleSavePricePerKm}
          />
        ) : activeTab === 'preview' ? (
          <DevisPreview
            ref={previewPdfRef}
            devisData={devisData}
            inventory={inventory}
            registerUndoManager={registerUndoManager}
            pricePerKm={pricePerKm}
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

