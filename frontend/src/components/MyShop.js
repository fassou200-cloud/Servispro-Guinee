import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Store, Plus, Package, Eye, MessageCircle, Edit, Trash2, Upload, Camera,
  Check, X, Loader2, Image as ImageIcon, DollarSign, Tag, Save, Star, User,
  ChevronLeft, ChevronRight, ZoomIn
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { getImageUrl } from '@/utils/imageUrl';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SECTORS = [
  'Commerce général', 'Électronique', 'Vêtements & Mode', 'Alimentation', 
  'Construction & BTP', 'Cosmétiques & Beauté', 'Agriculture', 'Services',
  'Automobile', 'Mobilier & Décoration', 'Santé & Bien-être', 'Autre'
];

const MyShop = ({ token, apiPrefix = 'shop' }) => {
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateShop, setShowCreateShop] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [activeSection, setActiveSection] = useState('products');
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(null);
  const fileInputRef = useRef(null);
  const addPhotosInputRef = useRef(null);
  const logoInputRef = useRef(null);

  const [shopForm, setShopForm] = useState({ name: '', description: '', sector: '', contact_phone: '', contact_email: '', location: '' });
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', is_negotiable: false, is_available: true, category_id: '' });
  const [editForm, setEditForm] = useState({ name: '', description: '', price: '', is_negotiable: false, is_available: true, category_id: '' });
  const [selectedProductFiles, setSelectedProductFiles] = useState([]);
  const [addPhotosProductId, setAddPhotosProductId] = useState(null);
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [deletingPhoto, setDeletingPhoto] = useState(null);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => { loadShopData(); }, []);

  const loadShopData = async () => {
    try {
      const [shopRes, catRes] = await Promise.all([
        axios.get(`${API}/${apiPrefix}/my-shop`, authHeaders),
        axios.get(`${API}/product-categories`)
      ]);
      setCategories(catRes.data);
      if (shopRes.data) {
        setShop(shopRes.data);
        const [prodRes, statsRes, msgRes, reviewsRes] = await Promise.all([
          axios.get(`${API}/${apiPrefix}/products`, authHeaders),
          axios.get(`${API}/${apiPrefix}/stats`, authHeaders),
          axios.get(`${API}/${apiPrefix}/messages`, authHeaders),
          axios.get(`${API}/${apiPrefix}/reviews`, authHeaders).catch(() => ({ data: [] }))
        ]);
        setProducts(prodRes.data);
        setStats(statsRes.data);
        setMessages(msgRes.data);
        setReviews(reviewsRes.data);
      } else {
        setShowCreateShop(true);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreateShop = async (e) => {
    e.preventDefault();
    if (!shopForm.name || !shopForm.description || !shopForm.sector || !shopForm.contact_phone) {
      toast.error('Veuillez remplir les champs obligatoires'); return;
    }
    setSaving(true);
    try {
      const res = await axios.post(`${API}/${apiPrefix}/create`, shopForm, authHeaders);
      setShop(res.data);
      setShowCreateShop(false);
      toast.success('Boutique créée avec succès !');
      loadShopData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la création');
    } finally { setSaving(false); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.description || !productForm.price) {
      toast.error('Veuillez remplir les champs obligatoires'); return;
    }
    setSaving(true);
    try {
      const res = await axios.post(`${API}/${apiPrefix}/products`, {
        ...productForm, price: parseFloat(productForm.price)
      }, authHeaders);
      if (selectedProductFiles.length > 0) {
        const formData = new FormData();
        selectedProductFiles.forEach(f => formData.append('files', f));
        await axios.post(`${API}/${apiPrefix}/products/${res.data.id}/photos`, formData, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
        });
      }
      toast.success('Produit ajouté !');
      setShowAddProduct(false);
      setProductForm({ name: '', description: '', price: '', is_negotiable: false, is_available: true, category_id: '' });
      setSelectedProductFiles([]);
      loadShopData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur');
    } finally { setSaving(false); }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSaving(true);
    try {
      await axios.put(`${API}/${apiPrefix}/products/${editingProduct.id}`, {
        name: editForm.name,
        description: editForm.description,
        price: parseFloat(editForm.price),
        is_negotiable: editForm.is_negotiable,
        is_available: editForm.is_available,
        category_id: editForm.category_id || null
      }, authHeaders);
      toast.success('Produit mis à jour !');
      setEditingProduct(null);
      loadShopData();
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
    } finally { setSaving(false); }
  };

  const startEditProduct = (product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      description: product.description,
      price: product.price,
      is_negotiable: product.is_negotiable,
      is_available: product.is_available,
      category_id: product.category_id || ''
    });
    setShowAddProduct(false);
  };

  const handleAddPhotosToProduct = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !addPhotosProductId) return;
    setUploadingPhotos(addPhotosProductId);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      const res = await axios.post(`${API}/${apiPrefix}/products/${addPhotosProductId}/photos`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setProducts(products.map(p => p.id === addPhotosProductId ? { ...p, photos: res.data.photos } : p));
      toast.success(`${files.length} photo(s) ajoutée(s) !`);
    } catch (err) {
      toast.error('Erreur upload photos');
    } finally {
      setUploadingPhotos(null);
      setAddPhotosProductId(null);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Supprimer ce produit ?')) return;
    try {
      await axios.delete(`${API}/${apiPrefix}/products/${productId}`, authHeaders);
      toast.success('Produit supprimé');
      setProducts(products.filter(p => p.id !== productId));
    } catch (err) { toast.error('Erreur'); }
  };

  const handleDeletePhoto = async (productId, photoIndex) => {
    if (!window.confirm('Supprimer cette photo ?')) return;
    setDeletingPhoto(`${productId}-${photoIndex}`);
    try {
      const res = await axios.delete(`${API}/${apiPrefix}/products/${productId}/photos/${photoIndex}`, authHeaders);
      setProducts(products.map(p => p.id === productId ? { ...p, photos: res.data.photos } : p));
      if (editingProduct?.id === productId) {
        setEditingProduct({ ...editingProduct, photos: res.data.photos });
      }
      toast.success('Photo supprimée');
    } catch (err) {
      toast.error('Erreur lors de la suppression de la photo');
    } finally { setDeletingPhoto(null); }
  };

  const handleToggleAvailability = async (product) => {
    try {
      await axios.put(`${API}/${apiPrefix}/products/${product.id}`, { is_available: !product.is_available }, authHeaders);
      setProducts(products.map(p => p.id === product.id ? { ...p, is_available: !p.is_available } : p));
      toast.success(product.is_available ? 'Marqué en rupture' : 'Marqué en stock');
    } catch (err) { toast.error('Erreur'); }
  };

  const handleUploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/${apiPrefix}/upload-logo`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setShop({ ...shop, logo: res.data.logo });
      toast.success('Logo mis à jour !');
    } catch (err) { toast.error('Erreur upload logo'); }
  };

  const formatPrice = (p) => new Intl.NumberFormat('fr-FR').format(p || 0);
  const unreadCount = messages.filter(m => !m.is_read).length;

  if (loading) return <div className="text-center py-8 text-gray-500">Chargement...</div>;

  // Create Shop Form
  if (showCreateShop && !shop) {
    return (
      <Card className="p-6 max-w-xl mx-auto mt-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-orange-100 rounded-xl"><Store className="h-6 w-6 text-orange-600" /></div>
          <div>
            <h2 className="text-xl font-bold">Créer votre boutique</h2>
            <p className="text-sm text-gray-500">Commencez à vendre vos produits sur ServisPro</p>
          </div>
        </div>
        <form onSubmit={handleCreateShop} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Nom de la boutique *</label>
            <Input data-testid="shop-name-input" value={shopForm.name} onChange={(e) => setShopForm({...shopForm, name: e.target.value})} placeholder="Ex: Boutique Mamou Electronics" required />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Description *</label>
            <Textarea value={shopForm.description} onChange={(e) => setShopForm({...shopForm, description: e.target.value})} placeholder="Décrivez votre activité..." rows={3} required />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Secteur d'activité *</label>
            <select className="w-full px-3 py-2 border rounded-lg text-sm" value={shopForm.sector} onChange={(e) => setShopForm({...shopForm, sector: e.target.value})} required>
              <option value="">Sélectionner...</option>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Téléphone de contact *</label>
            <Input value={shopForm.contact_phone} onChange={(e) => setShopForm({...shopForm, contact_phone: e.target.value})} placeholder="+224..." required />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Localisation</label>
            <Input value={shopForm.location} onChange={(e) => setShopForm({...shopForm, location: e.target.value})} placeholder="Ex: Conakry, Kaloum" />
          </div>
          <Button data-testid="create-shop-btn" type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Création...</> : <><Store className="h-4 w-4 mr-2" /> Créer ma boutique</>}
          </Button>
        </form>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4 text-center">
            <Package className="h-5 w-5 text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{stats.total_products}</p>
            <p className="text-xs text-gray-500">Produits</p>
          </Card>
          <Card className="p-4 text-center">
            <Eye className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{stats.total_views}</p>
            <p className="text-xs text-gray-500">Vues</p>
          </Card>
          <Card className="p-4 text-center">
            <MessageCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{stats.total_messages}</p>
            <p className="text-xs text-gray-500">Messages</p>
          </Card>
          <Card className="p-4 text-center">
            <Check className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{stats.available_products}</p>
            <p className="text-xs text-gray-500">Disponibles</p>
          </Card>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {['products', 'messages', 'reviews', 'shop'].map(section => (
          <Button key={section} variant={activeSection === section ? 'default' : 'ghost'} size="sm"
            className={activeSection === section ? 'bg-orange-500 hover:bg-orange-600' : ''}
            onClick={() => setActiveSection(section)}
          >
            {section === 'products' && <><Package className="h-4 w-4 mr-1" /> Produits ({products.length})</>}
            {section === 'messages' && <><MessageCircle className="h-4 w-4 mr-1" /> Messages {unreadCount > 0 && `(${unreadCount})`}</>}
            {section === 'reviews' && <><Star className="h-4 w-4 mr-1" /> Avis ({reviews.length})</>}
            {section === 'shop' && <><Store className="h-4 w-4 mr-1" /> Ma Boutique</>}
          </Button>
        ))}
      </div>

      {/* Hidden file input for adding photos to existing product */}
      <input type="file" ref={addPhotosInputRef} multiple accept="image/*" className="hidden" onChange={handleAddPhotosToProduct} />

      {/* Products Section */}
      {activeSection === 'products' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Mes Produits</h3>
            <Button data-testid="add-product-btn" onClick={() => { setShowAddProduct(true); setEditingProduct(null); }} className="bg-orange-500 hover:bg-orange-600 gap-2" size="sm">
              <Plus className="h-4 w-4" /> Ajouter un produit
            </Button>
          </div>

          {/* Add Product Form */}
          {showAddProduct && !editingProduct && (
            <Card className="p-5 mb-4 border-orange-200">
              <h4 className="font-semibold mb-3">Nouveau produit</h4>
              <form onSubmit={handleAddProduct} className="space-y-3">
                <Input data-testid="product-name-input" placeholder="Nom du produit *" value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} required />
                <Textarea placeholder="Description *" value={productForm.description} onChange={(e) => setProductForm({...productForm, description: e.target.value})} rows={2} required />
                <div className="grid grid-cols-2 gap-3">
                  <Input data-testid="product-price-input" type="number" placeholder="Prix (GNF) *" value={productForm.price} onChange={(e) => setProductForm({...productForm, price: e.target.value})} required />
                  {categories.length > 0 && (
                    <select className="px-3 py-2 border rounded-lg text-sm" value={productForm.category_id} onChange={(e) => setProductForm({...productForm, category_id: e.target.value})}>
                      <option value="">Catégorie</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={productForm.is_negotiable} onChange={(e) => setProductForm({...productForm, is_negotiable: e.target.checked})} />
                    Prix négociable
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={productForm.is_available} onChange={(e) => setProductForm({...productForm, is_available: e.target.checked})} />
                    <span className={productForm.is_available ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                      {productForm.is_available ? 'En stock' : 'Rupture de stock'}
                    </span>
                  </label>
                </div>
                <div>
                  <input type="file" ref={fileInputRef} multiple accept="image/*" className="hidden" onChange={(e) => setSelectedProductFiles(Array.from(e.target.files))} />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                    <Camera className="h-4 w-4" /> Photos ({selectedProductFiles.length})
                  </Button>
                  {selectedProductFiles.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {selectedProductFiles.map((f, i) => (
                        <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">{f.name}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button data-testid="save-product-btn" type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ajouter'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddProduct(false)}>Annuler</Button>
                </div>
              </form>
            </Card>
          )}

          {/* Edit Product Form */}
          {editingProduct && (
            <Card className="p-5 mb-4 border-blue-200 bg-blue-50/30">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Edit className="h-4 w-4 text-blue-600" /> Modifier : {editingProduct.name}
              </h4>
              <form onSubmit={handleEditProduct} className="space-y-3">
                <Input placeholder="Nom du produit *" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} required />
                <Textarea placeholder="Description *" value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} rows={2} required />
                <div className="grid grid-cols-2 gap-3">
                  <Input type="number" placeholder="Prix (GNF) *" value={editForm.price} onChange={(e) => setEditForm({...editForm, price: e.target.value})} required />
                  {categories.length > 0 && (
                    <select className="px-3 py-2 border rounded-lg text-sm" value={editForm.category_id} onChange={(e) => setEditForm({...editForm, category_id: e.target.value})}>
                      <option value="">Catégorie</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editForm.is_negotiable} onChange={(e) => setEditForm({...editForm, is_negotiable: e.target.checked})} />
                    Prix négociable
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editForm.is_available} onChange={(e) => setEditForm({...editForm, is_available: e.target.checked})} />
                    <span className={editForm.is_available ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                      {editForm.is_available ? 'En stock' : 'Rupture de stock'}
                    </span>
                  </label>
                </div>
                {/* Existing photos with delete option */}
                {editingProduct.photos?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Photos actuelles ({editingProduct.photos.length}) — cliquez sur la croix pour supprimer :</p>
                    <div className="flex gap-2 flex-wrap">
                      {editingProduct.photos.map((photo, i) => (
                        <div key={i} className="relative group">
                          <img src={getImageUrl(photo)} alt="" className="h-16 w-16 rounded-lg object-cover border" />
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(editingProduct.id, i)}
                            disabled={deletingPhoto === `${editingProduct.id}-${i}`}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow-md"
                            data-testid={`edit-delete-photo-${i}`}
                          >
                            {deletingPhoto === `${editingProduct.id}-${i}` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 gap-2" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Enregistrer</>}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditingProduct(null)}>Annuler</Button>
                </div>
              </form>
            </Card>
          )}

          {/* Products List */}
          {products.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun produit. Ajoutez votre premier produit !</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map(product => {
                const isExpanded = expandedProductId === product.id;
                return (
                <Card key={product.id} className="overflow-hidden" data-testid={`product-card-${product.id}`}>
                  <div className="flex">
                    {/* Product image - clickable to expand */}
                    <div
                      className="w-28 h-28 bg-gray-100 flex-shrink-0 relative cursor-pointer"
                      onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
                      data-testid={`product-thumb-${product.id}`}
                    >
                      {product.photos?.length > 0 ? (
                        <img src={getImageUrl(product.photos[0])} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="h-8 w-8 text-gray-300" /></div>
                      )}
                      {product.photos?.length > 1 && (
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 rounded flex items-center gap-0.5">
                          <ImageIcon className="h-3 w-3" /> {product.photos.length}
                        </span>
                      )}
                      {product.photos?.length > 0 && (
                        <span className="absolute top-1 right-1 bg-black/40 text-white rounded-full p-0.5">
                          <ZoomIn className="h-3 w-3" />
                        </span>
                      )}
                    </div>

                    {/* Product info */}
                    <div className="flex-1 p-3 flex flex-col justify-between">
                      <div>
                        <h4 className="font-medium text-sm line-clamp-1">{product.name}</h4>
                        <p className="text-orange-600 font-bold text-sm">{formatPrice(product.price)} GNF {product.is_negotiable && <span className="text-xs font-normal text-gray-400">(Négociable)</span>}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <button
                          onClick={() => handleToggleAvailability(product)}
                          className={`text-xs px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 ${product.is_available ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                        >
                          {product.is_available ? 'En stock' : 'Rupture'}
                        </button>
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Eye className="h-3 w-3" />{product.total_views || 0}</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1"><MessageCircle className="h-3 w-3" />{product.total_inquiries || 0}</span>
                        <div className="ml-auto flex gap-1">
                          {/* Add Photos */}
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-blue-500 hover:text-blue-700"
                            disabled={uploadingPhotos === product.id}
                            onClick={() => { setAddPhotosProductId(product.id); addPhotosInputRef.current?.click(); }}
                          >
                            {uploadingPhotos === product.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Camera className="h-3.5 w-3.5" /> Photo</>}
                          </Button>
                          {/* Edit */}
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEditProduct(product)} data-testid={`edit-product-${product.id}`}>
                            <Edit className="h-3.5 w-3.5 text-blue-500" />
                          </Button>
                          {/* Delete */}
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteProduct(product.id)} data-testid={`delete-product-${product.id}`}>
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded photos gallery */}
                  {isExpanded && product.photos?.length > 0 && (
                    <div className="border-t bg-gray-50 p-3" data-testid={`photo-gallery-${product.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-600">
                          Photos du produit ({product.photos.length})
                        </p>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setExpandedProductId(null)}>
                          <X className="h-3 w-3 mr-1" /> Fermer
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {product.photos.map((photo, index) => (
                          <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border bg-white">
                            <img
                              src={getImageUrl(photo)}
                              alt={`${product.name} - photo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => handleDeletePhoto(product.id, index)}
                              disabled={deletingPhoto === `${product.id}-${index}`}
                              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                              data-testid={`delete-photo-${product.id}-${index}`}
                              title="Supprimer cette photo"
                            >
                              {deletingPhoto === `${product.id}-${index}` ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </button>
                            <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1 rounded">
                              {index + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Messages Section */}
      {activeSection === 'messages' && (
        <div>
          <h3 className="font-bold text-lg mb-4">Messages des clients</h3>
          {messages.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun message</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map(msg => (
                <Card key={msg.id} className={`p-4 ${!msg.is_read ? 'border-orange-200 bg-orange-50/30' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{msg.sender_name}</p>
                      <p className="text-xs text-gray-500">{msg.sender_phone} - Produit: {msg.product_name}</p>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(msg.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-2">{msg.message}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reviews Section */}
      {activeSection === 'reviews' && (
        <div>
          <h3 className="font-bold text-lg mb-4">Avis des clients</h3>
          {reviews.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <Star className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun avis pour le moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map(review => (
                <Card key={review.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{review.customer_name}</p>
                        <p className="text-xs text-gray-500">Produit: {review.product_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mt-2 ml-12">{review.comment}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shop Info Section */}
      {activeSection === 'shop' && shop && (
        <div>
          <h3 className="font-bold text-lg mb-4">Informations de la boutique</h3>
          <Card className="p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="h-20 w-20 rounded-xl bg-orange-50 flex items-center justify-center overflow-hidden border-2 border-orange-200">
                  {shop.logo ? (
                    <img src={getImageUrl(shop.logo)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="h-8 w-8 text-orange-400" />
                  )}
                </div>
                <input type="file" ref={logoInputRef} accept="image/*" className="hidden" onChange={handleUploadLogo} />
                <button className="absolute -bottom-1 -right-1 bg-orange-500 text-white rounded-full p-1" onClick={() => logoInputRef.current?.click()}>
                  <Camera className="h-3 w-3" />
                </button>
              </div>
              <div>
                <h4 className="font-bold text-lg">{shop.name}</h4>
                <p className="text-sm text-gray-500 flex items-center gap-1"><Tag className="h-3 w-3" /> {shop.sector}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>{shop.description}</p>
              <p className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> {shop.contact_phone}</p>
              {shop.location && <p className="flex items-center gap-2"><Tag className="h-4 w-4" /> {shop.location}</p>}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MyShop;
