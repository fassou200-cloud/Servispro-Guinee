import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Home, MapPin, DollarSign, Trash2 } from 'lucide-react';
import axios from 'axios';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MyRentals = () => {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchRentals();
  }, []);

  const fetchRentals = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/rentals/my-listings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRentals(response.data);
    } catch (error) {
      console.error('Failed to fetch rentals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (rentalId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/rentals/${rentalId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Rental listing deleted');
      fetchRentals();
    } catch (error) {
      toast.error('Failed to delete listing');
    }
    setDeleteId(null);
  };

  if (loading) {
    return (
      <Card className="p-8">
        <p className="text-center text-muted-foreground">Loading your listings...</p>
      </Card>
    );
  }

  if (rentals.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-heading font-bold text-foreground mb-2">
            No Rental Listings Yet
          </h3>
          <p className="text-muted-foreground">
            Create your first rental listing to start receiving inquiries.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-heading font-bold text-foreground">
          My Rental Listings ({rentals.length})
        </h3>
      </div>

      {rentals.map((rental) => (
        <Card key={rental.id} className="p-6" data-testid={`rental-card-${rental.id}`}>
          <div className="flex gap-6">
            {rental.photos.length > 0 && (
              <div className="w-48 h-32 flex-shrink-0">
                <img
                  src={`${BACKEND_URL}${rental.photos[0]}`}
                  alt={rental.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-xl font-heading font-bold text-foreground mb-1">
                    {rental.title}
                  </h4>
                  <span className="inline-block px-2 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                    {rental.property_type}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid={`delete-rental-${rental.id}`}
                  onClick={() => setDeleteId(rental.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-foreground mb-3 line-clamp-2">{rental.description}</p>

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {rental.location}
                </div>
                <div className="flex items-center gap-2 text-primary font-bold">
                  <DollarSign className="h-4 w-4" />
                  ${rental.rental_price}/month
                </div>
                {rental.photos.length > 0 && (
                  <div className="text-muted-foreground">
                    {rental.photos.length} photo{rental.photos.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rental Listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your rental listing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyRentals;