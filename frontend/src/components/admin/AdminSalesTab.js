import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { getImageUrl } from '@/utils/imageUrl';
import { Building, CheckCircle, Clock, DollarSign, ExternalLink, Eye, FileText, Home, Loader2, MapPin, Pencil, Trash2, Users, X, XCircle } from 'lucide-react';

const AdminSalesTab = ({
  editingSalePrice,
  propertySales,
  salePriceValue,
  selectedSale,
  uploadingAdminDoc,
  setEditingSalePrice,
  setPropertySales,
  setSalePriceValue,
  setSelectedSale,
  fetchData,
  handleAdminDocUpload,
  handleDeleteAdminDoc,
  API,
  BACKEND_URL,
  adminApi
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h2 className="text-lg font-heading font-bold text-white mb-4">
          Propriétés à Vendre ({propertySales.length})
        </h2>
        {propertySales.length === 0 ? (
          <Card className="p-8 bg-slate-800 border-slate-700 text-center">
            <p className="text-slate-400">Aucune propriété à vendre</p>
          </Card>
        ) : (
          propertySales.map((sale) => (
            <Card
              key={sale.id}
              className={`p-4 bg-slate-800 border-slate-700 cursor-pointer transition-colors ${
                selectedSale?.id === sale.id ? 'border-emerald-500' : 'hover:border-slate-600'
              } ${sale.status === 'pending' ? 'border-l-4 border-l-orange-500' : ''}`}
              onClick={() => setSelectedSale(sale)}
            >
              <div className="flex gap-4">
                {sale.photos && sale.photos.length > 0 ? (
                  <img
                    src={getImageUrl(sale.photos[0])}
                    alt={sale.title}
                    className="w-24 h-20 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-24 h-20 bg-slate-700 rounded-lg flex items-center justify-center">
                    <Home className="h-8 w-8 text-slate-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-white truncate">{sale.title}</h3>
                    <span className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium ${
                      sale.status === 'pending' ? 'bg-orange-600/20 text-orange-400' :
                      sale.status === 'approved' ? 'bg-green-600/20 text-green-400' :
                      sale.status === 'rejected' ? 'bg-red-600/20 text-red-400' :
                      sale.status === 'sold' ? 'bg-purple-600/20 text-purple-400' :
                      'bg-emerald-600/20 text-emerald-400'
                    }`}>
                      {sale.status === 'pending' ? 'En attente' :
                       sale.status === 'approved' ? 'Approuvé' :
                       sale.status === 'rejected' ? 'Rejeté' :
                       sale.status === 'sold' ? 'Vendu' : sale.property_type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">{sale.agent_name}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <MapPin className="h-3 w-3" />
                    {sale.location}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-emerald-400 font-bold text-sm">
                      {Number(sale.sale_price).toLocaleString('fr-FR')} GNF
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Sale Detail */}
      <div>
        <h2 className="text-lg font-heading font-bold text-white mb-4">Détails de la Vente</h2>
        {selectedSale ? (
          <Card className="p-6 bg-slate-800 border-slate-700">
            {selectedSale.photos && selectedSale.photos.length > 0 && (
              <div className="mb-4">
                <img
                  src={getImageUrl(selectedSale.photos[0])}
                  alt={selectedSale.title}
                  className="w-full h-48 object-cover rounded-lg mb-2"
                />
                {selectedSale.photos.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {selectedSale.photos.slice(1).map((photo, idx) => (
                      <img
                        key={idx}
                        src={getImageUrl(photo)}
                        alt={`Photo ${idx + 2}`}
                        className="w-16 h-16 object-cover rounded flex-shrink-0"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedSale.title}</h3>
                <p className="text-emerald-400">{selectedSale.property_type}</p>
              </div>
              <div className="text-right">
                {editingSalePrice ? (
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={salePriceValue}
                        onChange={(e) => setSalePriceValue(e.target.value)}
                        className="w-40 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-emerald-400 text-right font-bold text-lg focus:outline-none focus:border-teal-500"
                        data-testid="sale-price-input"
                      />
                      <span className="text-emerald-400 font-bold text-sm">GNF</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={async () => {
                          try {
                            await adminApi.put(`${API}/admin/property-sales/${selectedSale.id}/update-price`, { sale_price: Number(salePriceValue) });
                            toast.success('Prix mis à jour');
                            const updated = { ...selectedSale, sale_price: Number(salePriceValue) };
                            setSelectedSale(updated);
                            setPropertySales(prev => prev.map(s => s.id === selectedSale.id ? updated : s));
                            setEditingSalePrice(false);
                          } catch (err) {
                            toast.error(err.response?.data?.detail || 'Erreur');
                          }
                        }}
                        className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded font-medium"
                        data-testid="save-sale-price-btn"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => setEditingSalePrice(false)}
                        className="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded"
                      >
                        X
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-emerald-400">
                      {Number(selectedSale.sale_price).toLocaleString('fr-FR')} GNF
                    </p>
                    <button
                      onClick={() => { setEditingSalePrice(true); setSalePriceValue(selectedSale.sale_price || 0); }}
                      className="p-1 text-slate-400 hover:text-teal-400 transition-colors"
                      data-testid="edit-sale-price-btn"
                      title="Modifier le prix"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {selectedSale.is_negotiable && (
                  <span className="text-xs text-amber-400">Négociable</span>
                )}
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="h-4 w-4 text-slate-400" />
                {selectedSale.location}
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Users className="h-4 w-4 text-slate-400" />
                {selectedSale.agent_name} ({selectedSale.agent_phone})
              </div>
              {selectedSale.surface_area && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Home className="h-4 w-4 text-slate-400" />
                  Surface: {selectedSale.surface_area}
                </div>
              )}
              {selectedSale.num_rooms && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Building className="h-4 w-4 text-slate-400" />
                  {selectedSale.num_rooms} pièce(s) • {selectedSale.num_bathrooms || 0} SDB
                </div>
              )}
            </div>

            {/* Features */}
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedSale.is_available ? (
                <span className="px-3 py-1 rounded text-sm bg-green-600/20 text-green-400">À Vendre</span>
              ) : (
                <span className="px-3 py-1 rounded text-sm bg-red-600/20 text-red-400">Vendu</span>
              )}
              {selectedSale.has_garage && <span className="px-3 py-1 rounded text-sm bg-slate-700 text-slate-300">Garage</span>}
              {selectedSale.has_garden && <span className="px-3 py-1 rounded text-sm bg-slate-700 text-slate-300">Jardin</span>}
              {selectedSale.has_pool && <span className="px-3 py-1 rounded text-sm bg-slate-700 text-slate-300">Piscine</span>}
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Description</h4>
              <p className="text-slate-400 text-sm">{selectedSale.description}</p>
            </div>

            {/* Documents Section for Admin */}
            <div className="mb-4 p-4 bg-slate-700/50 rounded-lg">
              <h4 className="text-sm font-bold text-slate-300 uppercase mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents Légaux
              </h4>
              <div className="space-y-2">
                {selectedSale.titre_foncier ? (
                  <a
                    href={`${BACKEND_URL}${selectedSale.titre_foncier}`}
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

                {selectedSale.document_ministere_habitat ? (
                  <a
                    href={`${BACKEND_URL}${selectedSale.document_ministere_habitat}`}
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
                ) : selectedSale.registration_ministere ? (
                  <a
                    href={`${BACKEND_URL}${selectedSale.registration_ministere}`}
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

                {selectedSale.document_batiment ? (
                  <a
                    href={`${BACKEND_URL}${selectedSale.document_batiment}`}
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

                {selectedSale.seller_id_document && (
                  <a
                    href={`${BACKEND_URL}${selectedSale.seller_id_document}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Pièce d'Identité Vendeur
                    </span>
                    <Eye className="h-4 w-4 text-slate-400" />
                  </a>
                )}

                {selectedSale.documents_additionnels && selectedSale.documents_additionnels.length > 0 && (
                  <div className="pt-2 border-t border-slate-600">
                    <span className="text-xs text-slate-400 mb-2 block">Autres Documents</span>
                    {selectedSale.documents_additionnels.map((doc, idx) => (
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

            {/* Admin Documents Upload Section */}
            <div className="mb-4 p-4 bg-slate-700/50 rounded-lg border border-amber-500/30">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-amber-400 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents Admin
                </h4>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => handleAdminDocUpload(selectedSale.id, e)}
                    disabled={uploadingAdminDoc}
                  />
                  <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    uploadingAdminDoc
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}>
                    {uploadingAdminDoc ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <FileText className="h-3 w-3" />
                        Ajouter un document
                      </>
                    )}
                  </span>
                </label>
              </div>

              {/* List of admin uploaded documents */}
              {selectedSale.admin_documents && selectedSale.admin_documents.length > 0 ? (
                <div className="space-y-2">
                  {selectedSale.admin_documents.map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                    >
                      <a
                        href={`${BACKEND_URL}${doc}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"
                      >
                        <FileText className="h-4 w-4 text-amber-400" />
                        Document Admin {idx + 1}
                        <ExternalLink className="h-3 w-3 text-slate-500" />
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAdminDoc(selectedSale.id, doc)}
                        className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-2">
                  Aucun document admin ajouté
                </p>
              )}
              <p className="text-xs text-slate-500 mt-2">
                Formats acceptés: PDF, JPG, PNG, WEBP (max 10MB)
              </p>
            </div>

            <div className="text-xs text-slate-500 mb-4">
              Créée le {new Date(selectedSale.created_at).toLocaleDateString('fr-FR')}
            </div>

            {/* Status Badge */}
            <div className="mb-4 p-3 rounded-lg border" style={{
              backgroundColor: selectedSale.status === 'pending' ? 'rgba(249, 115, 22, 0.1)' :
                              selectedSale.status === 'approved' ? 'rgba(34, 197, 94, 0.1)' :
                              selectedSale.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' :
                              'rgba(168, 85, 247, 0.1)',
              borderColor: selectedSale.status === 'pending' ? 'rgba(249, 115, 22, 0.3)' :
                          selectedSale.status === 'approved' ? 'rgba(34, 197, 94, 0.3)' :
                          selectedSale.status === 'rejected' ? 'rgba(239, 68, 68, 0.3)' :
                          'rgba(168, 85, 247, 0.3)'
            }}>
              <p className={`text-sm font-medium flex items-center gap-2 ${
                selectedSale.status === 'pending' ? 'text-orange-400' :
                selectedSale.status === 'approved' ? 'text-green-400' :
                selectedSale.status === 'rejected' ? 'text-red-400' :
                'text-purple-400'
              }`}>
                {selectedSale.status === 'pending' && <Clock className="h-4 w-4" />}
                {selectedSale.status === 'approved' && <CheckCircle className="h-4 w-4" />}
                {selectedSale.status === 'rejected' && <XCircle className="h-4 w-4" />}
                {selectedSale.status === 'sold' && <DollarSign className="h-4 w-4" />}
                Statut: {selectedSale.status === 'pending' ? 'En attente d\'approbation' :
                         selectedSale.status === 'approved' ? 'Approuvé - Visible sur le site' :
                         selectedSale.status === 'rejected' ? 'Rejeté' :
                         'Vendu'}
              </p>
            </div>

            {/* Action Buttons */}
            {selectedSale.status === 'pending' && (
              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <Button
                  onClick={async () => {
                    try {
                      await adminApi.put(`${API}/admin/property-sales/${selectedSale.id}/approve`);
                      toast.success('Vente immobilière approuvée !');
                      fetchData();
                      setSelectedSale({...selectedSale, status: 'approved'});
                    } catch (error) {
                      toast.error('Erreur lors de l\'approbation');
                    }
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approuver
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      await adminApi.put(`${API}/admin/property-sales/${selectedSale.id}/reject`);
                      toast.success('Vente immobilière rejetée');
                      fetchData();
                      setSelectedSale({...selectedSale, status: 'rejected'});
                    } catch (error) {
                      toast.error('Erreur lors du rejet');
                    }
                  }}
                  variant="outline"
                  className="flex-1 border-red-600 text-red-400 hover:bg-red-600 hover:text-white gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Rejeter
                </Button>
              </div>
            )}

            {selectedSale.status === 'approved' && (
              <div className="pt-4 border-t border-slate-700">
                <Button
                  onClick={async () => {
                    try {
                      await adminApi.put(`${API}/admin/property-sales/${selectedSale.id}/sold`);
                      toast.success('Propriété marquée comme vendue !');
                      fetchData();
                      setSelectedSale({...selectedSale, status: 'sold', is_available: false});
                    } catch (error) {
                      toast.error('Erreur lors de la mise à jour');
                    }
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
                >
                  <DollarSign className="h-4 w-4" />
                  Marquer comme Vendu
                </Button>
              </div>
            )}

            {selectedSale.status === 'sold' && (
              <div className="p-3 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                <p className="text-sm text-purple-400 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Cette propriété a été vendue
                  {selectedSale.sold_at && ` le ${new Date(selectedSale.sold_at).toLocaleDateString('fr-FR')}`}
                </p>
              </div>
            )}

            {/* Delete Button */}
            <div className="pt-4 border-t border-slate-700 mt-4">
              <Button
                onClick={async () => {
                  if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est irréversible.')) return;
                  try {
                    await adminApi.delete(`${API}/admin/property-sales/${selectedSale.id}`);
                    toast.success('Annonce supprimée avec succès');
                    setPropertySales(prev => prev.filter(s => s.id !== selectedSale.id));
                    setSelectedSale(null);
                  } catch (error) {
                    console.error('Delete error:', error.response?.status, error.response?.data);
                    const msg = error.response?.data?.detail || error.response?.data?.message || 'Erreur lors de la suppression';
                    toast.error(msg);
                  }
                }}
                variant="outline"
                className="w-full border-red-600/50 text-red-400 hover:bg-red-600 hover:text-white gap-2"
                data-testid="delete-sale-btn"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer l'annonce
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-8 bg-slate-800 border-slate-700 text-center">
            <Home className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Sélectionnez une propriété pour voir ses détails</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminSalesTab;
