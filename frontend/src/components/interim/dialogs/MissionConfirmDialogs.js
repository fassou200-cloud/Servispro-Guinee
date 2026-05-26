import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Trash2, Users } from 'lucide-react';

export const DeleteMissionDialog = ({ open, onClose, onConfirm }) => (
  <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="sm:max-w-md" data-testid="delete-mission-dialog">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-red-600">
          <Trash2 className="h-5 w-5" />
          Supprimer cette mission ?
        </DialogTitle>
        <DialogDescription className="mt-2">
          Cette action est définitive. La mission sera retirée et toutes les candidatures associées seront effacées.
        </DialogDescription>
      </DialogHeader>
      <div className="flex justify-end gap-2 mt-3">
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-delete-btn">
          Supprimer
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export const OverquotaDialog = ({ pending, onClose, onConfirm }) => (
  <Dialog open={!!pending} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="sm:max-w-md" data-testid="overquota-dialog">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-amber-600">
          <Users className="h-5 w-5" />
          Quota déjà atteint ({pending?.mission?.accepted_count}/{pending?.mission?.num_providers_needed})
        </DialogTitle>
        <DialogDescription className="mt-2 space-y-2">
          <span className="block">Vous avez déjà accepté le nombre de prestataires prévu pour cette mission.</span>
          <span className="block">Voulez-vous tout de même accepter un prestataire supplémentaire ?</span>
          <span className="block text-xs italic text-gray-500">Utile si un prestataire accepté ne s&apos;est pas présenté ou s&apos;est désisté.</span>
        </DialogDescription>
      </DialogHeader>
      <div className="flex justify-end gap-2 mt-3">
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={onConfirm} className="bg-amber-500 hover:bg-amber-600 text-white" data-testid="confirm-overquota-btn">
          Accepter quand même
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);
