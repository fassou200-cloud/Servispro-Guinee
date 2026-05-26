import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const RateProviderDialog = ({ target, onClose, form, setForm, onSubmit }) => (
  <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
    <DialogContent data-testid="rate-provider-dialog">
      <DialogHeader>
        <DialogTitle>Noter : {target?.provider_name}</DialogTitle>
        <DialogDescription>Donnez votre avis sur ce prestataire après la mission.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Note</Label>
          <div className="flex gap-1 text-3xl">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm({ ...form, stars: s })}
                className={s <= form.stars ? 'text-amber-400' : 'text-gray-300'}
                data-testid={`comp-star-${s}`}
              >★</button>
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
        <Button onClick={onSubmit} className="bg-amber-500 hover:bg-amber-600" data-testid="submit-rate-prov-btn">Envoyer</Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default RateProviderDialog;
