import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Store, Plus, Package, Eye, MessageCircle, Edit, Trash2, Upload, Camera,
  BarChart3, Check, X, Loader2, Image as ImageIcon, DollarSign, Tag
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
  const [loading, setLoading] = useState(true);
  const [showCreateShop, setShowCreateShop] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [activeSection, setActiveSection] = useState('products');
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);

  const [shopForm, setShopForm] = useState({ name: '', description: '', sector: '', contact_phone: '', contact_email: '', location: '' });
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', is_negotiable: false, is_available: true, category_id: '' });
  const [selectedProductFiles, setSelectedProductFiles] = useState([]);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    loadShopData();
  }, []);

  const loadShopData = async () => {
    try {
      const [shopRes, catRes] = await Promise.all([
        axios.get(`${API}/${apiPrefix}/my-shop`, authHeaders),
        axios.get(`${API}/product-categories`)
      ]);
      setCategories(catRes.data);
      if (shopRes.data) {
        setShop(shopRes.data);
        const [prodRes, statsRes, msgRes] = await Promise.all([
          axios.get(`${API}/${apiPrefix}/products`, authHeaders),
          axios.get(`${API}/${apiPrefix}/stats`, authHeaders),
          axios.get(`${API}/${apiPrefix}/messages`, authHeaders)
        ]);
        setProducts(prodRes.data);
        setStats(statsRes.data);
        setMessages(msgRes.data);
      } else {
        setShowCreateShop(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShop = async (e) => {
    e.preventDefault();
    if (!shopForm.name || !shopForm.description || !shopForm.sector || !shopForm.contact_phone) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
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
    } finally {
      setSaving(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.description || !productForm.price) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }
    setSaving(true);
    try {
      const res = await axios.post(`${API}/${apiPrefix}/products`, {
        ...productForm,
        price: parseFloat(productForm.price)
      }, authHeaders);
      
      // Upload photos if selected
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
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Supprimer ce produit ?')) return;
    try {
      await axios.delete(`${API}/${apiPrefix}/products/${productId}`, authHeaders);
      toast.success('Produit supprimé');
      setProducts(products.filter(p => p.id !== productId));
    } catch (err) {
      toast.error('Erreur');
    }
  };

  const handleToggleAvailability = async (product) => {
    try {
      await axios.put(`${API}/${apiPrefix}/products/${product.id}`, { is_available: !product.is_available }, authHeaders);
      setProducts(products.map(p => p.id === product.id ? { ...p, is_available: !p.is_available } : p));
    } catch (err) {
      toast.error('Erreur');
    }
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
    } catch (err) {
      toast.error('Erreur upload logo');
    }
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
        {['products', 'messages', 'shop'].map(section => (
          <Button key={section} variant={activeSection === section ? 'default' : 'ghost'} size="sm"
            className={activeSection === section ? 'bg-orange-500 hover:bg-orange-600' : ''}
            onClick={() => setActiveSection(section)}
          >
            {section === 'products' && <><Package className="h-4 w-4 mr-1" /> Produits ({products.length})</>}
            {section === 'messages' && <><MessageCircle className="h-4 w-4 mr-1" /> Messages {unreadCount > 0 && `(${unreadCount})`}</>}
            {section === 'shop' && <><Store className="h-4 w-4 mr-1" /> Ma Boutique</>}
          </Button>
        ))}
      </div>

      {/* Products Section */}
      {activeSection === 'products' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Mes Produits</h3>
            <Button data-testid="add-product-btn" onClick={() => setShowAddProduct(true)} className="bg-orange-500 hover:bg-orange-600 gap-2" size="sm">
              <Plus className="h-4 w-4" /> Ajouter un produit
            </Button>
          </div>

          {/* Add Product Form */}
          {showAddProduct && (
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
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={productForm.is_negotiable} onChange={(e) => setProductForm({...productForm, is_negotiable: e.target.checked})} />
                    Prix négociable
                  </label>
                </div>
                <div>
                  <input type="file" ref={fileInputRef} multiple accept="image/*" className="hidden" onChange={(e) => setSelectedProductFiles(Array.from(e.target.files))} />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                    <Camera className="h-4 w-4" /> Photos ({selectedProductFiles.length})
                  </Button>
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

          {/* Products List */}
          {products.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun produit. Ajoutez votre premier produit !</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {products.map(product => (
                <Card key={product.id} className="flex overflow-hidden">
                  <div className="w-24 h-24 bg-gray-100 flex-shrink-0">
                    {product.photos?.length > 0 ? (
                      <img src={getImageUrl(product.photos[0])} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="h-8 w-8 text-gray-300" /></div>
                    )}
                  </div>
                  <div className="flex-1 p-3 flex flex-col justify-between">
                    <div>
                      <h4 className="font-medium text-sm line-clamp-1">{product.name}</h4>
                      <p className="text-orange-600 font-bold text-sm">{formatPrice(product.price)} GNF</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${product.is_available ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {product.is_available ? 'En stock' : 'Rupture'}
                      </span>
                      <span className="text-xs text-gray-400">{product.total_views || 0} vues</span>
                      <div className="ml-auto flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleToggleAvailability(product)}>
                          {product.is_available ? <X className="h-3.5 w-3.5 text-gray-400" /> : <Check className="h-3.5 w-3.5 text-green-500" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteProduct(product.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
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
