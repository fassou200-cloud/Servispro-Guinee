import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getImageUrl } from '@/utils/imageUrl';
import { AlertCircle, Building, Calendar, CheckCircle, Eye, FileText, MapPin, Moon, Trash2, Users, XCircle } from 'lucide-react';

const AdminRentalsTab = ({
  rentalFilter,
  rentals,
  filteredRentals,
  selectedRental,
  setRentalFilter,
  setSelectedRental,
  confirmDelete,
  getStatusBadge,
  handleApproveRental,
  handleRejectRental,
  BACKEND_URL,
  translateStatus
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-bold text-white">Annonces de Location</h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={rentalFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setRentalFilter('all')}
              className={rentalFilter === 'all' ? 'bg-purple-600' : 'border-slate-600 text-slate-300'}
            >
              Toutes ({rentals.length})
            </Button>
            <Button
              size="sm"
              variant={rentalFilter === 'long_term' ? 'default' : 'outline'}
              onClick={() => setRentalFilter('long_term')}
              className={rentalFilter === 'long_term' ? 'bg-blue-600' : 'border-slate-600 text-slate-300'}
            >
              <Calendar className="h-3 w-3 mr-1" />
              Longue ({rentals.filter(r => r.rental_type === 'long_term' || !r.rental_type).length})
            </Button>
            <Button
              size="sm"
              variant={rentalFilter === 'short_term' ? 'default' : 'outline'}
              onClick={() => setRentalFilter('short_term')}
              className={rentalFilter === 'short_term' ? 'bg-purple-600' : 'border-slate-600 text-slate-300'}
            >
              <Moon className="h-3 w-3 mr-1" />
              Courte ({rentals.filter(r => r.rental_type === 'short_term').length})
            </Button>
          </div>
        </div>

        {filteredRentals.length === 0 ? (
          <Card className="p-8 bg-slate-800 border-slate-700 text-center">
            <p className="text-slate-400">Aucune annonce de location</p>
          </Card>
        ) : (
          filteredRentals.map((rental) => (
            <Card
              key={rental.id}
              className={`p-4 bg-slate-800 border-slate-700 cursor-pointer transition-colors ${
                selectedRental?.id === rental.id ? 'border-purple-500' : 'hover:border-slate-600'
              }`}
              onClick={() => setSelectedRental(rental)}
            >
              <div className="flex gap-4">
                {rental.photos && rental.photos.length > 0 ? (
                  <img
                    src={getImageUrl(rental.photos[0])}
                    alt={rental.title}
                    className="w-24 h-20 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-24 h-20 bg-slate-700 rounded-lg flex items-center justify-center">
                    <Building className="h-8 w-8 text-slate-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-white truncate">{rental.title}</h3>
                    <span className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium ${
                      rental.rental_type === 'short_term'
                        ? 'bg-purple-600/20 text-purple-400'
                        : 'bg-blue-600/20 text-blue-400'
                    }`}>
                      {rental.rental_type === 'short_term' ? 'Courte' : 'Longue'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">{rental.provider_name}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <MapPin className="h-3 w-3" />
                    {rental.location}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-green-400 font-bold text-sm">
                      {rental.rental_type === 'short_term' && rental.price_per_night
                        ? `${Number(rental.price_per_night).toLocaleString('fr-FR')} GNF/nuit`
                        : `${Number(rental.rental_price).toLocaleString('fr-FR')} GNF/mois`
                      }
                    </span>
                    {/* Approval Status Badge */}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusBadge(rental.approval_status || 'pending')}`}>
                      {translateStatus(rental.approval_status || 'pending')}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Rental Detail */}
      <div>
        <h2 className="text-lg font-heading font-bold text-white mb-4">Détails de la Location</h2>
        {selectedRental ? (
          <Card className="p-6 bg-slate-800 border-slate-700">
            {selectedRental.photos && selectedRental.photos.length > 0 && (
              <img
                src={getImageUrl(selectedRental.photos[0])}
                alt={selectedRental.title}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}

            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedRental.title}</h3>
                <p className="text-slate-400">{selectedRental.property_type === 'Apartment' ? 'Appartement' : 'Maison'}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-400">
                  {selectedRental.rental_type === 'short_term' && selectedRental.price_per_night
                    ? `${Number(selectedRental.price_per_night).toLocaleString('fr-FR')} GNF`
                    : `${Number(selectedRental.rental_price).toLocaleString('fr-FR')} GNF`
                  }
                </p>
                <p className="text-sm text-slate-400">
                  {selectedRental.rental_type === 'short_term' ? 'par nuit' : 'par mois'}
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="h-4 w-4 text-slate-400" />
                {selectedRental.location}
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Users className="h-4 w-4 text-slate-400" />
                {selectedRental.provider_name} ({selectedRental.provider_phone})
              </div>
              {selectedRental.rental_type === 'short_term' && (
                <>
                  {selectedRental.max_guests && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Users className="h-4 w-4 text-slate-400" />
                      Max {selectedRental.max_guests} invités
                    </div>
                  )}
                  {selectedRental.min_nights > 1 && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Moon className="h-4 w-4 text-slate-400" />
                      Min {selectedRental.min_nights} nuits
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`px-3 py-1 rounded text-sm ${
                selectedRental.rental_type === 'short_term'
                  ? 'bg-purple-600/20 text-purple-400'
                  : 'bg-blue-600/20 text-blue-400'
              }`}>
                {selectedRental.rental_type === 'short_term' ? 'Courte Durée' : 'Longue Durée'}
              </span>
              {selectedRental.is_available !== false ? (
                <span className="px-3 py-1 rounded text-sm bg-green-600/20 text-green-400">Disponible</span>
              ) : (
                <span className="px-3 py-1 rounded text-sm bg-red-600/20 text-red-400">Indisponible</span>
              )}
              {/* Approval Status Badge */}
              <span className={`px-3 py-1 rounded text-sm font-medium border ${getStatusBadge(selectedRental.approval_status || 'pending')}`}>
                {translateStatus(selectedRental.approval_status || 'pending')}
              </span>
            </div>

            {/* Amenities */}
            {selectedRental.amenities && selectedRental.amenities.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Équipements</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedRental.amenities.map(a => (
                    <span key={a} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Description</h4>
              <p className="text-slate-400 text-sm">{selectedRental.description}</p>
            </div>

            <div className="text-xs text-slate-500 mb-4">
              Créée le {new Date(selectedRental.created_at).toLocaleDateString('fr-FR')}
            </div>

            {/* Documents Section for Admin */}
            <div className="mb-4 p-4 bg-slate-700/50 rounded-lg">
              <h4 className="text-sm font-bold text-slate-300 uppercase mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents Légaux
              </h4>
              <div className="space-y-2">
                {selectedRental.titre_foncier ? (
                  <a
                    href={`${BACKEND_URL}${selectedRental.titre_foncier}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Titre Foncier
                    </span>
                    <Eye className="h-4 w-4 text-slate-400" />
                  </a>
                ) : (
                  <div className="flex items-center gap-2 p-2 text-sm text-slate-500">
                    <XCircle className="h-4 w-4" />
                    Titre Foncier - Non fourni
                  </div>
                )}

                {selectedRental.document_ministere_habitat ? (
                  <a
                    href={`${BACKEND_URL}${selectedRental.document_ministere_habitat}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Document Ministère de l'Habitat
                    </span>
                    <Eye className="h-4 w-4 text-slate-400" />
                  </a>
                ) : selectedRental.registration_ministere ? (
                  <a
                    href={`${BACKEND_URL}${selectedRental.registration_ministere}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Enregistrement Ministère
                    </span>
                    <Eye className="h-4 w-4 text-slate-400" />
                  </a>
                ) : (
                  <div className="flex items-center gap-2 p-2 text-sm text-slate-500">
                    <XCircle className="h-4 w-4" />
                    Document Ministère - Non fourni
                  </div>
                )}

                {selectedRental.document_batiment ? (
                  <a
                    href={`${BACKEND_URL}${selectedRental.document_batiment}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Document du Bâtiment
                    </span>
                    <Eye className="h-4 w-4 text-slate-400" />
                  </a>
                ) : (
                  <div className="flex items-center gap-2 p-2 text-sm text-slate-500">
                    <XCircle className="h-4 w-4" />
                    Document du Bâtiment - Non fourni
                  </div>
                )}

                {selectedRental.seller_id_document && (
                  <a
                    href={`${BACKEND_URL}${selectedRental.seller_id_document}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Pièce d'Identité Propriétaire
                    </span>
                    <Eye className="h-4 w-4 text-slate-400" />
                  </a>
                )}

                {selectedRental.documents_additionnels && selectedRental.documents_additionnels.length > 0 && (
                  <div className="pt-2 border-t border-slate-600">
                    <span className="text-xs text-slate-400 mb-2 block">Autres Documents</span>
                    {selectedRental.documents_additionnels.map((doc, idx) => (
                      <a
                        key={idx}
                        href={`${BACKEND_URL}${doc}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors mt-1"
                      >
                        <span className="flex items-center gap-2 text-sm text-slate-300">
                          <FileText className="h-4 w-4 text-blue-400" />
                          Document {idx + 1}
                        </span>
                        <Eye className="h-4 w-4 text-slate-400" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Approval Actions */}
            {(selectedRental.approval_status === 'pending' || !selectedRental.approval_status) && (
              <div className="flex gap-3 pt-4 border-t border-slate-700 mb-4">
                <Button
                  onClick={() => handleApproveRental(selectedRental.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                  data-testid="approve-rental-btn"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approuver
                </Button>
                <Button
                  onClick={() => handleRejectRental(selectedRental.id)}
                  variant="outline"
                  className="flex-1 border-red-600 text-red-400 hover:bg-red-600 hover:text-white gap-2"
                  data-testid="reject-rental-btn"
                >
                  <XCircle className="h-4 w-4" />
                  Rejeter
                </Button>
              </div>
            )}

            {/* Show rejection reason if rejected */}
            {selectedRental.approval_status === 'rejected' && selectedRental.rejection_reason && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
                <p className="text-sm text-red-400 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Raison du rejet:</strong> {selectedRental.rejection_reason}</span>
                </p>
              </div>
            )}

            {/* Show approval info if approved */}
            {selectedRental.approval_status === 'approved' && selectedRental.approved_at && (
              <div className="mb-4 p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                <p className="text-sm text-green-400 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Approuvée le {new Date(selectedRental.approved_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            )}

            <Button
              onClick={() => confirmDelete('rental', selectedRental.id, selectedRental.title)}
              variant="outline"
              className="w-full border-red-600 text-red-400 hover:bg-red-600 hover:text-white gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer cette location
            </Button>
          </Card>
        ) : (
          <Card className="p-8 bg-slate-800 border-slate-700 text-center">
            <Building className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Sélectionnez une location pour voir ses détails</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminRentalsTab;
