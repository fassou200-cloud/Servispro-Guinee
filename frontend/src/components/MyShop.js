import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Store, Plus, Package, Eye, MessageCircle, Edit, Trash2, Upload, Camera,
  Check, X, Loader2, Image as ImageIcon, DollarSign, Tag, Save, Star, User,
  ChevronLeft, ChevronRight, ZoomIn, Phone, MapPin, Mail, Pencil
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

const PRODUCT_TYPES = [
  { value: 'chaussures', label: 'Chaussures' },
  { value: 'vetements', label: 'Vêtements' },
  { value: 'voitures', label: 'Voitures' },
  { value: 'cosmetiques', label: 'Produits cosmétiques' },
  { value: 'electronique', label: 'Électronique' },
  { value: 'ordinateurs', label: 'Ordinateurs portables' },
  { value: 'smartphones', label: 'Smartphones' },
  { value: 'alimentation', label: 'Alimentation' },
  { value: 'mobilier', label: 'Mobilier & Décoration' },
  { value: 'bijoux', label: 'Bijoux' },
  { value: 'autre', label: 'Autre' },
];

const PRODUCT_CHARACTERISTICS = {
  chaussures: [
    { key: 'pointure', label: 'Pointure', type: 'select', options: ['36','37','38','39','40','41','42','43','44','45','46','47','48'] },
    { key: 'couleur', label: 'Couleur', type: 'text' },
    { key: 'matiere', label: 'Matière', type: 'select', options: ['Cuir', 'Synthétique', 'Tissu', 'Daim', 'Caoutchouc', 'Autre'] },
    { key: 'genre', label: 'Genre', type: 'select', options: ['Homme', 'Femme', 'Enfant', 'Unisexe'] },
    { key: 'etat', label: 'État', type: 'select', options: ['Neuf', 'Occasion', 'Reconditionné'] },
  ],
  vetements: [
    { key: 'taille', label: 'Taille', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] },
    { key: 'couleur', label: 'Couleur', type: 'text' },
    { key: 'matiere', label: 'Matière', type: 'select', options: ['Coton', 'Polyester', 'Soie', 'Lin', 'Laine', 'Jean', 'Wax', 'Bazin', 'Autre'] },
    { key: 'genre', label: 'Genre', type: 'select', options: ['Homme', 'Femme', 'Enfant', 'Unisexe'] },
    { key: 'etat', label: 'État', type: 'select', options: ['Neuf', 'Occasion'] },
  ],
  voitures: [
    { key: 'marque', label: 'Marque', type: 'select', options: ['Toyota', 'Mercedes', 'BMW', 'Hyundai', 'Kia', 'Nissan', 'Honda', 'Peugeot', 'Renault', 'Ford', 'Chevrolet', 'Mitsubishi', 'Suzuki', 'Autre'] },
    { key: 'modele', label: 'Modèle', type: 'text' },
    { key: 'annee', label: 'Année', type: 'number' },
    { key: 'kilometrage', label: 'Kilométrage (km)', type: 'number' },
    { key: 'carburant', label: 'Carburant', type: 'select', options: ['Essence', 'Diesel', 'Hybride', 'Électrique', 'GPL'] },
    { key: 'transmission', label: 'Transmission', type: 'select', options: ['Manuelle', 'Automatique'] },
    { key: 'etat', label: 'État', type: 'select', options: ['Neuf', 'Occasion', 'Accidenté'] },
  ],
  cosmetiques: [
    { key: 'type_produit', label: 'Type', type: 'select', options: ['Crème', 'Maquillage', 'Parfum', 'Soin capillaire', 'Soin corporel', 'Huile', 'Savon', 'Autre'] },
    { key: 'marque', label: 'Marque', type: 'text' },
    { key: 'volume', label: 'Volume / Poids', type: 'text' },
    { key: 'type_peau', label: 'Type de peau', type: 'select', options: ['Tous types', 'Normale', 'Grasse', 'Sèche', 'Mixte', 'Sensible'] },
    { key: 'etat', label: 'État', type: 'select', options: ['Neuf', 'Occasion'] },
  ],
  electronique: [
    { key: 'marque', label: 'Marque', type: 'text' },
    { key: 'modele', label: 'Modèle', type: 'text' },
    { key: 'etat', label: 'État', type: 'select', options: ['Neuf', 'Occasion', 'Reconditionné'] },
  ],
  ordinateurs: [
    { key: 'marque', label: 'Marque', type: 'select', options: ['HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'Apple', 'MSI', 'Toshiba', 'Samsung', 'Huawei', 'Microsoft', 'Autre'] },
    { key: 'modele', label: 'Modèle', type: 'text' },
    { key: 'processeur', label: 'Processeur', type: 'select', options: ['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9', 'Apple M1', 'Apple M2', 'Apple M3', 'Autre'] },
    { key: 'ram', label: 'RAM', type: 'select', options: ['2 Go', '4 Go', '8 Go', '16 Go', '32 Go', '64 Go'] },
    { key: 'stockage', label: 'Stockage', type: 'select', options: ['128 Go SSD', '256 Go SSD', '512 Go SSD', '1 To SSD', '500 Go HDD', '1 To HDD', '2 To HDD', 'Autre'] },
    { key: 'ecran', label: 'Taille de l\'écran', type: 'select', options: ['11 pouces', '13 pouces', '14 pouces', '15 pouces', '16 pouces', '17 pouces'] },
    { key: 'systeme', label: 'Système d\'exploitation', type: 'select', options: ['Windows 11', 'Windows 10', 'macOS', 'Linux', 'Chrome OS', 'Autre'] },
    { key: 'etat', label: 'État', type: 'select', options: ['Neuf', 'Occasion', 'Reconditionné'] },
  ],
  smartphones: [
    { key: 'marque', label: 'Marque', type: 'select', options: ['Apple (iPhone)', 'Samsung', 'Huawei', 'Xiaomi', 'Tecno', 'Infinix', 'Itel', 'Oppo', 'Realme', 'Google Pixel', 'OnePlus', 'Nokia', 'Honor', 'Autre'] },
    { key: 'modele', label: 'Modèle', type: 'text' },
    { key: 'stockage', label: 'Stockage', type: 'select', options: ['16 Go', '32 Go', '64 Go', '128 Go', '256 Go', '512 Go', '1 To'] },
    { key: 'ram', label: 'RAM', type: 'select', options: ['2 Go', '3 Go', '4 Go', '6 Go', '8 Go', '12 Go', '16 Go'] },
    { key: 'couleur', label: 'Couleur', type: 'text' },
    { key: 'reseau', label: 'Réseau', type: 'select', options: ['3G', '4G', '5G'] },
    { key: 'double_sim', label: 'Double SIM', type: 'select', options: ['Oui', 'Non'] },
    { key: 'etat', label: 'État', type: 'select', options: ['Neuf', 'Occasion', 'Reconditionné'] },
  ],
  alimentation: [
    { key: 'type_produit', label: 'Type', type: 'text' },
    { key: 'poids', label: 'Poids / Volume', type: 'text' },
    { key: 'origine', label: 'Origine', type: 'text' },
  ],
  mobilier: [
    { key: 'type_produit', label: 'Type', type: 'text' },
    { key: 'matiere', label: 'Matière', type: 'text' },
    { key: 'dimensions', label: 'Dimensions', type: 'text' },
    { key: 'etat', label: 'État', type: 'select', options: ['Neuf', 'Occasion'] },
  ],
  bijoux: [
    { key: 'type_bijou', label: 'Type', type: 'select', options: ['Collier', 'Bracelet', 'Bague', 'Boucles d\'oreilles', 'Montre', 'Chaîne', 'Pendentif', 'Ensemble', 'Autre'] },
    { key: 'matiere', label: 'Matière', type: 'select', options: ['Or', 'Argent', 'Plaqué or', 'Acier inoxydable', 'Fantaisie', 'Perles', 'Diamant', 'Autre'] },
    { key: 'genre', label: 'Genre', type: 'select', options: ['Homme', 'Femme', 'Unisexe'] },
    { key: 'etat', label: 'État', type: 'select', options: ['Neuf', 'Occasion'] },
  ],
  autre: [
    { key: 'etat', label: 'État', type: 'select', options: ['Neuf', 'Occasion'] },
  ],
};

const ShopEditSection = ({ shop, setShop, apiPrefix, authHeaders, logoInputRef, handleUploadLogo }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: shop.name || '',
    description: shop.description || '',
    sector: shop.sector || '',
    contact_phone: shop.contact_phone || '',
    contact_email: shop.contact_email || '',
    location: shop.location || '',
  });

  const handleSave = async () => {
    if (!form.name || !form.contact_phone) {
      toast.error('Le nom et le numéro de téléphone sont obligatoires');
      return;
    }
    setSaving(true);
    try {
      const res = await axios.put(`${API}/${apiPrefix}/update`, form, authHeaders);
      setShop(res.data);
      setEditing(false);
      toast.success('Boutique mise à jour !');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">Informations de la boutique</h3>
        {!editing && (
          <Button size="sm" variant="outline" onClick={() => { setForm({ name: shop.name || '', description: shop.description || '', sector: shop.sector || '', contact_phone: shop.contact_phone || '', contact_email: shop.contact_email || '', location: shop.location || '' }); setEditing(true); }} className="gap-1" data-testid="edit-shop-btn">
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </Button>
        )}
      </div>

      <Card className="p-5">
        {/* Logo */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative">
            <div className="h-20 w-20 rounded-xl bg-orange-50 flex items-center justify-center overflow-hidden border-2 border-orange-200">
              {shop.logo ? (
                <img src={getImageUrl(shop.logo)} alt="" className="w-full h-full object-cover" />
              ) : (
                <Store className="h-8 w-8 text-orange-400" />
              )}
            </div>
            <input type="file" ref={logoInputRef} accept="image/*" className="hidden" onChange={handleUploadLogo} />
            <button className="absolute -bottom-1 -right-1 bg-orange-500 text-white rounded-full p-1.5" onClick={() => logoInputRef.current?.click()}>
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
          {!editing && (
            <div>
              <h4 className="font-bold text-lg">{shop.name}</h4>
              <p className="text-sm text-gray-500 flex items-center gap-1"><Tag className="h-3 w-3" /> {shop.sector}</p>
            </div>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Nom de la boutique *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom de la boutique" data-testid="edit-shop-name" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description de la boutique" rows={3} data-testid="edit-shop-description" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Secteur</label>
              <select className="w-full px-3 py-2 border rounded-lg text-sm" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} data-testid="edit-shop-sector">
                <option value="">Sélectionner un secteur</option>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Téléphone *</label>
                <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="+224..." data-testid="edit-shop-phone" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
                <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="email@exemple.com" data-testid="edit-shop-email" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Localisation</label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ex: Conakry, Kaloum" data-testid="edit-shop-location" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600 gap-1" data-testid="save-shop-btn">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>Annuler</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            {shop.description && <p className="text-gray-600">{shop.description}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <p className="flex items-center gap-2 text-gray-600"><Phone className="h-4 w-4 text-orange-500" /> {shop.contact_phone}</p>
              {shop.contact_email && <p className="flex items-center gap-2 text-gray-600"><Mail className="h-4 w-4 text-orange-500" /> {shop.contact_email}</p>}
              {shop.location && <p className="flex items-center gap-2 text-gray-600"><MapPin className="h-4 w-4 text-orange-500" /> {shop.location}</p>}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

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
  const [shopInquiries, setShopInquiries] = useState([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(null);
  const fileInputRef = useRef(null);
  const addPhotosInputRef = useRef(null);
  const logoInputRef = useRef(null);

  const [shopForm, setShopForm] = useState({ name: '', description: '', sector: '', contact_phone: '', contact_email: '', location: '' });
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', currency: 'GNF', price_on_request: false, is_negotiable: false, is_available: true, category_id: '', product_type: '', characteristics: {} });
  const [editForm, setEditForm] = useState({ name: '', description: '', price: '', currency: 'GNF', price_on_request: false, is_negotiable: false, is_available: true, category_id: '', product_type: '', characteristics: {} });
  const [selectedProductFiles, setSelectedProductFiles] = useState([]);
  const [addPhotosProductId, setAddPhotosProductId] = useState(null);
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [deletingPhoto, setDeletingPhoto] = useState(null);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => { loadShopData(); }, []);

  useEffect(() => {
    if (activeSection === 'inquiries') fetchShopInquiries();
  }, [activeSection]);

  const fetchShopInquiries = async () => {
    setLoadingInquiries(true);
    try {
      const res = await axios.get(`${API}/${apiPrefix}/inquiries`, authHeaders);
      setShopInquiries(res.data);
    } catch (e) { console.error(e); }
    finally { setLoadingInquiries(false); }
  };

  const updateInquiryStatus = async (inquiryId, status) => {
    try {
      await axios.put(`${API}/${apiPrefix}/inquiries/${inquiryId}/status`, { status }, authHeaders);
      setShopInquiries(prev => prev.map(i => i.id === inquiryId
        ? { ...i, status, processed_at: status === 'processed' ? new Date().toISOString() : i.processed_at, is_read: true }
        : i
      ));
      toast.success(status === 'processed' ? 'Demande marquée comme traitée' : 'Demande annulée');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la mise à jour');
    }
  };


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
      setProductForm({ name: '', description: '', price: '', currency: 'GNF', price_on_request: false, is_negotiable: false, is_available: true, category_id: '', product_type: '', characteristics: {} });
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
        price: parseFloat(editForm.price) || 0,
        currency: editForm.currency || 'GNF',
        price_on_request: editForm.price_on_request || false,
        is_negotiable: editForm.is_negotiable,
        is_available: editForm.is_available,
        category_id: editForm.category_id || null,
        product_type: editForm.product_type || null,
        characteristics: editForm.characteristics || null
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
      category_id: product.category_id || '',
      product_type: product.product_type || '',
      characteristics: product.characteristics || {}
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

  const renderCharacteristicsFields = (form, setForm) => {
    const type = form.product_type;
    const fields = PRODUCT_CHARACTERISTICS[type];
    if (!type || !fields) return null;
    const chars = form.characteristics || {};
    const updateChar = (key, value) => setForm({ ...form, characteristics: { ...chars, [key]: value } });
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
        <p className="text-xs font-semibold text-orange-700 uppercase">
          Caractéristiques — {PRODUCT_TYPES.find(t => t.value === type)?.label}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {fields.map(field => (
            <div key={field.key}>
              <label className="text-xs text-gray-600 mb-0.5 block">{field.label}</label>
              {field.type === 'select' ? (
                <select
                  className="w-full px-2 py-1.5 border rounded-lg text-sm bg-white"
                  value={chars[field.key] || ''}
                  onChange={e => updateChar(field.key, e.target.value)}
                  data-testid={`char-${field.key}`}
                >
                  <option value="">Choisir...</option>
                  {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <Input
                  type={field.type === 'number' ? 'number' : 'text'}
                  className="h-8 text-sm"
                  placeholder={field.label}
                  value={chars[field.key] || ''}
                  onChange={e => updateChar(field.key, e.target.value)}
                  data-testid={`char-${field.key}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

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
      <div className="flex gap-2 border-b pb-2 overflow-x-auto">
        {['products', 'inquiries', 'messages', 'reviews', 'shop'].map(section => (
          <Button key={section} variant={activeSection === section ? 'default' : 'ghost'} size="sm"
            className={`shrink-0 ${activeSection === section ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
            onClick={() => setActiveSection(section)}
            data-testid={`shop-tab-${section}`}
          >
            {section === 'products' && <><Package className="h-4 w-4 mr-1" /> Produits ({products.length})</>}
            {section === 'inquiries' && <><Tag className="h-4 w-4 mr-1" /> Demandes</>}
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
                  <div className="relative">
                    <Input data-testid="product-price-input" type="number" placeholder="Prix *" value={productForm.price} onChange={(e) => setProductForm({...productForm, price: e.target.value})} required={!productForm.price_on_request} disabled={productForm.price_on_request} className={productForm.price_on_request ? 'opacity-50' : ''} />
                    <select
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent text-xs font-medium text-gray-500 border-none outline-none cursor-pointer"
                      value={productForm.currency}
                      onChange={(e) => setProductForm({...productForm, currency: e.target.value})}
                      data-testid="product-currency-select"
                    >
                      <option value="GNF">GNF</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  <select
                    className="px-3 py-2 border rounded-lg text-sm"
                    value={productForm.product_type}
                    onChange={(e) => setProductForm({...productForm, product_type: e.target.value, characteristics: {}})}
                    data-testid="product-type-select"
                  >
                    <option value="">Type de produit</option>
                    {PRODUCT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-2 text-sm cursor-pointer" data-testid="price-on-request-checkbox">
                    <input type="checkbox" checked={productForm.price_on_request} onChange={(e) => setProductForm({...productForm, price_on_request: e.target.checked, price: e.target.checked ? '0' : productForm.price})} className="rounded" />
                    <span className="text-orange-600 font-medium">Prix sur demande</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={productForm.is_negotiable} onChange={(e) => setProductForm({...productForm, is_negotiable: e.target.checked})} className="rounded" />
                    Prix négociable
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={productForm.is_available} onChange={(e) => setProductForm({...productForm, is_available: e.target.checked})} className="rounded text-green-500" />
                    <span className={productForm.is_available ? 'text-green-600' : 'text-red-500'}>En stock</span>
                  </label>
                </div>
                {renderCharacteristicsFields(productForm, setProductForm)}
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
                  <div className="relative">
                    <Input type="number" placeholder="Prix *" value={editForm.price} onChange={(e) => setEditForm({...editForm, price: e.target.value})} required={!editForm.price_on_request} disabled={editForm.price_on_request} className={editForm.price_on_request ? 'opacity-50' : ''} />
                    <select
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent text-xs font-medium text-gray-500 border-none outline-none cursor-pointer"
                      value={editForm.currency}
                      onChange={(e) => setEditForm({...editForm, currency: e.target.value})}
                    >
                      <option value="GNF">GNF</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  <select
                    className="px-3 py-2 border rounded-lg text-sm"
                    value={editForm.product_type}
                    onChange={(e) => setEditForm({...editForm, product_type: e.target.value, characteristics: {}})}
                    data-testid="edit-product-type-select"
                  >
                    <option value="">Type de produit</option>
                    {PRODUCT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={editForm.price_on_request} onChange={(e) => setEditForm({...editForm, price_on_request: e.target.checked, price: e.target.checked ? '0' : editForm.price})} className="rounded" />
                    <span className="text-orange-600 font-medium">Prix sur demande</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={editForm.is_negotiable} onChange={(e) => setEditForm({...editForm, is_negotiable: e.target.checked})} className="rounded" />
                    Prix négociable
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={editForm.is_available} onChange={(e) => setEditForm({...editForm, is_available: e.target.checked})} className="rounded" />
                    <span className={editForm.is_available ? 'text-green-600' : 'text-red-500'}>En stock</span>
                  </label>
                </div>
                {renderCharacteristicsFields(editForm, setEditForm)}
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
                        {product.product_type && (
                          <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
                            {PRODUCT_TYPES.find(t => t.value === product.product_type)?.label || product.product_type}
                          </span>
                        )}
                        <p className="text-orange-600 font-bold text-sm">
                          {product.price_on_request 
                            ? <span className="text-blue-600 italic">Prix sur demande</span>
                            : <>{formatPrice(product.price)} {product.currency || 'GNF'} {product.is_negotiable && <span className="text-xs font-normal text-gray-400">(Négociable)</span>}</>
                          }
                        </p>
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

      {/* Inquiries (Demandes) Section */}
      {activeSection === 'inquiries' && (
        <div data-testid="shop-inquiries-section">
          <h3 className="font-bold text-lg mb-1">Historique des demandes</h3>
          <p className="text-sm text-gray-500 mb-4">Tous les produits pour lesquels des clients vous ont contacté</p>
          {loadingInquiries ? (
            <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" /></div>
          ) : shopInquiries.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <Tag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucune demande pour le moment</p>
              <p className="text-gray-400 text-xs mt-1">Vos demandes clients apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shopInquiries.map(inq => {
                const status = inq.status || 'pending';
                const statusConfig = {
                  pending: { label: 'En attente', class: 'bg-orange-100 text-orange-700' },
                  processed: { label: 'Traitée (vente)', class: 'bg-green-100 text-green-700' },
                  cancelled: { label: 'Annulée', class: 'bg-gray-100 text-gray-600' },
                };
                const cfg = statusConfig[status];
                return (
                <Card key={inq.id} className={`p-4 ${status === 'pending' && !inq.is_read ? 'border-orange-200 bg-orange-50/30' : ''}`} data-testid={`shop-inquiry-${inq.id}`}>
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                      {inq.product_photo ? (
                        <img src={getImageUrl(inq.product_photo)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="h-6 w-6 text-gray-300" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm truncate">{inq.product_name}</h4>
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 flex-wrap">
                            <User className="h-3 w-3" /> {inq.sender_name}
                            <span className="text-gray-300">•</span>
                            <Phone className="h-3 w-3" /> {inq.sender_phone}
                          </p>
                          {inq.product_price > 0 && (
                            <p className="text-orange-600 font-bold text-sm mt-1">
                              {new Intl.NumberFormat('fr-FR').format(inq.product_price)} {inq.product_currency || 'GNF'}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.class}`}>
                            {cfg.label}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(inq.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 bg-gray-50 rounded-lg p-2.5">
                    <p className="text-xs text-gray-600 line-clamp-3">{inq.message}</p>
                  </div>
                  {status === 'pending' && (
                    <div className="mt-3 flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        onClick={() => updateInquiryStatus(inq.id, 'cancelled')}
                        data-testid={`inquiry-cancel-${inq.id}`}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Annuler
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => updateInquiryStatus(inq.id, 'processed')}
                        data-testid={`inquiry-process-${inq.id}`}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Traiter (vente)
                      </Button>
                    </div>
                  )}
                  {status === 'processed' && inq.processed_at && (
                    <p className="text-[10px] text-green-600 mt-2 text-right">
                      Traitée le {new Date(inq.processed_at).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </Card>
              );})}
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
        <ShopEditSection shop={shop} setShop={setShop} apiPrefix={apiPrefix} authHeaders={authHeaders} logoInputRef={logoInputRef} handleUploadLogo={handleUploadLogo} />
      )}
    </div>
  );
};

export default MyShop;
