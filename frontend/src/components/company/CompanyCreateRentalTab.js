import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Home, Upload, X } from 'lucide-react';

const CompanyCreateRentalTab = ({
  company,
  handleCreateRentalStep1,
  handleCreateRentalStep2,
  handleRentalPhotoSelect,
  isApproved,
  removeRentalPhoto,
  rentalForm,
  rentalPhotoPreviewUrls,
  rentalPhotos,
  rentalStep,
  setRentalForm,
  setRentalStep,
  uploadingRentalFiles
}) => {
  return (
    <Card className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
          <Home className="h-7 w-7 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-heading font-bold text-foreground">
            Créer une Annonce de Location
          </h3>
          <p className="text-muted-foreground">Étape {rentalStep}/2 - {rentalStep === 1 ? 'Informations' : 'Photos'}</p>
        </div>
      </div>

      {!isApproved ? (
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <p className="text-muted-foreground">
            Vous devez être approuvé pour publier des locations.
          </p>
        </div>
      ) : rentalStep === 1 ? (
        <form onSubmit={handleCreateRentalStep1} className="space-y-6">
          <div className="space-y-2">
            <Label>Type de Propriété *</Label>
            <Select value={rentalForm.property_type} onValueChange={(v) => setRentalForm({ ...rentalForm, property_type: v })}>
              <SelectTrigger data-testid="rental-property-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Apartment">Appartement</SelectItem>
                <SelectItem value="House">Maison</SelectItem>
                <SelectItem value="Villa">Villa</SelectItem>
                <SelectItem value="Studio">Studio</SelectItem>
                <SelectItem value="Chambre">Chambre d'Hôtes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Titre de l'Annonce *</Label>
            <Input
              value={rentalForm.title}
              onChange={(e) => setRentalForm({ ...rentalForm, title: e.target.value })}
              required
              placeholder="Ex: Bel appartement meublé à Kipé"
              data-testid="rental-title"
            />
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={rentalForm.description}
              onChange={(e) => setRentalForm({ ...rentalForm, description: e.target.value })}
              required
              rows={4}
              placeholder="Décrivez votre propriété..."
              data-testid="rental-description"
            />
          </div>

          <div className="space-y-2">
            <Label>Localisation *</Label>
            <Input
              value={rentalForm.location}
              onChange={(e) => setRentalForm({ ...rentalForm, location: e.target.value })}
              required
              placeholder="Quartier, Commune, Ville"
              data-testid="rental-location"
            />
          </div>

          <div className="space-y-2">
            <Label>Type de Location *</Label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant={rentalForm.rental_type === 'long_term' ? 'default' : 'outline'}
                onClick={() => setRentalForm({ ...rentalForm, rental_type: 'long_term' })}
                className="h-12"
              >
                Longue Durée
              </Button>
              <Button
                type="button"
                variant={rentalForm.rental_type === 'short_term' ? 'default' : 'outline'}
                onClick={() => setRentalForm({ ...rentalForm, rental_type: 'short_term' })}
                className="h-12"
              >
                Courte Durée
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prix Mensuel (GNF) *</Label>
              <Input
                type="number"
                value={rentalForm.rental_price}
                onChange={(e) => setRentalForm({ ...rentalForm, rental_price: e.target.value })}
                required
                placeholder="500000"
                data-testid="rental-price"
              />
            </div>
            {rentalForm.rental_type === 'short_term' && (
              <div className="space-y-2">
                <Label>Prix par Nuit (GNF)</Label>
                <Input
                  type="number"
                  value={rentalForm.price_per_night}
                  onChange={(e) => setRentalForm({ ...rentalForm, price_per_night: e.target.value })}
                  placeholder="50000"
                />
              </div>
            )}
          </div>

          {/* Caution et Mois d'avance - uniquement pour location longue durée */}
          {rentalForm.rental_type === 'long_term' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Caution (GNF)</Label>
                <Input
                  type="number"
                  value={rentalForm.caution}
                  onChange={(e) => setRentalForm({ ...rentalForm, caution: e.target.value })}
                  placeholder="1000000"
                  data-testid="rental-caution"
                />
              </div>
              <div className="space-y-2">
                <Label>Mois d'avance</Label>
                <Input
                  type="number"
                  min="0"
                  max="12"
                  value={rentalForm.mois_avance}
                  onChange={(e) => setRentalForm({ ...rentalForm, mois_avance: e.target.value })}
                  placeholder="2"
                  data-testid="rental-mois-avance"
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full h-14 bg-emerald-600 hover:bg-emerald-700" data-testid="rental-submit-step1">
            Continuer - Photos
          </Button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            <Label className="font-heading font-bold">Photos de la Propriété</Label>
            <input
              id="company-rental-photos"
              type="file"
              accept="image/*"
              multiple
              onChange={handleRentalPhotoSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('company-rental-photos').click()}
              className="w-full h-14 gap-2 rounded-xl border-dashed border-2"
            >
              <Upload className="h-5 w-5" />
              Ajouter des Photos ({rentalPhotos.length})
            </Button>

            {rentalPhotoPreviewUrls.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                {rentalPhotoPreviewUrls.map((url, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img
                      src={url}
                      alt={`Aperçu ${index + 1}`}
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => removeRentalPhoto(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRentalStep(1)}
              className="flex-1 h-14"
            >
              Retour
            </Button>
            <Button
              type="button"
              onClick={handleCreateRentalStep2}
              className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700"
              disabled={uploadingRentalFiles}
              data-testid="rental-submit-step2"
            >
              {uploadingRentalFiles ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Publication...
                </div>
              ) : (
                "Publier l'Annonce"
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CompanyCreateRentalTab;
