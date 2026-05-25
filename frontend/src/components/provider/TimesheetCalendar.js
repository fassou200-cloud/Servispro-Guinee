import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/**
 * Click days you worked, within the mission start/end window.
 */
const TimesheetCalendar = ({ startDate, endDate, selected, onToggle }) => {
  const startIso = startDate ? String(startDate).slice(0, 10) : null;
  const endIso = endDate ? String(endDate).slice(0, 10) : startIso;
  const todayIso = new Date().toISOString().slice(0, 10);
  const initial = startIso ? new Date(startIso) : new Date();
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = ((firstOfMonth.getDay() + 6) % 7);

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dateStr = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const inWindow = (d) => {
    if (!startIso) return false;
    const ds = dateStr(d);
    return ds >= startIso && (!endIso || ds <= endIso);
  };
  const isFuture = (d) => dateStr(d) > todayIso;

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else { setMonth(m => m - 1); } };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else { setMonth(m => m + 1); } };

  return (
    <Card className="p-3" data-testid="timesheet-calendar">
      <div className="flex items-center justify-between mb-3">
        <Button size="sm" variant="ghost" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
        <h3 className="font-bold text-sm">{MONTHS[month]} {year}</h3>
        <Button size="sm" variant="ghost" onClick={next}><ChevronRight className="h-4 w-4" /></Button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1 text-center text-xs text-gray-500 font-semibold">
        {DAYS.map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, idx) => {
          if (d === null) return <div key={idx} />;
          const ds = dateStr(d);
          const valid = inWindow(d) && !isFuture(d);
          const future = inWindow(d) && isFuture(d);
          const isSelected = selected.has(ds);
          let cls = 'aspect-square flex items-center justify-center text-sm rounded transition-all';
          if (!valid && !future) cls += ' bg-gray-100 text-gray-300 cursor-not-allowed';
          else if (future) cls += ' bg-amber-50 text-amber-400 cursor-not-allowed';
          else if (isSelected) cls += ' bg-emerald-500 text-white font-bold cursor-pointer hover:bg-emerald-600';
          else cls += ' bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100';
          return (
            <button
              key={idx}
              type="button"
              disabled={!valid}
              onClick={() => valid && onToggle(ds)}
              className={cls}
              title={future ? 'Date à venir — pointage impossible' : undefined}
              data-testid={`ts-day-${ds}`}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" /> Travaillé</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200" /> Disponible</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-50 border border-amber-200" /> À venir</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100" /> Hors mission</span>
      </div>
    </Card>
  );
};

export default TimesheetCalendar;
