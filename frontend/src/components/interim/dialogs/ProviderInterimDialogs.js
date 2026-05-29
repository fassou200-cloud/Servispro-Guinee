import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Send, XCircle } from 'lucide-react';
import TimesheetCalendar from '@/components/provider/TimesheetCalendar';

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);

const PAY_METHOD_LABELS = {
  orange_money: 'Orange Money',
  mtn_money: 'MTN Money',
  bank: 'Virement bancaire',
  other: 'Autre',
};

export const ApplyMissionDialog = ({ mission, user, form, setForm, onClose, onSubmit, submitting }) => (
  <Dialog open={!!mission} onOpenChange={(o) => !o && onClose()}>
    <DialogContent data-testid="apply-mission-dialog">
      <DialogHeader>
        <DialogTitle>Postuler à : {mission?.title}</DialogTitle>
        <DialogDescription>Votre profil ({user?.first_name} {user?.last_name}) sera envoyé à {mission?.company_name}.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Message (optionnel)</Label>
          <Textarea rows={3} value={form.cover_message} onChange={(e) => setForm({ ...form, cover_message: e.target.value })} placeholder="Présentez brièvement votre expérience…" maxLength={1000} data-testid="cover-message-input" />
        </div>
        <div>
          <Label>Taux journalier proposé (GNF, optionnel)</Label>
          <Input type="number" min="0" value={form.proposed_rate} onChange={(e) => setForm({ ...form, proposed_rate: e.target.value })} placeholder={mission?.rate_negotiable ? 'Proposez votre taux' : `Offre: ${fmt(mission?.daily_rate)} GNF`} data-testid="proposed-rate-input" />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={onSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700" data-testid="submit-apply-btn">
          {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi…</> : <><Send className="h-4 w-4 mr-2" /> Envoyer ma candidature</>}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export const PayCommissionDialog = ({ commission, form, setForm, payMethods, onClose, onSubmit, submitting }) => (
  <Dialog open={!!commission} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="pay-commission-dialog">
      <DialogHeader>
        <DialogTitle>Payer la commission ServisPro</DialogTitle>
        <DialogDescription>Effectuez le transfert puis saisissez les détails ci-dessous.</DialogDescription>
      </DialogHeader>
      {commission && (
        <div className="space-y-3">
          <Card className="p-3 bg-emerald-50 border-emerald-200">
            <p className="text-sm text-gray-700">Mission : <strong>{commission.mission_title}</strong></p>
            <p className="text-sm text-gray-700">Montant à régler : <strong className="text-red-600">{fmt(commission.commission_amount)} GNF</strong></p>
          </Card>

          {payMethods.length > 0 && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-xs font-semibold text-blue-700 mb-1">Comptes ServisPro où transférer :</p>
              {payMethods.map(pm => (
                <div key={pm.id} className="text-sm py-1">
                  <span className="font-semibold">{PAY_METHOD_LABELS[pm.type] || pm.type}</span> — {pm.label || pm.account_name}<br />
                  <span className="font-mono text-gray-700">{pm.account_number}</span>
                  {pm.instructions && <p className="text-xs text-gray-500 mt-0.5">{pm.instructions}</p>}
                </div>
              ))}
            </div>
          )}

          <div>
            <Label>Moyen utilisé *</Label>
            <select className="w-full h-10 px-3 border rounded-md text-sm" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} data-testid="pay-method-select">
              <option value="orange_money">Orange Money</option>
              <option value="mtn_money">MTN Money</option>
              <option value="bank">Virement bancaire</option>
              <option value="other">Autre</option>
            </select>
          </div>
          <div>
            <Label>Référence du transfert *</Label>
            <Input value={form.transfer_reference} onChange={(e) => setForm({ ...form, transfer_reference: e.target.value })} placeholder="N° de transaction" data-testid="transfer-ref-input" required />
          </div>
          <div>
            <Label>Numéro émetteur (optionnel)</Label>
            <Input value={form.sender_phone} onChange={(e) => setForm({ ...form, sender_phone: e.target.value })} placeholder="+224..." />
          </div>
          <div>
            <Label>Note (optionnel)</Label>
            <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={500} />
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2 mt-3">
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={onSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700" data-testid="submit-payment-btn">
          {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi…</> : 'Soumettre la preuve'}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export const TimesheetSubmitDialog = ({ app, form, setForm, onToggleDate, onSetHours, onSetDayNote, onClose, onSubmit }) => {
  const lockedDates = form.lockedDates instanceof Set ? form.lockedDates : new Set(form.lockedDates || []);
  const isReadOnly = !!form.readOnly;
  const isValidated = form.tsStatus === 'validated';
  return (
  <Dialog open={!!app} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="timesheet-dialog">
      <DialogHeader>
        <DialogTitle>Pointage : {app?.mission_title}</DialogTitle>
        <DialogDescription>
          {isValidated
            ? 'Ce pointage a été validé par l\u2019entreprise. Aucune modification n\u2019est possible.'
            : 'Sélectionnez les jours réellement travaillés. L\u2019entreprise validera votre pointage.'}
        </DialogDescription>
      </DialogHeader>
      {app && (
        <div className="space-y-3">
          {isValidated && (
            <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800" data-testid="ts-validated-banner">
              <strong>Pointage validé</strong> par l&apos;entreprise. Les jours et heures sont figés et ne peuvent plus être modifiés.
            </div>
          )}
          {!isValidated && lockedDates.size > 0 && (
            <div className="rounded-md bg-slate-100 border border-slate-200 px-3 py-2 text-xs text-slate-600">
              <strong>{lockedDates.size}</strong> jour{lockedDates.size > 1 ? 's' : ''} déjà soumis — modifiable seulement si l&apos;entreprise rejette le pointage. Vous pouvez ajouter de nouveaux jours.
            </div>
          )}
          <TimesheetCalendar
            startDate={app.mission_start_date}
            endDate={app.mission_end_date}
            selected={new Set((form.worked_days || []).map(d => d.date))}
            lockedDates={lockedDates}
            onToggle={onToggleDate}
            readOnly={isReadOnly}
          />
          {form.worked_days.length > 0 && (
            <div className="space-y-2">
              <Label>Heures travaillées par jour</Label>
              <div className="max-h-72 overflow-y-auto space-y-2 border rounded-lg p-2 bg-gray-50">
                {form.worked_days.map(d => {
                  const isLocked = isReadOnly || lockedDates.has(d.date);
                  return (
                  <div key={d.date} className={`rounded p-2 ${isLocked ? 'bg-slate-200/60' : 'bg-white'} border border-slate-200`} data-testid={`hours-row-${d.date}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono w-28">{new Date(d.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                      <Input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="24"
                        value={d.hours}
                        onChange={(e) => onSetHours(d.date, e.target.value)}
                        disabled={isLocked}
                        className={`h-8 w-24 ${isLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                        data-testid={`hours-input-${d.date}`}
                      />
                      <span className="text-xs text-gray-500">h</span>
                      {isLocked && (
                        <span className="ml-auto text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                          {isValidated ? 'Validé' : 'Soumis'}
                        </span>
                      )}
                    </div>
                    <Input
                      type="text"
                      placeholder="Note du jour (optionnel) : ex. départ famille, heures sup…"
                      value={d.note || ''}
                      onChange={(e) => onSetDayNote && onSetDayNote(d.date, e.target.value)}
                      disabled={isLocked}
                      maxLength={200}
                      className={`mt-1.5 h-8 text-xs ${isLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                      data-testid={`note-input-${d.date}`}
                    />
                  </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-600">
                Total : <strong>{form.worked_days.reduce((s, d) => s + Number(d.hours || 0), 0)} heures</strong>
                {' '}≈ <strong>{(form.worked_days.reduce((s, d) => s + Number(d.hours || 0), 0) / 8).toFixed(2)} jour(s)</strong> (base 8h)
              </p>
            </div>
          )}
          <div>
            <Label>Notes générales (optionnel)</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Commentaire global sur la mission…"
              maxLength={1000}
              disabled={isReadOnly}
              className={isReadOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}
              data-testid="ts-general-notes"
            />
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="outline" onClick={onClose}>{isReadOnly ? 'Fermer' : 'Annuler'}</Button>
        {!isReadOnly && (
          <Button onClick={onSubmit} className="bg-emerald-600 hover:bg-emerald-700" data-testid="submit-ts-btn">Envoyer le pointage</Button>
        )}
      </div>
    </DialogContent>
  </Dialog>
  );
};

export const RateCompanyDialog = ({ app, form, setForm, onClose, onSubmit }) => (
  <Dialog open={!!app} onOpenChange={(o) => !o && onClose()}>
    <DialogContent data-testid="rate-company-dialog">
      <DialogHeader>
        <DialogTitle>Noter : {app?.company_name}</DialogTitle>
        <DialogDescription>Votre avis aide les futurs prestataires.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Note</Label>
          <div className="flex gap-1 text-3xl">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} type="button" onClick={() => setForm({ ...form, stars: s })} className={s <= form.stars ? 'text-amber-400' : 'text-gray-300'} data-testid={`star-${s}`}>★</button>
            ))}
          </div>
        </div>
        <div>
          <Label>Commentaire (optionnel)</Label>
          <Textarea rows={3} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} maxLength={1000} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={onSubmit} className="bg-amber-500 hover:bg-amber-600" data-testid="submit-rating-btn">Envoyer la note</Button>
      </div>
    </DialogContent>
  </Dialog>
);

export const DeclineMissionDialog = ({ mission, onClose, onConfirm }) => (
  <Dialog open={!!mission} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="sm:max-w-md" data-testid="decline-mission-dialog">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <XCircle className="h-5 w-5 text-gray-500" />
          Masquer cette mission ?
        </DialogTitle>
        <DialogDescription>
          <span className="block mt-2 font-semibold text-gray-700">{mission?.title}</span>
          <span className="block mt-2 text-sm">
            Cette mission n&apos;apparaîtra plus dans votre liste de missions disponibles.
            Vous pourrez toujours la retrouver si l&apos;entreprise vous contacte directement.
          </span>
        </DialogDescription>
      </DialogHeader>
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="outline" onClick={onClose} data-testid="cancel-decline-btn">Annuler</Button>
        <Button onClick={onConfirm} className="bg-gray-700 hover:bg-gray-800 text-white" data-testid="confirm-decline-btn">
          Masquer la mission
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);
