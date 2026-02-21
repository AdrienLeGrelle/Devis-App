# Configuration Supabase - Synchronisation Multi-Ordinateurs

## Vue d'ensemble

L'application utilise Supabase pour synchroniser l'état global entre plusieurs ordinateurs. La synchronisation est automatique et transparente, avec un fallback sur localStorage si Supabase est indisponible.

## Configuration

### 1. Variables d'environnement locales (.env)

Ajoutez dans votre fichier `.env` à la racine du projet :

```env
REACT_APP_SUPABASE_URL=https://drtrkqbmhgekkfzgmmvj.supabase.co
REACT_APP_SUPABASE_ANON_KEY=votre_cle_anon_ici
```

**Important** : Ne commitez jamais votre `.env` avec la clé réelle dans Git.

### 2. Configuration Vercel (si déployé)

Dans les paramètres de votre projet Vercel :

1. Allez dans **Settings** → **Environment Variables**
2. Ajoutez :
   - `REACT_APP_SUPABASE_URL` = `https://drtrkqbmhgekkfzgmmvj.supabase.co`
   - `REACT_APP_SUPABASE_ANON_KEY` = votre clé anon Supabase

### 3. Structure Supabase

La table `app_state` doit exister avec cette structure :

```sql
CREATE TABLE public.app_state (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Insérer la ligne principale (sera créée automatiquement au premier démarrage)
-- INSERT INTO app_state (id, data) VALUES ('main', '{}');
```

## Fonctionnement

### Au démarrage
1. L'app charge l'état depuis Supabase (`app_state` où `id='main'`)
2. Si aucun état n'existe, l'état local actuel est sauvegardé dans Supabase
3. Si Supabase est indisponible, l'app continue avec localStorage (mode offline)

### Sauvegarde automatique
- Tous les changements d'état sont sauvegardés automatiquement dans Supabase
- Debounce de 500ms pour éviter trop de requêtes
- Les erreurs réseau sont gérées gracieusement (pas de crash)

### État synchronisé
- `devisData` : Données du devis en cours
- `formulas` : Formules disponibles
- `options` : Options disponibles
- `pricePerKm` : Prix au km
- `inventory` : Inventaire matériel complet (incluant stock commun annexe)
- `prestations` : Liste des prestations
- `facturant` : Facturant sélectionné
- `facturantPresets` : Presets des facturants

## Indicateur de synchronisation

Un petit indicateur apparaît en haut à droite de l'écran :
- **✓ Synced** : Synchronisé avec Supabase
- **⟳ Loading...** : Chargement en cours
- **⚠ Offline** : Mode hors ligne (localStorage uniquement)

## Tests

### Test local
```bash
# 1. Ajouter votre clé dans .env
echo "REACT_APP_SUPABASE_ANON_KEY=votre_cle" >> .env

# 2. Démarrer l'app
npm run dev:react

# 3. Vérifier la console pour les logs de synchronisation
# 4. Modifier des données et vérifier qu'elles sont sauvegardées
```

### Test multi-ordinateurs
1. Ouvrir l'app sur Ordinateur A
2. Modifier des données (formule, inventaire, etc.)
3. Attendre quelques secondes (sauvegarde debounced)
4. Ouvrir l'app sur Ordinateur B
5. Vérifier que les modifications apparaissent

## Dépannage

### L'app ne se synchronise pas
- Vérifier que les variables d'environnement sont bien définies
- Vérifier la console du navigateur pour les erreurs
- Vérifier que la table `app_state` existe dans Supabase

### Erreur "Supabase non configuré"
- Vérifier que `.env` contient bien `REACT_APP_SUPABASE_URL` et `REACT_APP_SUPABASE_ANON_KEY`
- Redémarrer le serveur de développement après modification de `.env`

### Mode offline permanent
- Vérifier votre connexion internet
- Vérifier que l'URL Supabase est correcte
- Vérifier les logs dans la console du navigateur

## Sécurité

- La clé **anon key** est publique et peut être exposée côté client
- Elle est limitée par les Row Level Security (RLS) de Supabase
- Configurez RLS dans Supabase pour restreindre l'accès si nécessaire
