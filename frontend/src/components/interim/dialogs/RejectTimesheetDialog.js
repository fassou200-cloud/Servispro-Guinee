import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const RejectTimesheetDialog = ({ timesheet, onClose, reason, setReason, onSubmit }) => (
  <Dialog open={!!timesheet} onOpenChange={(o) => !o && onClose()}>
    <DialogContent data-testid="reject-ts-dialog">
      <DialogHeader>
        <DialogTitle className="text-red-600">Rejeter le pointage</DialogTitle>
        <DialogDescription>
          Pointage de <strong>{timesheet?.provider_name}</strong> sur «&nbsp;{timesheet?.mission_title}&nbsp;»<br/>
          <strong>{timesheet?.total_hours || (timesheet?.days_worked * 8)}h</strong> = {timesheet?.days_worked} jour(s)
        </DialogDescription>
      </DialogHeader>
      <div>
        <Label>Motif du rejet *</Label>
        <Textarea
          rows={3}
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: Le 28 mai n'a pas été travaillé, présence absente sur site."
          maxLength={500}
          data-testid="reject-reason-input"
        />
        <p className="text-xs text-gray-500 mt-1">Le prestataire verra ce motif dans son pointage.</p>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={onSubmit} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-reject-ts-btn">
          Rejeter le pointage
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default RejectTimesheetDialog;
