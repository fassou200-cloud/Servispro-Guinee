import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Building, Car, CheckCircle, FileText, Home, Shield, Trees, Upload, Waves, X } from 'lucide-react';

const CompanyCreateSaleTab = ({
  company,
  handleCreateSaleStep1,
  handleCreateSaleStep2,
  handleSaleDocumentSelect,
  handleSalePhotoSelect,
  isApproved,
  removeSaleDocument,
  removeSalePhoto,
  saleDocumentNames,
  saleDocuments,
  saleForm,
  salePhotoPreviewUrls,
  salePhotos,
  saleStep,
  setSaleForm,
  setSaleStep,
  uploadingSaleFiles
}) => {
  return (
    <Card className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
          <Building className="h-7 w-7 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-heading font-bold text-foreground">
            Vente Immobilière
          </h3>
          <p className="text-muted-foreground">Étape {saleStep}/2 - {saleStep === 1 ? 'Informations' : 'Photos'}</p>
        </div>
      </div>

      {!isApproved ? (
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <p className="text-muted-foreground">
            Vous devez être approuvé pour publier des ventes.
          </p>
        </div>
      ) : saleStep === 1 ? (
        <form onSubmit={handleCreateSaleStep1} className="space-y-6">
          <div className="space-y-2">
            <Label>Type de Propriété *</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'Maison', label: 'Maison', icon: Home },
                { value: 'Terrain', label: 'Terrain', icon: Trees },
                { value: 'Appartement', label: 'Appartement', icon: Building },
                { value: 'Villa', label: 'Villa', icon: Home },
                { value: 'Immeuble', label: 'Immeuble', icon: Building },
                { value: 'Bureau', label: 'Bureau/Commerce', icon: Building }
              ].map((type) => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.value}
                    type="button"
                    variant={saleForm.property_type === type.value ? 'default' : 'outline'}
                    onClick={() => setSaleForm({ ...saleForm, property_type: type.value })}
                    className={`h-16 flex-col gap-1 ${saleForm.property_type === type.value ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{type.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Titre de l'Annonce *</Label>
            <Input
              value={saleForm.title}
              onChange={(e) => setSaleForm({ ...saleForm, title: e.target.value })}
              required
              placeholder="Ex: Belle villa avec jardin à Kipé"
              data-testid="sale-title"
            />
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={saleForm.description}
              onChange={(e) => setSaleForm({ ...saleForm, description: e.target.value })}
              required
              rows={4}
              placeholder="Décrivez votre propriété..."
              data-testid="sale-description"
            />
          </div>

          <div className="space-y-2">
            <Label>Localisation *</Label>
            <Input
              value={saleForm.location}
              onChange={(e) => setSaleForm({ ...saleForm, location: e.target.value })}
              required
              placeholder="Quartier, Commune, Ville"
              data-testid="sale-location"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prix de Vente (GNF) *</Label>
              <Input
                type="number"
                value={saleForm.sale_price}
                onChange={(e) => setSaleForm({ ...saleForm, sale_price: e.target.value })}
                required
                placeholder="500000000"
                data-testid="sale-price"
              />
            </div>
            <div className="space-y-2">
              <Label>Surface (m²)</Label>
              <Input
                value={saleForm.surface_area}
                onChange={(e) => setSaleForm({ ...saleForm, surface_area: e.target.value })}
                placeholder="150 m²"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nombre de Pièces</Label>
              <Input
                type="number"
                value={saleForm.num_rooms}
                onChange={(e) => setSaleForm({ ...saleForm, num_rooms: e.target.value })}
                placeholder="4"
              />
            </div>
            <div className="space-y-2">
              <Label>Salles de Bain</Label>
              <Input
                type="number"
                value={saleForm.num_bathrooms}
                onChange={(e) => setSaleForm({ ...saleForm, num_bathrooms: e.target.value })}
                placeholder="2"
              />
            </div>
            <div className="space-y-2">
              <Label>Année Construction</Label>
              <Input
                type="number"
                value={saleForm.year_built}
                onChange={(e) => setSaleForm({ ...saleForm, year_built: e.target.value })}
                placeholder="2020"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Équipements</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={saleForm.has_garage ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSaleForm({ ...saleForm, has_garage: !saleForm.has_garage })}
                className={saleForm.has_garage ? 'bg-orange-600 hover:bg-orange-700' : ''}
              >
                <Car className="h-4 w-4 mr-1" /> Garage
              </Button>
              <Button
                type="button"
                variant={saleForm.has_garden ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSaleForm({ ...saleForm, has_garden: !saleForm.has_garden })}
                className={saleForm.has_garden ? 'bg-orange-600 hover:bg-orange-700' : ''}
              >
                <Trees className="h-4 w-4 mr-1" /> Jardin
              </Button>
              <Button
                type="button"
                variant={saleForm.has_pool ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSaleForm({ ...saleForm, has_pool: !saleForm.has_pool })}
                className={saleForm.has_pool ? 'bg-orange-600 hover:bg-orange-700' : ''}
              >
                <Waves className="h-4 w-4 mr-1" /> Piscine
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <Label className="font-medium">Prix Négociable</Label>
              <p className="text-sm text-muted-foreground">
                {saleForm.is_negotiable ? 'Le prix est négociable' : 'Prix ferme'}
              </p>
            </div>
            <Switch
              checked={saleForm.is_negotiable}
              onCheckedChange={(checked) => setSaleForm({ ...saleForm, is_negotiable: checked })}
            />
          </div>

          <Button type="submit" className="w-full h-14 bg-orange-600 hover:bg-orange-700" data-testid="sale-submit-step1">
            Continuer - Photos
          </Button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            <Label className="font-heading font-bold">Photos de la Propriété</Label>
            <input
              id="company-sale-photos"
              type="file"
              accept="image/*"
              multiple
              onChange={handleSalePhotoSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('company-sale-photos').click()}
              className="w-full h-14 gap-2 rounded-xl border-dashed border-2"
            >
              <Upload className="h-5 w-5" />
              Ajouter des Photos ({salePhotos.length})
            </Button>

            {salePhotoPreviewUrls.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                {salePhotoPreviewUrls.map((url, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img
                      src={url}
                      alt={`Aperçu ${index + 1}`}
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => removeSalePhoto(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documents Section */}
          <div className="space-y-4 p-6 bg-slate-50 rounded-2xl">
            <h4 className="font-heading font-bold text-slate-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              Documents Légaux Requis
            </h4>

            {/* Titre Foncier */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <FileText className="h-4 w-4 text-red-500" />
                Titre Foncier *
              </Label>
              <div className="flex gap-2">
                <input
                  id="company-titre-foncier"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleSaleDocumentSelect('titre_foncier', e)}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('company-titre-foncier').click()}
                  className="flex-1 h-12 gap-2 rounded-xl"
                >
                  <Upload className="h-4 w-4" />
                  {saleDocumentNames.titre_foncier || 'Choisir le fichier'}
                </Button>
                {saleDocuments.titre_foncier && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSaleDocument('titre_foncier')}
                    className="text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Document Ministère de l'Habitat */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Building className="h-4 w-4 text-amber-500" />
                Document du Ministère de l'Habitat *
              </Label>
              <div className="flex gap-2">
                <input
                  id="company-ministry-doc"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleSaleDocumentSelect('document_ministere_habitat', e)}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('company-ministry-doc').click()}
                  className="flex-1 h-12 gap-2 rounded-xl"
                >
                  <Upload className="h-4 w-4" />
                  {saleDocumentNames.document_ministere_habitat || 'Choisir le fichier'}
                </Button>
                {saleDocuments.document_ministere_habitat && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSaleDocument('document_ministere_habitat')}
                    className="text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Document du Bâtiment */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Home className="h-4 w-4 text-blue-500" />
                Document du Bâtiment (Permis de construire, Plan, etc.) *
              </Label>
              <div className="flex gap-2">
                <input
                  id="company-building-doc"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleSaleDocumentSelect('document_batiment', e)}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('company-building-doc').click()}
                  className="flex-1 h-12 gap-2 rounded-xl"
                >
                  <Upload className="h-4 w-4" />
                  {saleDocumentNames.document_batiment || 'Choisir le fichier'}
                </Button>
                {saleDocuments.document_batiment && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSaleDocument('document_batiment')}
                    className="text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Autres Documents */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                Autres Documents (Facultatif)
              </Label>
              <input
                id="company-additional-docs"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleSaleDocumentSelect('documents_additionnels', e)}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('company-additional-docs').click()}
                className="w-full h-12 gap-2 rounded-xl"
              >
                <Upload className="h-4 w-4" />
                Ajouter un Document
              </Button>
              {saleDocumentNames.documents_additionnels.length > 0 && (
                <div className="space-y-2 mt-2">
                  {saleDocumentNames.documents_additionnels.map((name, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg">
                      <span className="text-sm text-slate-600 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSaleDocument('documents_additionnels', index)}
                        className="text-red-500 h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaleStep(1)}
              className="flex-1 h-14"
            >
              Retour
            </Button>
            <Button
              type="button"
              onClick={handleCreateSaleStep2}
              className="flex-1 h-14 bg-orange-600 hover:bg-orange-700"
              disabled={uploadingSaleFiles}
              data-testid="sale-submit-step2"
            >
              {uploadingSaleFiles ? (
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

export default CompanyCreateSaleTab;
