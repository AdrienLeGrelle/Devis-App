import { useState, useCallback } from 'react';

const DEFAULT_MAX = 50;

/**
 * Hook générique pour Undo/Redo.
 * @param {T} initial - État initial
 * @param {number} maxSize - Nombre max d'actions dans l'historique (défaut 50)
 * @returns {{ present, setPresent, commit, undo, redo, canUndo, canRedo }}
 */
export function useUndoRedo(initial, maxSize = DEFAULT_MAX) {
  const [past, setPast] = useState([]);
  const [present, setPresentState] = useState(initial);
  const [future, setFuture] = useState([]);

  const setPresent = useCallback(
    (valueOrUpdater, options = {}) => {
      const { commit: doCommit = false } = options;
      const newValue =
        typeof valueOrUpdater === 'function' ? valueOrUpdater(present) : valueOrUpdater;

      if (doCommit) {
        setPast((p) => {
          const next = [...p, present];
          if (next.length > maxSize) next.shift();
          return next;
        });
        setFuture([]);
      }
      setPresentState(newValue);
    },
    [present, maxSize]
  );

  const commit = useCallback(() => {
    setPast((p) => {
      const next = [...p, present];
      if (next.length > maxSize) next.shift();
      return next;
    });
    setFuture([]);
  }, [present, maxSize]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [present, ...f]);
    setPresentState(prev);
  }, [past, present]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, present]);
    setPresentState(next);
  }, [future, present]);

  return {
    present,
    setPresent,
    commit,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
