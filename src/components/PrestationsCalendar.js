import React, { useMemo, useState } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, format, isSameMonth, isSameDay } from 'date-fns';
import fr from 'date-fns/locale/fr';
import './PrestationsCalendar.css';

function buildMonthDays(currentMonth) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }
  return days;
}

function PrestationsCalendar({ prestations }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => buildMonthDays(currentMonth), [currentMonth]);
  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: fr });

  const prestationsByDay = useMemo(() => {
    const map = {};
    prestations.forEach((p) => {
      if (!p.date) return;
      map[p.date] = map[p.date] ? [...map[p.date], p] : [p];
    });
    return map;
  }, [prestations]);

  const nextMonth = () => setCurrentMonth((m) => addMonths(m, 1));
  const prevMonth = () => setCurrentMonth((m) => addMonths(m, -1));

  return (
    <div className="prestations-calendar">
      <div className="calendar-header">
        <button onClick={prevMonth}>&lt;</button>
        <h3>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</h3>
        <button onClick={nextMonth}>&gt;</button>
      </div>

      <div className="calendar-grid">
        {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((d) => (
          <div key={d} className="weekday">{d}</div>
        ))}

        {days.map((day) => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const isCurrent = isSameMonth(day, currentMonth);
          const events = prestationsByDay[dayStr] || [];
          return (
            <div key={day.toISOString()} className={isCurrent ? 'day' : 'day muted'}>
              <div className="day-number">{format(day, 'd')}</div>
              <div className="events">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className={`event ${ev.statut}`}
                    title={`${ev.nom} - ${(ev.montant || 0).toLocaleString('fr-FR')} €`}
                  >
                    <div className="event-name">{ev.nom}</div>
                    <div className="event-price">
                      {(ev.montant || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PrestationsCalendar;


