# Checklist stable layout

À exécuter manuellement après chaque feature pour vérifier que le core n'est pas cassé.

## Tests obligatoires

- [ ] **Drag bloc sur page 1** : Glisser un bloc (via ⋮⋮) => le bloc suit le curseur correctement
- [ ] **Drag image** : Glisser une image collée => OK
- [ ] **Resize image** : Redimensionner une image (coins) => OK
- [ ] **Ctrl+V** : Coller une image en mode édition => l'image apparaît
- [ ] **Quitter édition** : Cliquer "Terminer" => aucun cadre/cadre de bloc visible
- [ ] **Scroll** : Défiler les pages => OK
- [ ] **Print** : Imprimer/Export PDF => pages correctes

## Ordre de réintégration des features

1. **Sidebar thumbnails** (affichage uniquement, non interactif) => 0 impact drag
2. **Auto-ajout de pages** (uniquement ajout, pas de reflow) => 0 impact drag
3. **Cross-page drag** (blocs uniquement) => plus risqué, en dernier

## Règle

Si une feature casse le drag → **revert immédiatement**.
