import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getImageUrl } from '@/utils/imageUrl';
import { CheckCircle, Clock, Eye, Home, MapPin, Plus, Trash2, XCircle } from 'lucide-react';

const CompanyRentalsTab = ({ deleteRental, getImageUrl, isApproved, rentals, setActiveTab }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-heading font-bold text-foreground">
          Mes Locations ({rentals.length})
        </h3>
        {isApproved && (
          <Button onClick={() => setActiveTab('create-rental')} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" /> Nouvelle Location
          </Button>
        )}
      </div>

      {rentals.length === 0 ? (
        <Card className="p-8 text-center">
          <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucune location publiée</p>
          {isApproved && (
            <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={() => setActiveTab('create-rental')}>
              <Plus className="h-4 w-4 mr-2" />
              Créer une annonce
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rentals.map(rental => (
            <Card key={rental.id} className="overflow-hidden">
              {rental.photos && rental.photos.length > 0 && (
                <img
                  src={getImageUrl(rental.photos[0])}
                  alt={rental.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700">
                      {rental.property_type}
                    </span>
                    <h4 className="text-lg font-heading font-bold text-foreground mt-2">{rental.title}</h4>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {/* Approval Status Badge */}
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      rental.approval_status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : rental.approval_status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {rental.approval_status === 'approved' ? (
                        <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Approuvée</span>
                      ) : rental.approval_status === 'rejected' ? (
                        <span className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Rejetée</span>
                      ) : (
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> En attente</span>
                      )}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${rental.is_available ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                      {rental.is_available ? 'Disponible' : 'Indisponible'}
                    </span>
                  </div>
                </div>
                <p className="text-foreground text-sm mb-4 line-clamp-2">{rental.description}</p>

                {/* Rejection Reason if rejected */}
                {rental.approval_status === 'rejected' && rental.rejection_reason && (
                  <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    <strong>Raison:</strong> {rental.rejection_reason}
                  </div>
                )}

                {/* Pending notice */}
                {(!rental.approval_status || rental.approval_status === 'pending') && (
                  <div className="mb-4 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    En attente d'approbation admin
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {rental.location}
                  </span>
                  <span className="text-emerald-600 font-bold">
                    {rental.rental_price?.toLocaleString()} GNF/mois
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-4 w-4 mr-1" /> Voir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => deleteRental(rental.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompanyRentalsTab;
