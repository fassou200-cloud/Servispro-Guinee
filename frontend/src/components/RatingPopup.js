import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Star, Send, CheckCircle2, User, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RatingPopup = ({ 
  open, 
  onOpenChange, 
  jobData, 
  customerInfo,
  onReviewSubmitted 
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Veuillez sélectionner une note');
      return;
    }

    if (comment.trim().length < 10) {
      toast.error('Veuillez écrire un commentaire d\'au moins 10 caractères');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('customer_token');
      await axios.post(`${API}/reviews`, {
        service_provider_id: jobData.provider_id,
        reviewer_name: `${customerInfo.first_name} ${customerInfo.last_name}`,
        rating: rating,
        comment: comment.trim(),
        job_id: jobData.job_id,
        customer_id: customerInfo.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Merci pour votre avis !');
      setRating(0);
      setComment('');
      onOpenChange(false);
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      const errorMsg = error.response?.data?.detail || 'Erreur lors de l\'envoi de l\'avis';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    toast.info('Vous pourrez laisser un avis plus tard');
  };

  const getRatingText = (rating) => {
    switch(rating) {
      case 1: return 'Très insatisfait';
      case 2: return 'Insatisfait';
      case 3: return 'Correct';
      case 4: return 'Satisfait';
      case 5: return 'Très satisfait';
      default: return 'Sélectionnez une note';
    }
  };

  if (!jobData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border-slate-200">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl text-slate-800">
            Service Terminé !
          </DialogTitle>
          <DialogDescription className="text-center text-slate-500">
            Comment s'est passé votre expérience avec ce prestataire ?
          </DialogDescription>
        </DialogHeader>

        {/* Provider Info */}
        <div className="bg-slate-50 rounded-xl p-4 my-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <User className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">{jobData.provider_name}</p>
              <p className="text-sm text-slate-500 flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {jobData.provider_profession || 'Prestataire'}
              </p>
            </div>
          </div>
          {jobData.service_description && (
            <p className="mt-3 text-sm text-slate-600 border-t border-slate-200 pt-3">
              <span className="font-medium">Service:</span> {jobData.service_description}
            </p>
          )}
        </div>

        {/* Star Rating */}
        <div className="text-center py-4">
          <p className="text-sm font-medium text-slate-600 mb-3">Votre note</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star 
                  className={`h-10 w-10 transition-colors ${
                    star <= (hoveredRating || rating) 
                      ? 'fill-yellow-400 text-yellow-400' 
                      : 'text-slate-300'
                  }`} 
                />
              </button>
            ))}
          </div>
          <p className={`text-sm mt-2 ${rating > 0 ? 'text-orange-600 font-medium' : 'text-slate-400'}`}>
            {getRatingText(hoveredRating || rating)}
          </p>
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Votre commentaire
          </label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Partagez votre expérience avec ce prestataire..."
            className="min-h-[100px] resize-none border-slate-200 focus:border-orange-500 focus:ring-orange-500"
            maxLength={500}
          />
          <p className="text-xs text-slate-400 text-right">{comment.length}/500</p>
        </div>

        <DialogFooter className="flex flex-col gap-3 mt-4">
          <Button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Envoi en cours...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Envoyer mon avis
              </div>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="w-full text-slate-500 hover:text-slate-700"
          >
            Plus tard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RatingPopup;
