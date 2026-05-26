import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const CompleteMissionDialog = ({ open, onOpenChange, completeData, setCompleteData, onSubmit }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent data-testid="complete-mission-dialog">
      <DialogHeader>
        <DialogTitle>Marquer la mission terminée</DialogTitle>
        <DialogDescription>Cette action génère la commission ServisPro à payer par chaque prestataire accepté.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Jours travaillés</Label>
          <Input type="number" min="1" value={completeData.days_worked} onChange={(e) => setCompleteData({ ...completeData, days_worked: e.target.value })} data-testid="days-worked-input" />
        </div>
        <div>
          <Label>Taux journalier final (GNF)</Label>
          <Input type="number" min="0" value={completeData.daily_rate} onChange={(e) => setCompleteData({ ...completeData, daily_rate: e.target.value })} data-testid="final-rate-input" />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
        <Button onClick={onSubmit} className="bg-emerald-600 hover:bg-emerald-700" data-testid="confirm-complete-btn">Valider</Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default CompleteMissionDialog;
