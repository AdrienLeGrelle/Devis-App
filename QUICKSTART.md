# 🚀 Guide de Démarrage Rapide

## Installation et Lancement

### 1. Installer les dépendances
```bash
npm install
```

### 2. Lancer l'application en mode développement
```bash
npm run dev
```

Cette commande va :
- Démarrer le serveur React sur http://localhost:3000
- Lancer Electron automatiquement

### 3. Créer une version exécutable pour Mac
```bash
npm run build:mac
```

Le fichier `.dmg` sera créé dans le dossier `dist/`.

## Utilisation

1. **Remplir le formulaire** avec vos informations
2. **Ajouter des articles** (cliquez sur "+ Ajouter un article")
3. **Vérifier l'aperçu** dans l'onglet "Aperçu"
4. **Générer le PDF** en cliquant sur "Générer le PDF"

## Notes importantes

- L'application fonctionne entièrement en local sur votre Mac
- Aucune connexion internet n'est nécessaire après l'installation
- Les PDF sont sauvegardés où vous le souhaitez sur votre ordinateur

## Dépannage

Si vous rencontrez des erreurs lors de l'installation :
```bash
rm -rf node_modules package-lock.json
npm install
```

Pour une installation propre :
```bash
npm ci
```


