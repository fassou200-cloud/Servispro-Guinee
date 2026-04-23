import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getImageUrl } from '@/utils/imageUrl';
import { Building, Car, Eye, Home, MapPin, Plus, Trash2, Trees } from 'lucide-react';

const CompanySalesTab = ({ deleteSale, getImageUrl, isApproved, sales, setActiveTab }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-heading font-bold text-foreground">
          Mes Ventes ({sales.length})
        </h3>
        {isApproved && (
          <Button onClick={() => setActiveTab('create-sale')} className="gap-2 bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4" /> Nouvelle Vente
          </Button>
        )}
      </div>

      {sales.length === 0 ? (
        <Card className="p-8 text-center">
          <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucune propriété en vente</p>
          {isApproved && (
            <Button className="mt-4 bg-orange-600 hover:bg-orange-700" onClick={() => setActiveTab('create-sale')}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une propriété
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sales.map(sale => (
            <Card key={sale.id} className="overflow-hidden">
              {sale.photos && sale.photos.length > 0 && (
                <img
                  src={getImageUrl(sale.photos[0])}
                  alt={sale.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700">
                      {sale.property_type}
                    </span>
                    <h4 className="text-lg font-heading font-bold text-foreground mt-2">{sale.title}</h4>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${sale.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {sale.is_available ? 'Disponible' : 'Vendu'}
                  </span>
                </div>
                <p className="text-foreground text-sm mb-4 line-clamp-2">{sale.description}</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {sale.location}
                  </span>
                  <span className="text-orange-600 font-bold">
                    {sale.sale_price?.toLocaleString()} GNF
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {sale.surface_area && <span className="flex items-center gap-1"><Building className="h-3 w-3" /> {sale.surface_area}</span>}
                  {sale.num_rooms && <span className="flex items-center gap-1"><Home className="h-3 w-3" /> {sale.num_rooms} pièces</span>}
                  {sale.has_garage && <span className="flex items-center gap-1"><Car className="h-3 w-3" /> Garage</span>}
                  {sale.has_garden && <span className="flex items-center gap-1"><Trees className="h-3 w-3" /> Jardin</span>}
                </div>
                <div className="mt-4 pt-4 border-t flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-4 w-4 mr-1" /> Voir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => deleteSale(sale.id)}
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

export default CompanySalesTab;
