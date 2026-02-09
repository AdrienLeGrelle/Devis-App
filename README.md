# 📄 Devis App - Générateur de Devis Automatiques

Application desktop pour Mac permettant de créer et générer des devis professionnels en PDF.

## 🚀 Fonctionnalités

- ✅ Création de devis avec formulaire intuitif
- ✅ Gestion des informations entreprise et client
- ✅ Ajout de multiples articles avec calcul automatique
- ✅ Calcul automatique des totaux HT, TVA et TTC
- ✅ Aperçu en temps réel du devis
- ✅ Génération de PDF professionnel
- ✅ Interface moderne et responsive
- ✅ Application native pour macOS

## 📦 Installation

### Prérequis
- Node.js (version 16 ou supérieure)
- npm ou yarn

### Étapes d'installation

1. Installer les dépendances :
```bash
npm install
```

2. Lancer l'application en mode développement :
```bash
npm run dev
```

3. Pour créer une version de production :
```bash
npm run build:mac
```

## 🎯 Utilisation

1. **Remplir les informations du devis** :
   - Numéro de devis
   - Date et validité
   - Informations de votre entreprise
   - Informations du client

2. **Ajouter des articles** :
   - Description
   - Quantité
   - Prix unitaire HT
   - Taux de TVA

3. **Vérifier l'aperçu** :
   - Consulter l'onglet "Aperçu" pour voir le rendu final

4. **Générer le PDF** :
   - Cliquer sur "Générer le PDF"
   - Choisir l'emplacement de sauvegarde
   - Le PDF est automatiquement généré avec toutes les informations

## 🛠️ Technologies utilisées

- **Electron** : Framework pour applications desktop
- **React** : Bibliothèque JavaScript pour l'interface
- **jsPDF** : Génération de fichiers PDF
- **date-fns** : Gestion des dates

## 📝 Structure du projet

```
devis-app/
├── main.js              # Processus principal Electron
├── preload.js           # Script de préchargement
├── package.json         # Configuration npm
├── public/              # Fichiers publics
├── src/
│   ├── components/      # Composants React
│   ├── utils/           # Utilitaires (générateur PDF)
│   ├── App.js           # Composant principal
│   └── index.js         # Point d'entrée
└── build/               # Build de production
```

## 🎨 Personnalisation

Vous pouvez personnaliser :
- Les couleurs dans `src/App.css` et `src/components/*.css`
- Le format du PDF dans `src/utils/PDFGenerator.js`
- Les champs du formulaire dans les composants

## 📄 Licence

MIT

## 👨‍💻 Support

Pour toute question ou problème, n'hésitez pas à ouvrir une issue.


