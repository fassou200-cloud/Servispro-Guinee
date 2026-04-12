import { Card } from '@/components/ui/card';
import { getImageUrl } from '@/utils/imageUrl';
import { Building, Camera, Eye, Image as ImageIcon, Loader2, Package, Pencil, Save, Store, Trash2, X } from 'lucide-react';

// Product types for Makiti marketplace
const ADMIN_PRODUCT_TYPES = [
  { value: 'chaussures', label: 'Chaussures' },
  { value: 'vetements', label: 'Vêtements & Mode' },
  { value: 'voitures', label: 'Voitures' },
  { value: 'cosmetiques', label: 'Cosmétiques' },
  { value: 'electronique', label: 'Électronique' },
  { value: 'alimentation', label: 'Alimentation' },
  { value: 'mobilier', label: 'Mobilier' },
  { value: 'autre', label: 'Autre' },
];

const AdminMakitiTab = ({
  deletingMakitiPhoto,
  editingMakitiProduct,
  expandedMakitiPhotos,
  loadingMakiti,
  makitiCategoryFilter,
  makitiEditData,
  makitiProducts,
  setEditingMakitiProduct,
  setExpandedMakitiPhotos,
  setMakitiCategoryFilter,
  setMakitiEditData,
  handleMakitiDeletePhoto,
  handleMakitiDeleteProduct,
  handleMakitiUpdateProduct
}) => {
  // Filter products based on category
  const filteredMakitiProducts = makitiCategoryFilter === '_none'
    ? makitiProducts.filter(p => !p.product_type)
    : makitiCategoryFilter
      ? makitiProducts.filter(p => p.product_type === makitiCategoryFilter)
      : makitiProducts;

  return (
    <div className="space-y-6" data-testid="admin-makiti-section">
      {/* Category Filter Bar */}
      <Card className="bg-slate-800 border-slate-700 p-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{scrollbarWidth: 'none'}}>
          <button
            onClick={() => setMakitiCategoryFilter('')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              makitiCategoryFilter === '' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            data-testid="admin-cat-all"
          >
            <Package className="h-4 w-4" /> Tous ({makitiProducts.length})
          </button>
          {ADMIN_PRODUCT_TYPES.map(cat => {
            const count = makitiProducts.filter(p => p.product_type === cat.value).length;
            return (
              <button
                key={cat.value}
                onClick={() => setMakitiCategoryFilter(makitiCategoryFilter === cat.value ? '' : cat.value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  makitiCategoryFilter === cat.value ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                data-testid={`admin-cat-${cat.value}`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
          {(() => {
            const uncategorized = makitiProducts.filter(p => !p.product_type).length;
            return uncategorized > 0 ? (
              <button
                onClick={() => setMakitiCategoryFilter('_none')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  makitiCategoryFilter === '_none' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Sans catégorie ({uncategorized})
              </button>
            ) : null;
          })()}
        </div>
      </Card>

      {loadingMakiti ? (
        <Card className="p-8 bg-slate-800 border-slate-700 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-2" />
          <p className="text-slate-400">Chargement des produits...</p>
        </Card>
      ) : (
        <Card className="bg-slate-800 border-slate-700">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              Produits {makitiCategoryFilter && makitiCategoryFilter !== '_none' ? `— ${ADMIN_PRODUCT_TYPES.find(t => t.value === makitiCategoryFilter)?.label}` : makitiCategoryFilter === '_none' ? '— Sans catégorie' : ''} ({filteredMakitiProducts.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-700">
            {filteredMakitiProducts.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500">Aucun produit dans cette catégorie</p>
              </div>
            ) : filteredMakitiProducts.map(product => {
              const isEditing = editingMakitiProduct === product.id;
              const isPhotosExpanded = expandedMakitiPhotos === product.id;
              return (
                <div key={product.id} className="p-4" data-testid={`makiti-product-${product.id}`}>
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    <div
                      className="w-20 h-20 bg-slate-700 rounded-lg flex-shrink-0 relative cursor-pointer overflow-hidden"
                      onClick={() => setExpandedMakitiPhotos(isPhotosExpanded ? null : product.id)}
                    >
                      {product.photos?.length > 0 ? (
                        <img src={getImageUrl(product.photos[0])} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="h-6 w-6 text-slate-500" /></div>
                      )}
                      {product.photos?.length > 0 && (
                        <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[10px] px-1 rounded flex items-center gap-0.5">
                          <ImageIcon className="h-2.5 w-2.5" /> {product.photos.length}
                        </span>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input value={makitiEditData.name || ''} onChange={e => setMakitiEditData({...makitiEditData, name: e.target.value})} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm" placeholder="Nom" />
                          <textarea value={makitiEditData.description || ''} onChange={e => setMakitiEditData({...makitiEditData, description: e.target.value})} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm resize-none" rows={2} placeholder="Description" />
                          <div className="flex gap-2 flex-wrap">
                            <input type="number" value={makitiEditData.price || ''} onChange={e => setMakitiEditData({...makitiEditData, price: e.target.value})} className="w-28 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm" placeholder="Prix" />
                            <select value={makitiEditData.currency || 'GNF'} onChange={e => setMakitiEditData({...makitiEditData, currency: e.target.value})} className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm">
                              <option value="GNF">GNF</option>
                              <option value="EUR">EUR</option>
                              <option value="USD">USD</option>
                            </select>
                            <select value={makitiEditData.product_type || ''} onChange={e => setMakitiEditData({...makitiEditData, product_type: e.target.value})} className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm" data-testid={`makiti-edit-type-${product.id}`}>
                              <option value="">Catégorie...</option>
                              {ADMIN_PRODUCT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                          <div className="flex gap-3 flex-wrap">
                            <label className="flex items-center gap-1 text-xs text-slate-300"><input type="checkbox" checked={makitiEditData.price_on_request || false} onChange={e => setMakitiEditData({...makitiEditData, price_on_request: e.target.checked})} /> Prix sur demande</label>
                            <label className="flex items-center gap-1 text-xs text-slate-300"><input type="checkbox" checked={makitiEditData.is_negotiable || false} onChange={e => setMakitiEditData({...makitiEditData, is_negotiable: e.target.checked})} /> Négociable</label>
                            <label className="flex items-center gap-1 text-xs text-slate-300"><input type="checkbox" checked={makitiEditData.is_available !== false} onChange={e => setMakitiEditData({...makitiEditData, is_available: e.target.checked})} /> En stock</label>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleMakitiUpdateProduct(product.id)} className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded font-medium flex items-center gap-1"><Save className="h-3 w-3" /> Enregistrer</button>
                            <button onClick={() => setEditingMakitiProduct(null)} className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded">Annuler</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-medium text-white text-sm truncate">{product.name}</h5>
                            {product.product_type && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded-full font-medium">
                                {ADMIN_PRODUCT_TYPES.find(t => t.value === product.product_type)?.label || product.product_type}
                              </span>
                            )}
                            {!product.product_type && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-full font-medium">Sans catégorie</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1">{product.description}</p>
                          <p className="text-teal-400 font-bold text-sm mt-1">
                            {product.price_on_request ? <span className="text-blue-400 italic">Prix sur demande</span> : <>{Number(product.price || 0).toLocaleString('fr-FR')} {product.currency || 'GNF'}</>}
                            {product.is_negotiable && <span className="text-xs font-normal text-slate-500 ml-1">(Négociable)</span>}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1"><Store className="h-3 w-3 text-teal-400" />{product.shop_name || 'Boutique'}</span>
                            {product.company_name && <span className="flex items-center gap-1"><Building className="h-3 w-3 text-purple-400" />{product.company_name}</span>}
                            <span className={`px-1.5 py-0.5 rounded-full ${product.is_available ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                              {product.is_available ? 'En stock' : 'Rupture'}
                            </span>
                            <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{product.total_views || 0}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    {!isEditing && (
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button onClick={() => { setEditingMakitiProduct(product.id); setMakitiEditData({ name: product.name, description: product.description, price: product.price, currency: product.currency || 'GNF', price_on_request: product.price_on_request, product_type: product.product_type || '', is_negotiable: product.is_negotiable, is_available: product.is_available }); }} className="p-1.5 bg-teal-600/20 hover:bg-teal-600/40 text-teal-400 rounded" title="Modifier">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleMakitiDeleteProduct(product.id)} className="p-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded" title="Supprimer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Photos gallery */}
                  {isPhotosExpanded && product.photos?.length > 0 && (
                    <div className="mt-3 bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-slate-400">Photos ({product.photos.length})</p>
                        <button onClick={() => setExpandedMakitiPhotos(null)} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {product.photos.map((photo, idx) => (
                          <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-600">
                            <img src={getImageUrl(photo)} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={() => handleMakitiDeletePhoto(product.id, idx)}
                              disabled={deletingMakitiPhoto === `${product.id}-${idx}`}
                              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {deletingMakitiPhoto === `${product.id}-${idx}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isPhotosExpanded && product.photos?.length > 0 && (
                    <button onClick={() => setExpandedMakitiPhotos(product.id)} className="mt-2 text-[11px] text-teal-400 hover:text-teal-300">
                      <Camera className="h-3 w-3 inline mr-1" />Voir les {product.photos.length} photo(s)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminMakitiTab;
