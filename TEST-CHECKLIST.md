# Checklist de tests - DevisPreview Multi-pages

## Tests de base (drag & drop)

- [ ] **Drag bloc sur même page** : Glisser un bloc via la poignée bleue → le bloc (cadre + contenu) bouge ensemble, pas de décalage
- [ ] **Drop sur même page** : Lâcher le bloc → la position est conservée après le lâcher
- [ ] **Reload après drop** : Recharger la page → les positions sont restaurées depuis localStorage
- [ ] **Drag bloc page 1 → page 2** : Glisser un bloc vers le bas, dépasser la page 1 → le bloc passe sur page 2 automatiquement
- [ ] **Drag bloc page 2 → page 1** : Glisser un bloc vers le haut depuis page 2 → le bloc passe sur page 1 automatiquement
- [ ] **Drop entre pages** : Lâcher un bloc sur une autre page → le bloc reste sur la page cible avec les bonnes coordonnées

## Tests images

- [ ] **Ctrl+V image** : Coller une image en mode édition → l'image apparaît au centre de la page visible
- [ ] **Drag image** : Déplacer une image → elle suit le curseur correctement
- [ ] **Resize image** : Redimensionner une image (coins) → la taille est conservée
- [ ] **Image page 1 → page 2** : Déplacer une image vers page 2 → elle change de pageIndex
- [ ] **Supprimer image** : Cliquer sur × → l'image disparaît

## Tests mode édition

- [ ] **Activer mode édition** : Cliquer "Modifier la mise en page" → tous les blocs affichent cadre pointillé + poignée
- [ ] **Désactiver mode édition** : Cliquer "Terminer" → aucun cadre/poignée visible, rendu identique à avant
- [ ] **Pas de ghost** : En mode édition, aucun overlay séparé ne bouge indépendamment du contenu

## Tests multi-pages

- [ ] **Ajouter page** : Cliquer "+ Ajouter une page" → une nouvelle page vide apparaît
- [ ] **Pages multiples** : Avoir plusieurs pages → toutes sont visibles, empilées verticalement
- [ ] **Blocs sur différentes pages** : Déplacer des blocs sur page 1, 2, 3 → chaque bloc reste sur sa page assignée
- [ ] **Z-index correct** : Les blocs sont toujours au-dessus des pages (pas de bloc qui passe sous une page)

## Tests auto-pagination

- [ ] **Contenu qui grandit** : Ajouter beaucoup de texte dans les notes → si ça dépasse, le bloc passe automatiquement sur page suivante
- [ ] **Table qui grandit** : Ajouter beaucoup de lignes dans le tableau → si ça dépasse, création page suivante
- [ ] **Pas de contenu coupé** : Aucun contenu ne disparaît sous une page

## Tests undo/redo

- [ ] **Ctrl+Z après drag** : Déplacer un bloc, puis Ctrl+Z → le bloc revient à sa position précédente
- [ ] **Ctrl+Y après undo** : Après Ctrl+Z, faire Ctrl+Y → le bloc revient à la nouvelle position
- [ ] **Undo image** : Déplacer une image, Ctrl+Z → l'image revient en arrière
- [ ] **30 actions** : Faire 30+ actions → l'historique garde les 30 dernières (ring buffer)

## Tests persistance

- [ ] **Sauvegarde auto** : Déplacer un bloc → après 300ms, vérifier localStorage → les positions sont sauvegardées
- [ ] **Reload complet** : Fermer et rouvrir l'app → toutes les positions (blocs + images) sont restaurées
- [ ] **Réinitialiser** : Cliquer "Réinitialiser" → toutes les positions reviennent à zéro

## Tests visuels

- [ ] **Rendu normal identique** : Hors mode édition, le rendu est identique à l'ancienne version (même styles, mêmes tailles)
- [ ] **Print/PDF** : Cliquer "Imprimer" → les pages s'impriment correctement, pas de cadres visibles
- [ ] **Pas de bordure images** : Hors mode édition, les images n'ont aucune bordure bleue

## Tests edge cases

- [ ] **Bloc sur page inexistante** : Si un bloc a pageIndex=5 mais seulement 2 pages → créer les pages manquantes
- [ ] **Drag très rapide** : Déplacer rapidement un bloc entre pages → pas de lag, transition fluide
- [ ] **Multiples blocs même position** : Placer plusieurs blocs au même endroit → ils se superposent correctement (z-index)
