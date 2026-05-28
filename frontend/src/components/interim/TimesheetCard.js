import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';

const TimesheetCard = ({ timesheet: t, onValidate, onReject }) => (
  <Card className="p-4" data-testid={`company-ts-${t.id}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <h3 className="font-bold">{t.mission_title}</h3>
        <p className="text-sm text-gray-700">Prestataire : <strong>{t.provider_name}</strong></p>
        <p className="text-sm text-gray-700">
          <strong>{t.total_hours || (t.days_worked * 8)} h</strong> = <strong>{t.days_worked}</strong> jour(s)
        </p>
        {t.worked_days && t.worked_days.length > 0 && (
          <div className="mt-2 text-xs text-gray-700 space-y-1">
            {t.worked_days.map(d => (
              <div key={d.date} className="leading-tight">
                <span className="text-gray-600">• {new Date(d.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })} — </span>
                <strong>{d.hours}h</strong>
                {d.note && (
                  <span className="text-gray-500 italic"> — « {d.note} »</span>
                )}
              </div>
            ))}
          </div>
        )}
        {t.notes && (
          <div className="mt-2 text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-600">
            <span className="font-semibold text-slate-500">Notes générales :</span> {t.notes}
          </div>
        )}
        {t.rejection_reason && (
          <div className="mt-2 text-xs bg-red-50 border border-red-200 rounded px-2 py-1.5 text-red-700">
            <span className="font-semibold">Motif du rejet précédent :</span> {t.rejection_reason}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        {t.status === 'submitted' ? (
          <>
            <Button size="sm" onClick={() => onValidate(t.id)} className="bg-emerald-600 hover:bg-emerald-700 h-8" data-testid={`validate-ts-${t.id}`}>
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Valider
            </Button>
            <Button size="sm" variant="outline" onClick={() => onReject(t)} className="h-8 text-red-600 border-red-200" data-testid={`reject-ts-${t.id}`}>
              <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeter
            </Button>
          </>
        ) : (
          <Badge className={t.status === 'validated' ? 'bg-green-600' : 'bg-red-500'}>{t.status === 'validated' ? 'Validé' : 'Rejeté'}</Badge>
        )}
      </div>
    </div>
  </Card>
);

export default TimesheetCard;
