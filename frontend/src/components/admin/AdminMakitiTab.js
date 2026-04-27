import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getImageUrl } from '@/utils/imageUrl';
import { toast } from 'sonner';
import {
  Building, Camera, Eye, Image as ImageIcon, Loader2, Package, Pencil, Save, Store, Trash2, X,
  Clock, Percent, Plus, Search, Tag, CalendarClock, Power, Upload
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ADMIN_PRODUCT_TYPES = [
  { value: 'chaussures', label: 'Chaussures' },
  { value: 'vetements', label: 'Vêtements & Mode' },
  { value: 'voitures', label: 'Voitures' },
  { value: 'cosmetiques', label: 'Cosmétiques' },
  { value: 'electronique', label: 'Électronique' },
  { value: 'alimentation', label: 'Alimentation' },
  { value: 'mobilier', label: 'Mobilier' },
  { value: 'bijoux', label: 'Bijoux' },
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
  handleMakitiUpdateProduct,
  loadMakitiProducts,
  adminApi,
}) => {
  const [offers, setOffers] = useState([]);
  const [offerSettings, setOfferSettings] = useState({ expiration_date: '', is_active: false });
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [searchProduct, setSearchProduct] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allSearchResults, setAllSearchResults] = useState(0);
  const [addingDiscount, setAddingDiscount] = useState({});
  const [showOfferSection, setShowOfferSection] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(null);
  const photoInputRef = useRef(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    loadOffers();
    loadOfferSettings();
  }, []);

  const loadOffers = async () => {
    setLoadingOffers(true);
    try {
      const res = await axios.get(`${API}/admin/limited-offers`, { headers });
      setOffers(res.data);
    } catch (e) { console.error(e); }
    finally { setLoadingOffers(false); }
  };

  const loadOfferSettings = async () => {
    try {
      const res = await axios.get(`${API}/admin/limited-offers/settings`, { headers });
      setOfferSettings({
        expiration_date: res.data.expiration_date || '',
        is_active: res.data.is_active || false,
      });
    } catch (e) { console.error(e); }
  };

  const saveOfferSettings = async () => {
    try {
      await axios.put(`${API}/admin/limited-offers/settings`, offerSettings, { headers });
      toast.success('Paramètres des offres mis à jour');
    } catch (e) { toast.error("Erreur lors de la mise à jour"); }
  };

  const searchProducts = async (q) => {
    setSearchProduct(q);
    if (q.length < 2) { setSearchResults([]); setAllSearchResults(0); return; }
    try {
      const res = await axios.get(`${API}/marketplace/products?search=${encodeURIComponent(q)}`);
      const offerProductIds = new Set(offers.map(o => o.product_id));
      setAllSearchResults(res.data.length);
      setSearchResults(res.data.filter(p => !offerProductIds.has(p.id)).slice(0, 10));
    } catch (e) { console.error(e); }
  };

  const addOffer = async (productId, discount) => {
    if (discount === '' || discount === undefined || discount === null || discount < 0 || discount > 99) {
      toast.error('Réduction entre 0% et 99%'); return;
    }
    try {
      await axios.post(`${API}/admin/limited-offers`, {
        product_id: productId,
        discount_percent: parseInt(discount),
      }, { headers });
      toast.success('Produit ajouté aux offres');
      setSearchProduct('');
      setSearchResults([]);
      setAddingDiscount({});
      loadOffers();
    } catch (e) { toast.error(e.response?.data?.detail || 'Erreur'); }
  };

  const removeOffer = async (offerId) => {
    try {
      await axios.delete(`${API}/admin/limited-offers/${offerId}`, { headers });
      toast.success('Offre supprimée');
      setOffers(offers.filter(o => o.id !== offerId));
    } catch (e) { toast.error('Erreur lors de la suppression'); }
  };

  const updateOfferDiscount = async (offerId, newDiscount) => {
    try {
      await axios.put(`${API}/admin/limited-offers/${offerId}`, {
        discount_percent: parseInt(newDiscount),
      }, { headers });
      toast.success('Réduction mise à jour');
      loadOffers();
    } catch (e) { toast.error('Erreur'); }
  };

  const formatPrice = (p) => new Intl.NumberFormat('fr-FR').format(p || 0);

  const handleAdminPhotoUpload = async (productId, files) => {
    if (!files || files.length === 0) return;
    setUploadingPhoto(productId);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      const res = await axios.post(`${API}/admin/products/${productId}/photos`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`${files.length} photo(s) ajoutée(s)`);
      // Update product photos in local state
      if (typeof loadMakitiProducts === 'function') {
        loadMakitiProducts();
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors de l\'upload');
    } finally {
      setUploadingPhoto(null);
    }
  };

  // Filter products
  const filteredMakitiProducts = makitiCategoryFilter === '_none'
    ? makitiProducts.filter(p => !p.product_type)
    : makitiCategoryFilter
      ? makitiProducts.filter(p => p.product_type === makitiCategoryFilter)
      : makitiProducts;

  return (
    <div className="space-y-6" data-testid="admin-makiti-section">

      {/* ════════ OFFRES A DUREE LIMITEE ════════ */}
      <Card className="bg-gradient-to-r from-orange-600 to-amber-500 border-0 p-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tag className="h-6 w-6" />
            <div>
              <h3 className="text-lg font-bold">Offres à Durée Limitée</h3>
              <p className="text-orange-100 text-sm">{offers.length} produit(s) en promotion</p>
            </div>
          </div>
          <button
            onClick={() => setShowOfferSection(!showOfferSection)}
            className="text-white/80 hover:text-white text-sm"
          >
            {showOfferSection ? 'Masquer' : 'Afficher'}
          </button>
        </div>
      </Card>

      {showOfferSection && (
        <div className="space-y-4">
          {/* Global Settings */}
          <Card className="bg-slate-800 border-slate-700 p-5">
            <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-orange-400" />
              Paramètres globaux
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-slate-400 text-xs block mb-1">Date d'expiration</label>
                <Input
                  type="datetime-local"
                  value={offerSettings.expiration_date ? offerSettings.expiration_date.slice(0, 16) : ''}
                  onChange={(e) => setOfferSettings({ ...offerSettings, expiration_date: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                  className="bg-slate-700 border-slate-600 text-white"
                  data-testid="offer-expiration-date"
                />
              </div>
              <div className="flex items-end gap-3">
                <button
                  onClick={() => {
                    const next = !offerSettings.is_active;
                    setOfferSettings({ ...offerSettings, is_active: next });
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    offerSettings.is_active ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-300'
                  }`}
                  data-testid="offer-toggle-active"
                >
                  <Power className="h-4 w-4" />
                  {offerSettings.is_active ? 'Actif' : 'Inactif'}
                </button>
              </div>
              <div className="flex items-end">
                <button
                  onClick={saveOfferSettings}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                  data-testid="offer-save-settings"
                >
                  <Save className="h-4 w-4" />
                  Enregistrer
                </button>
              </div>
            </div>
          </Card>

          {/* Search & Add Product */}
          <Card className="bg-slate-800 border-slate-700 p-5">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4 text-green-400" />
              Ajouter un produit en promotion
            </h4>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher un produit par nom..."
                value={searchProduct}
                onChange={(e) => searchProducts(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
                data-testid="offer-search-product"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map(product => (
                  <div key={product.id} className="flex items-center gap-3 bg-slate-700 rounded-lg p-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-600 shrink-0">
                      {product.photos?.[0] ? (
                        <img src={getImageUrl(product.photos[0])} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="h-5 w-5 text-slate-400" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{product.name}</p>
                      <p className="text-slate-400 text-xs">{product.shop_name} — {formatPrice(product.price)} {product.currency || 'GNF'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => addOffer(product.id, 0)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap"
                        data-testid={`offer-featured-btn-${product.id}`}
                      >
                        Mise en avant
                      </button>
                      <Input
                        type="number"
                        min="1"
                        max="99"
                        placeholder="%"
                        value={addingDiscount[product.id] ?? ''}
                        onChange={(e) => setAddingDiscount({ ...addingDiscount, [product.id]: e.target.value })}
                        className="w-14 bg-slate-600 border-slate-500 text-white text-center text-sm"
                        data-testid={`offer-discount-input-${product.id}`}
                      />
                      <button
                        onClick={() => addOffer(product.id, addingDiscount[product.id])}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap"
                        data-testid={`offer-add-btn-${product.id}`}
                      >
                        Promo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {searchProduct.length >= 2 && searchResults.length === 0 && (
              <p className="text-slate-400 text-sm mt-3 text-center py-3">
                {allSearchResults > 0
                  ? `${allSearchResults} produit(s) trouvé(s) pour "${searchProduct}" — tous déjà en promotion`
                  : `Aucun produit trouvé pour "${searchProduct}"`
                }
              </p>
            )}
          </Card>

          {/* Current Offers List */}
          <Card className="bg-slate-800 border-slate-700 p-5">
            <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Percent className="h-4 w-4 text-orange-400" />
              Produits en promotion ({offers.length})
            </h4>
            {loadingOffers ? (
              <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" /></div>
            ) : offers.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">Aucune offre. Recherchez et ajoutez des produits ci-dessus.</p>
            ) : (
              <div className="space-y-2">
                {offers.map(offer => {
                  const p = offer.product;
                  if (!p) return null;
                  const discounted = Math.round(p.price * (1 - offer.discount_percent / 100));
                  return (
                    <div key={offer.id} className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-3" data-testid={`offer-item-${offer.id}`}>
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-600 shrink-0">
                        {p.photos?.[0] ? (
                          <img src={getImageUrl(p.photos[0])} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Package className="h-6 w-6 text-slate-400" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {offer.discount_percent > 0 ? (
                            <>
                              <span className="text-slate-400 text-xs line-through">{formatPrice(p.price)} {p.currency || 'GNF'}</span>
                              <span className="text-green-400 text-sm font-bold">{formatPrice(discounted)} {p.currency || 'GNF'}</span>
                            </>
                          ) : (
                            <span className="text-orange-400 text-sm font-bold">{formatPrice(p.price)} {p.currency || 'GNF'}</span>
                          )}
                        </div>
                        <p className="text-slate-500 text-xs">{p.shop_name}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {offer.discount_percent > 0 ? (
                          <span className="bg-orange-500/20 text-orange-400 px-2.5 py-1 rounded-lg text-sm font-bold">-{offer.discount_percent}%</span>
                        ) : (
                          <span className="bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-lg text-xs font-medium">Mis en avant</span>
                        )}
                        <button
                          onClick={() => removeOffer(offer.id)}
                          className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                          data-testid={`offer-remove-${offer.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ════════ EXISTING MAKITI PRODUCT MANAGEMENT ════════ */}
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
            <Store className="h-4 w-4" /> Tous ({makitiProducts.length})
          </button>
          {ADMIN_PRODUCT_TYPES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setMakitiCategoryFilter(cat.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                makitiCategoryFilter === cat.value ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              data-testid={`admin-cat-${cat.value}`}
            >
              {cat.label} ({makitiProducts.filter(p => p.product_type === cat.value).length})
            </button>
          ))}
          <button
            onClick={() => setMakitiCategoryFilter('_none')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              makitiCategoryFilter === '_none' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Sans catégorie ({makitiProducts.filter(p => !p.product_type).length})
          </button>
        </div>
      </Card>

      {loadingMakiti ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto" /></div>
      ) : filteredMakitiProducts.length === 0 ? (
        <p className="text-slate-400 text-center py-8">Aucun produit dans cette catégorie</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMakitiProducts.map(product => (
            <Card key={product.id} className="bg-slate-800 border-slate-700 overflow-hidden" data-testid={`admin-product-${product.id}`}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-700 shrink-0">
                    {product.photos?.[0] ? (
                      <img src={getImageUrl(product.photos[0])} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="h-6 w-6 text-slate-500" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium text-sm truncate">{product.name}</h4>
                    <p className="text-slate-400 text-xs">{product.shop_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {product.price_on_request ? (
                        <span className="text-blue-400 text-xs italic">Prix sur demande</span>
                      ) : (
                        <span className="text-orange-400 text-sm font-bold">{formatPrice(product.price)} {product.currency || 'GNF'}</span>
                      )}
                      {product.product_type && (
                        <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded">{product.product_type}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {editingMakitiProduct === product.id ? (
                      <>
                        <button onClick={() => handleMakitiUpdateProduct(product.id)} className="text-green-400 hover:text-green-300 p-1"><Save className="h-4 w-4" /></button>
                        <button onClick={() => setEditingMakitiProduct(null)} className="text-slate-400 hover:text-white p-1"><X className="h-4 w-4" /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingMakitiProduct(product.id); setMakitiEditData({ name: product.name, price: product.price, description: product.description, product_type: product.product_type || '' }); }} className="text-blue-400 hover:text-blue-300 p-1"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleMakitiDeleteProduct(product.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="h-4 w-4" /></button>
                      </>
                    )}
                  </div>
                </div>

                {/* Edit Form */}
                {editingMakitiProduct === product.id && (
                  <div className="mt-3 space-y-2 bg-slate-700/50 rounded-lg p-3">
                    <input className="w-full bg-slate-600 text-white text-sm rounded px-3 py-2 border border-slate-500" value={makitiEditData.name || ''} onChange={(e) => setMakitiEditData({ ...makitiEditData, name: e.target.value })} placeholder="Nom" />
                    <input className="w-full bg-slate-600 text-white text-sm rounded px-3 py-2 border border-slate-500" type="number" value={makitiEditData.price || ''} onChange={(e) => setMakitiEditData({ ...makitiEditData, price: e.target.value })} placeholder="Prix" />
                    <select
                      className="w-full bg-slate-600 text-white text-sm rounded px-3 py-2 border border-slate-500"
                      value={makitiEditData.product_type || ''}
                      onChange={(e) => setMakitiEditData({ ...makitiEditData, product_type: e.target.value })}
                      data-testid={`edit-category-${product.id}`}
                    >
                      <option value="">-- Choisir une catégorie --</option>
                      {ADMIN_PRODUCT_TYPES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Photos */}
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    {product.photos?.length > 0 && (
                      <button onClick={() => setExpandedMakitiPhotos(expandedMakitiPhotos === product.id ? null : product.id)} className="text-slate-400 hover:text-white text-xs flex items-center gap-1">
                        <Camera className="h-3 w-3" /> {product.photos.length} photo(s)
                      </button>
                    )}
                    <label className="text-xs flex items-center gap-1 text-green-400 hover:text-green-300 cursor-pointer">
                      <Upload className="h-3 w-3" />
                      {uploadingPhoto === product.id ? 'Upload...' : 'Ajouter photos'}
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingPhoto === product.id}
                        onChange={(e) => handleAdminPhotoUpload(product.id, e.target.files)}
                        data-testid={`admin-upload-photo-${product.id}`}
                      />
                    </label>
                    {uploadingPhoto === product.id && <Loader2 className="h-3 w-3 animate-spin text-green-400" />}
                  </div>
                  {expandedMakitiPhotos === product.id && product.photos?.length > 0 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto">
                      {product.photos.map((url, idx) => (
                        <div key={idx} className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-slate-700">
                          <img src={getImageUrl(url)} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => handleMakitiDeletePhoto(product.id, idx)} disabled={deletingMakitiPhoto === `${product.id}_${idx}`} className="absolute top-0.5 right-0.5 bg-red-600/90 text-white rounded p-0.5">
                            {deletingMakitiPhoto === `${product.id}_${idx}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminMakitiTab;
