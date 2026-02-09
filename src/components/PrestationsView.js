import React, { useMemo, useState } from 'react';
import './PrestationsView.css';
import PrestationsBoard, { columns } from './PrestationsBoard';
import PrestationsCalendar from './PrestationsCalendar';

function PrestationsView({ prestations, onChange, inventory, onInventoryChange, onPreparePrestation }) {
  const [viewMode, setViewMode] = useState('board'); // 'board' | 'calendar'

  return (
    <div className="prestations">
      <div className="prestations-header">
        <div>
          <h2>📋 Prestations</h2>
          <p className="subtitle">Vue tableau (kanban) ou calendrier, inspirée de ton Notion.</p>
        </div>
        <div className="view-switch">
          <button
            className={viewMode === 'board' ? 'switch active' : 'switch'}
            onClick={() => setViewMode('board')}
          >
            Tableau
          </button>
          <button
            className={viewMode === 'calendar' ? 'switch active' : 'switch'}
            onClick={() => setViewMode('calendar')}
          >
            Calendrier
          </button>
        </div>
      </div>

      {viewMode === 'board' ? (
        <PrestationsBoard
          prestations={prestations}
          onChange={onChange}
          inventory={inventory}
          onInventoryChange={onInventoryChange}
          onPreparePrestation={onPreparePrestation}
        />
      ) : (
        <PrestationsCalendar prestations={prestations} />
      )}
    </div>
  );
}

export default PrestationsView;

