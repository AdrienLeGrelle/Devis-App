import React, { useRef, useCallback, useState, useEffect } from 'react';

const PAGE_PADDING = 40;

/**
 * Composant de drag custom avec Pointer Events.
 * Version simplifiée et robuste :
 * - drag visuel géré en interne (state local)
 * - onDrag/onDragStop appelés avec les nouvelles coords (pour sauvegarde)
 * - pas d'écouteurs globaux complexes.
 */
function DraggableBlock({
  id,
  children,
  pageRef,
  baseX,
  baseY,
  measuredX,
  measuredY,
  width,
  height,
  currentX,
  currentY,
  onDragStart,
  onDrag,
  onDragStop,
  handleSelector = '.layout-drag-handle',
  cancelSelector = 'input,textarea,select,button,a',
  contentWidth,
  contentHeight,
  footerHeight,
  editMode = true,
}) {
  const blockRef = useRef(null);
  const dragStateRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Position visuelle courante du cadre (transform)
  const [pos, setPos] = useState({
    x: currentX || 0,
    y: currentY || 0,
  });

  // Si le parent met à jour la position (par ex. après reload), on resynchronise
  useEffect(() => {
    setPos({
      x: currentX || 0,
      y: currentY || 0,
    });
  }, [currentX, currentY]);

  // Position du pointeur dans le canvas (coords contenu, origine en haut/gauche de la page intérieure)
  // pageRef peut être une ref ({ current: el }) ou l'élément DOM directement
  const getPointerInCanvas = useCallback(
    (e) => {
      const pageEl = pageRef && (pageRef.current ?? pageRef);
      if (!pageEl || !pageEl.getBoundingClientRect) return { x: 0, y: 0 };

      const canvasRect = pageEl.getBoundingClientRect();

      const scaleX = canvasRect.width / pageEl.offsetWidth || 1;
      const scaleY = canvasRect.height / pageEl.offsetHeight || 1;

      const pointerX = (e.clientX - canvasRect.left - PAGE_PADDING) / scaleX;
      const pointerY = (e.clientY - canvasRect.top - PAGE_PADDING) / scaleY;

      return { x: pointerX, y: pointerY };
    },
    [pageRef]
  );

  const handlePointerDown = useCallback(
    (e) => {
      if (!editMode) return;

      const handle = e.target.closest(handleSelector);
      const isOnFrame = e.target.closest('.layout-overlay-frame');
      if (!handle && !isOnFrame) return;

      if (e.target.closest(cancelSelector)) return;

      e.preventDefault();
      e.stopPropagation();

      const { x: pointerX, y: pointerY } = getPointerInCanvas(e);

      // Position actuelle du bloc dans le canvas
      const blockX = (measuredX ?? (baseX + pos.x));
      const blockY = (measuredY ?? (baseY + pos.y));

      dragStateRef.current = {
        offsetX: pointerX - blockX,
        offsetY: pointerY - blockY,
        baseX,
        baseY,
      };

      isDraggingRef.current = true;

      if (blockRef.current && blockRef.current.setPointerCapture) {
        blockRef.current.setPointerCapture(e.pointerId);
      }

      document.body.style.userSelect = 'none';

      if (onDragStart) {
        onDragStart(id);
      }
    },
    [id, editMode, handleSelector, cancelSelector, getPointerInCanvas, baseX, baseY, measuredX, measuredY, pos.x, pos.y, onDragStart]
  );

  const clampToCanvas = useCallback(
    (x, y) => {
      const maxX = Math.max(0, (contentWidth || 714) - (width || 0));
      const maxY = Math.max(0, (contentHeight || 1093) - (footerHeight || 30) - (height || 0));
      return {
        x: Math.max(0, Math.min(maxX, x)),
        y: Math.max(0, Math.min(maxY, y)),
      };
    },
    [contentWidth, contentHeight, footerHeight, width, height]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDraggingRef.current || !dragStateRef.current) return;

      e.preventDefault();
      e.stopPropagation();

      const { x: pointerX, y: pointerY } = getPointerInCanvas(e);
      const state = dragStateRef.current;

      // Position absolue du coin haut-gauche du bloc dans le canvas
      const absX = pointerX - state.offsetX;
      const absY = pointerY - state.offsetY;

      // Position relative utilisée par le transform (par rapport à baseX/baseY)
      let newX = absX - state.baseX;
      let newY = absY - state.baseY;

      const clamped = clampToCanvas(newX, newY);
      newX = clamped.x;
      newY = clamped.y;

      setPos({ x: newX, y: newY });

      if (onDrag) {
        onDrag(id, newX, newY, e);
      }
    },
    [getPointerInCanvas, clampToCanvas, onDrag, id]
  );

  const handlePointerUp = useCallback(
    (e) => {
      if (!isDraggingRef.current) return;

      e.preventDefault();
      e.stopPropagation();

      if (blockRef.current && blockRef.current.releasePointerCapture) {
        try {
          blockRef.current.releasePointerCapture(e.pointerId);
        } catch (err) {
          // ignore
        }
      }

      document.body.style.userSelect = '';

      isDraggingRef.current = false;

      if (dragStateRef.current) {
        const { x, y } = pos;
        const clamped = clampToCanvas(x, y);
        if (onDragStop) {
          onDragStop(id, clamped.x, clamped.y, e);
        }
      }

      dragStateRef.current = null;
    },
    [clampToCanvas, id, onDragStop, pos]
  );

  return (
    <div
      ref={blockRef}
      className="draggable-block-wrapper"
      style={{
        position: 'absolute',
        left: baseX,
        top: baseY,
        width: width,
        height: height,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        pointerEvents: 'auto',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      // Fallback souris pour navigateurs avec support Pointer Events limité
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
    >
      {children}
    </div>
  );
}

export default DraggableBlock;
