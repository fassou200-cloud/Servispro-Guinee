import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from '@/components/ui/dialog';
import { Star, Send, CheckCircle2, User, Briefcase, ClipboardList, MessageSquare, ThumbsUp } from 'lucide-react';
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
  const [step, setStep] = useState(1); // 1: Survey, 2: Rating, 3: Comment
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Survey questions
  const [survey, setSurvey] = useState({
    punctuality: '', // Ponctualité
    quality: '', // Qualité du travail
    communication: '', // Communication
    recommend: '' // Recommanderiez-vous?
  });

  const surveyOptions = [
    { value: 'excellent', label: 'Excellent', color: 'text-green-600' },
    { value: 'good', label: 'Bien', color: 'text-blue-600' },
    { value: 'average', label: 'Moyen', color: 'text-yellow-600' },
    { value: 'poor', label: 'Insuffisant', color: 'text-red-600' }
  ];

  const handleSurveyChange = (question, value) => {
    setSurvey(prev => ({ ...prev, [question]: value }));
  };

  const canProceedToRating = () => {
    return survey.punctuality && survey.quality && survey.communication && survey.recommend;
  };

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
      const token = localStorage.getItem('customerToken');
      await axios.post(`${API}/reviews`, {
        service_provider_id: jobData.provider_id,
        reviewer_name: `${customerInfo.first_name} ${customerInfo.last_name}`,
        rating: rating,
        comment: comment.trim(),
        job_id: jobData.job_id,
        customer_id: customerInfo.id,
        survey: survey // Include survey data
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Merci pour votre avis !');
      // Reset form
      setStep(1);
      setRating(0);
      setComment('');
      setSurvey({ punctuality: '', quality: '', communication: '', recommend: '' });
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
    setStep(1);
    setRating(0);
    setComment('');
    setSurvey({ punctuality: '', quality: '', communication: '', recommend: '' });
    toast.info('Vous pourrez laisser un avis plus tard depuis votre tableau de bord');
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
      <DialogContent className="max-w-lg bg-white border-slate-200 max-h-[90vh] overflow-y-auto">
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
            Aidez-nous à améliorer nos services en partageant votre expérience
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
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {s}
              </div>
              {s < 3 && (
                <div className={`w-8 h-1 ${step > s ? 'bg-orange-500' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-500 mb-4 px-2">
          <span className={step === 1 ? 'text-orange-600 font-medium' : ''}>Sondage</span>
          <span className={step === 2 ? 'text-orange-600 font-medium' : ''}>Note</span>
          <span className={step === 3 ? 'text-orange-600 font-medium' : ''}>Commentaire</span>
        </div>

        {/* Step 1: Survey */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4">
              <ClipboardList className="h-5 w-5 text-orange-500" />
              Enquête de Satisfaction
            </div>

            {/* Punctuality */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                1. Ponctualité du prestataire
              </Label>
              <RadioGroup 
                value={survey.punctuality} 
                onValueChange={(value) => handleSurveyChange('punctuality', value)}
                className="flex flex-wrap gap-2"
              >
                {surveyOptions.map((option) => (
                  <div key={option.value} className="flex items-center">
                    <RadioGroupItem value={option.value} id={`punctuality-${option.value}`} className="sr-only" />
                    <Label
                      htmlFor={`punctuality-${option.value}`}
                      className={`px-4 py-2 rounded-full border cursor-pointer transition-all ${
                        survey.punctuality === option.value
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-orange-300'
                      }`}
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Quality */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                2. Qualité du travail réalisé
              </Label>
              <RadioGroup 
                value={survey.quality} 
                onValueChange={(value) => handleSurveyChange('quality', value)}
                className="flex flex-wrap gap-2"
              >
                {surveyOptions.map((option) => (
                  <div key={option.value} className="flex items-center">
                    <RadioGroupItem value={option.value} id={`quality-${option.value}`} className="sr-only" />
                    <Label
                      htmlFor={`quality-${option.value}`}
                      className={`px-4 py-2 rounded-full border cursor-pointer transition-all ${
                        survey.quality === option.value
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-orange-300'
                      }`}
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Communication */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                3. Communication et professionnalisme
              </Label>
              <RadioGroup 
                value={survey.communication} 
                onValueChange={(value) => handleSurveyChange('communication', value)}
                className="flex flex-wrap gap-2"
              >
                {surveyOptions.map((option) => (
                  <div key={option.value} className="flex items-center">
                    <RadioGroupItem value={option.value} id={`communication-${option.value}`} className="sr-only" />
                    <Label
                      htmlFor={`communication-${option.value}`}
                      className={`px-4 py-2 rounded-full border cursor-pointer transition-all ${
                        survey.communication === option.value
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-orange-300'
                      }`}
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Recommend */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                4. Recommanderiez-vous ce prestataire ?
              </Label>
              <RadioGroup 
                value={survey.recommend} 
                onValueChange={(value) => handleSurveyChange('recommend', value)}
                className="flex gap-4"
              >
                <div className="flex items-center">
                  <RadioGroupItem value="yes" id="recommend-yes" className="sr-only" />
                  <Label
                    htmlFor="recommend-yes"
                    className={`px-6 py-2 rounded-full border cursor-pointer transition-all flex items-center gap-2 ${
                      survey.recommend === 'yes'
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-green-300'
                    }`}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Oui
                  </Label>
                </div>
                <div className="flex items-center">
                  <RadioGroupItem value="no" id="recommend-no" className="sr-only" />
                  <Label
                    htmlFor="recommend-no"
                    className={`px-6 py-2 rounded-full border cursor-pointer transition-all flex items-center gap-2 ${
                      survey.recommend === 'no'
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-red-300'
                    }`}
                  >
                    <ThumbsUp className="h-4 w-4 rotate-180" />
                    Non
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="flex-1 text-slate-500"
              >
                Plus tard
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedToRating()}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              >
                Continuer
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Star Rating */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <Star className="h-5 w-5 text-yellow-500" />
              Note Globale
            </div>

            <div className="text-center py-6">
              <p className="text-sm text-slate-600 mb-4">Comment évaluez-vous ce prestataire ?</p>
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
                      className={`h-12 w-12 transition-colors ${
                        star <= (hoveredRating || rating) 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-slate-300'
                      }`} 
                    />
                  </button>
                ))}
              </div>
              <p className={`text-lg mt-4 ${rating > 0 ? 'text-orange-600 font-semibold' : 'text-slate-400'}`}>
                {getRatingText(hoveredRating || rating)}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Retour
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={rating === 0}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              >
                Continuer
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Comment */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              Votre Commentaire
            </div>

            {/* Show selected rating */}
            <div className="flex justify-center gap-1 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star}
                  className={`h-6 w-6 ${
                    star <= rating 
                      ? 'fill-yellow-400 text-yellow-400' 
                      : 'text-slate-300'
                  }`} 
                />
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Décrivez votre expérience avec ce prestataire
              </Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Partagez les détails de votre expérience... (minimum 10 caractères)"
                className="min-h-[120px] resize-none border-slate-200 focus:border-orange-500 focus:ring-orange-500"
                maxLength={500}
              />
              <p className="text-xs text-slate-400 text-right">{comment.length}/500</p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="flex-1"
              >
                Retour
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || comment.trim().length < 10}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Envoi...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Envoyer mon Avis
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RatingPopup;
