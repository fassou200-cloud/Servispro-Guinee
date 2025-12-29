import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ReviewForm = ({ providerId, onSuccess }) => {
  const [formData, setFormData] = useState({
    reviewer_name: '',
    rating: 5,
    comment: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await axios.post(`${API}/reviews`, {
        service_provider_id: providerId,
        reviewer_name: formData.reviewer_name,
        rating: formData.rating,
        comment: formData.comment
      });

      toast.success('Review submitted successfully!');
      setFormData({ reviewer_name: '', rating: 5, comment: '' });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-heading font-bold text-foreground mb-4">
        Leave a Review
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reviewer_name" className="font-heading text-xs uppercase tracking-wide">
            Your Name *
          </Label>
          <Input
            id="reviewer_name"
            data-testid="review-name-input"
            value={formData.reviewer_name}
            onChange={(e) => setFormData({ ...formData, reviewer_name: e.target.value })}
            required
            className="h-12"
            placeholder="John Doe"
          />
        </div>

        <div className="space-y-2">
          <Label className="font-heading text-xs uppercase tracking-wide">
            Rating *
          </Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                data-testid={`rating-star-${star}`}
                onClick={() => setFormData({ ...formData, rating: star })}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= (hoveredRating || formData.rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-lg font-medium text-foreground">
              {formData.rating} / 5
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="comment" className="font-heading text-xs uppercase tracking-wide">
            Comment *
          </Label>
          <Textarea
            id="comment"
            data-testid="review-comment-textarea"
            value={formData.comment}
            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
            required
            rows={4}
            className="resize-none"
            placeholder="Share your experience with this service provider..."
          />
        </div>

        <Button
          type="submit"
          data-testid="submit-review-button"
          className="w-full h-12 font-heading font-bold"
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </Button>
      </form>
    </Card>
  );
};

export default ReviewForm;