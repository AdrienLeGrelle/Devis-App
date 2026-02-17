# Déploiement et développement

## Voir les modifs en direct (sans relancer)

**Utilise `npm run dev:react`** — les changements apparaissent automatiquement à chaque sauvegarde.

```bash
npm run dev:react
```

Ouvre **http://localhost:3000**. Chaque sauvegarde met la page à jour.

---

## Mettre l'app sur Internet

### GitHub Pages (configuré, automatique)

Un workflow GitHub Actions est prêt. À chaque push sur `main` :

1. L'app se build
2. Elle est déployée sur GitHub Pages

**À faire une seule fois :**

1. Crée un repo GitHub (ex: `devis-app`)
2. Dans les settings du repo : **Pages** → Source : **GitHub Actions**
3. Push le code :
   ```bash
   git add .
   git commit -m "Deploy"
   git push origin main
   ```
4. L'app sera en ligne à : `https://<ton-username>.github.io/<nom-repo>/`

### Vercel (alternative)

1. [vercel.com](https://vercel.com) → Import ton repo GitHub
2. Deploy (détection automatique)
3. Chaque push redéploie

---

## Build pour Electron

```bash
npm run build
npm start
```
