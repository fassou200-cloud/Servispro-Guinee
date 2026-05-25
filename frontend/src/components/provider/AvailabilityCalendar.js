import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/**
 * Provider availability calendar.
 * - unavailable: Set<YYYY-MM-DD>  → dates the provider clicked as unavailable (manual)
 * - busyByMission: Set<YYYY-MM-DD>  → dates blocked because an accepted mission covers them (read-only)
 * - onToggle(dateStr): called when the user clicks a non-busy date
 */
const AvailabilityCalendar = ({ unavailable, busyByMission, onToggle }) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // ISO weekday : Mon=1..Sun=7
  const startWeekday = ((firstOfMonth.getDay() + 6) % 7);

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dateStr = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const prev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else { setMonth(m => m - 1); }
  };
  const next = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else { setMonth(m => m + 1); }
  };

  return (
    <Card className="p-4" data-testid="availability-calendar">
      <div className="flex items-center justify-between mb-3">
        <Button size="sm" variant="ghost" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
        <h3 className="font-bold">{MONTHS[month]} {year}</h3>
        <Button size="sm" variant="ghost" onClick={next}><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs text-gray-500 font-semibold">
        {DAYS.map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, idx) => {
          if (d === null) return <div key={idx} />;
          const ds = dateStr(d);
          const dDate = new Date(ds);
          const todayStr = today.toISOString().slice(0, 10);
          const isPast = ds < todayStr;
          const isBusy = busyByMission.has(ds);
          const isUnavailable = unavailable.has(ds);
          const isToday = ds === todayStr;
          let cls = 'aspect-square flex items-center justify-center text-sm rounded transition-all';
          if (isBusy) cls += ' bg-red-200 text-red-800 cursor-not-allowed font-bold';
          else if (isPast) cls += ' bg-gray-100 text-gray-400 cursor-not-allowed';
          else if (isUnavailable) cls += ' bg-gray-300 text-gray-700 cursor-pointer hover:bg-gray-400';
          else cls += ' bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100';
          if (isToday) cls += ' ring-2 ring-blue-500';
          return (
            <button
              key={idx}
              type="button"
              disabled={isBusy || isPast}
              onClick={() => !isBusy && !isPast && onToggle(ds)}
              className={cls}
              data-testid={`day-${ds}`}
              title={isBusy ? 'Mission acceptée' : isPast ? 'Date passée' : isUnavailable ? 'Vous êtes indisponible' : 'Disponible'}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div className="flex items-center flex-wrap gap-3 mt-4 text-xs text-gray-600">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200" /> Disponible</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-300" /> Indisponible (vous)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200" /> Mission en cours</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" /> Passée</span>
      </div>
    </Card>
  );
};

export default AvailabilityCalendar;
