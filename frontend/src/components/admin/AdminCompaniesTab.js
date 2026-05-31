import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { getImageUrl } from '@/utils/imageUrl';
import { Building, Camera, CheckCircle, ChevronLeft, ChevronRight, Eye, FileText, Image as ImageIcon, ImagePlus, Loader2, MapPin, MessageCircle, Package, Pencil, Save, Store, Trash2, UserCheck, UserCircle, UserX, X, XCircle } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';

const COMPANIES_PER_PAGE = 10;

const STATUS_ORDER = { pending: 0, approved: 1, rejected: 2 };

const AdminCompaniesTab = ({
  adminProductEditData,
  companies,
  companyEditData,
  companyProducts,
  deletingAdminPhoto,
  editingAdminProduct,
  editingCompany,
  expandedProductPhotos,
  loadingProducts,
  selectedCompany,
  setAdminProductEditData,
  setCompanies,
  setCompanyEditData,
  setEditingAdminProduct,
  setEditingCompany,
  setExpandedProductPhotos,
  setSelectedCompany,
  confirmDelete,
  getStatusBadge,
  handleAdminDeletePhoto,
  handleAdminDeleteProduct,
  handleAdminUpdateProduct,
  handleAdminAddPhotos,
  uploadingAdminPhotos,
  handleApproveCompany,
  handleRejectCompany,
  loadCompanyProducts,
  API,
  BACKEND_URL,
  adminApi,
  translateStatus
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'

  // Sort: pending companies first, then approved, then rejected; within each group, newest first
  const sortedCompanies = useMemo(() => {
    const filtered = statusFilter === 'all'
      ? companies
      : companies.filter((c) => (c.verification_status || 'pending') === statusFilter);
    return [...filtered].sort((a, b) => {
      const aOrder = STATUS_ORDER[a.verification_status] ?? 99;
      const bOrder = STATUS_ORDER[b.verification_status] ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
  }, [companies, statusFilter]);

  const pendingCount = useMemo(
    () => companies.filter((c) => (c.verification_status || 'pending') === 'pending').length,
    [companies]
  );

  const totalPages = Math.max(1, Math.ceil(sortedCompanies.length / COMPANIES_PER_PAGE));
  const pageStart = (currentPage - 1) * COMPANIES_PER_PAGE;
  const pageItems = sortedCompanies.slice(pageStart, pageStart + COMPANIES_PER_PAGE);

  // Reset page when filter changes or company list shrinks
  useEffect(() => { setCurrentPage(1); }, [statusFilter]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <h2 className="text-lg font-heading font-bold text-white">
            Entreprises ({companies.length})
            {pendingCount > 0 && (
              <span className="ml-2 text-xs font-medium text-orange-300 bg-orange-500/20 border border-orange-500/40 px-2 py-0.5 rounded-full">
                {pendingCount} à approuver
              </span>
            )}
          </h2>
          <div className="flex gap-1">
            {[
              { key: 'all', label: 'Tous' },
              { key: 'pending', label: 'En attente' },
              { key: 'approved', label: 'Approuvés' },
              { key: 'rejected', label: 'Rejetés' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setStatusFilter(opt.key)}
                className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                  statusFilter === opt.key
                    ? 'bg-teal-500 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
                data-testid={`companies-filter-${opt.key}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {sortedCompanies.length === 0 ? (
          <Card className="p-8 bg-slate-800 border-slate-700 text-center">
            <p className="text-slate-400">Aucune entreprise {statusFilter !== 'all' ? `(${statusFilter})` : 'inscrite'}</p>
          </Card>
        ) : (
          pageItems.map((company) => (
            <Card
              key={company.id}
              className={`p-4 bg-slate-800 border-slate-700 cursor-pointer transition-colors ${
                selectedCompany?.id === company.id ? 'border-teal-500' : 'hover:border-slate-600'
              }`}
              onClick={() => { setSelectedCompany(company); loadCompanyProducts(company.id); setEditingAdminProduct(null); setExpandedProductPhotos(null); }}
            >
              <div className="flex gap-4">
                {company.logo ? (
                  <img
                    src={`${BACKEND_URL}${company.logo}`}
                    alt={company.company_name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center">
                    <Building className="h-8 w-8 text-slate-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-white truncate">{company.company_name}</h3>
                    <span className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium border ${getStatusBadge(company.verification_status)}`}>
                      {translateStatus(company.verification_status)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">{company.sector}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <MapPin className="h-3 w-3" />
                    {company.city}, {company.region}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span className="text-slate-400">
                      RCCM: {company.rccm_number}
                    </span>
                    {company.online_status && (
                      <span className="text-green-400">● En ligne</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 pt-2" data-testid="companies-pagination">
            <span className="text-xs text-slate-400">
              {pageStart + 1}–{Math.min(pageStart + COMPANIES_PER_PAGE, sortedCompanies.length)} sur {sortedCompanies.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
                data-testid="companies-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-white px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
                data-testid="companies-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Company Detail */}
      <div>
        <h2 className="text-lg font-heading font-bold text-white mb-4">Détails de l Entreprise</h2>
        {selectedCompany ? (
          <Card className="p-6 bg-slate-800 border-slate-700">
            {/* Header with Logo */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {selectedCompany.logo ? (
                  <img
                    src={`${BACKEND_URL}${selectedCompany.logo}`}
                    alt={selectedCompany.company_name}
                    className="w-20 h-20 object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-20 h-20 bg-slate-700 rounded-xl flex items-center justify-center">
                    <Building className="h-10 w-10 text-slate-500" />
                  </div>
                )}
                <div>
                  {editingCompany ? (
                    <input
                      value={companyEditData.company_name || ''}
                      onChange={(e) => setCompanyEditData({...companyEditData, company_name: e.target.value})}
                      className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white font-bold text-lg focus:outline-none focus:border-teal-500"
                    />
                  ) : (
                    <h3 className="text-xl font-bold text-white">{selectedCompany.company_name}</h3>
                  )}
                  {editingCompany ? (
                    <select
                      value={companyEditData.sector || ''}
                      onChange={(e) => setCompanyEditData({...companyEditData, sector: e.target.value})}
                      className="mt-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-teal-400 text-sm focus:outline-none focus:border-teal-500"
                    >
                      <option value="Construction">Construction & BTP</option>
                      <option value="Securite">Sécurité & Gardiennage</option>
                      <option value="Informatique">Informatique & Technologie</option>
                      <option value="Restauration">Restauration & Hôtellerie</option>
                      <option value="Immobilier">Agence Immobilière</option>
                      <option value="Commerce">Commerce & Distribution</option>
                      <option value="Automobiles">Automobiles & Transport</option>
                      <option value="Agriculture">Agriculture & Agroalimentaire</option>
                      <option value="Industrie">Industrie & Manufacture</option>
                      <option value="Services">Services aux Entreprises</option>
                      <option value="Autres">Autres</option>
                    </select>
                  ) : (
                    <p className="text-teal-400">{selectedCompany.sector}</p>
                  )}
                  <span className={`inline-flex mt-1 px-2 py-1 rounded text-xs font-medium border ${getStatusBadge(selectedCompany.verification_status)}`}>
                    {translateStatus(selectedCompany.verification_status)}
                  </span>
                </div>
              </div>
              {!editingCompany ? (
                <button
                  onClick={() => {
                    setEditingCompany(true);
                    setCompanyEditData({
                      company_name: selectedCompany.company_name || '',
                      sector: selectedCompany.sector || '',
                      address: selectedCompany.address || '',
                      city: selectedCompany.city || '',
                      region: selectedCompany.region || '',
                      phone_number: selectedCompany.phone_number || '',
                      email: selectedCompany.email || '',
                      rccm_number: selectedCompany.rccm_number || '',
                      nif_number: selectedCompany.nif_number || '',
                      contact_person_name: selectedCompany.contact_person_name || '',
                      contact_person_phone: selectedCompany.contact_person_phone || '',
                      description: selectedCompany.description || ''
                    });
                  }}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded-lg font-medium flex items-center gap-1"
                  data-testid="edit-company-btn"
                >
                  <Pencil className="h-3 w-3" /> Modifier
                </button>
              ) : null}
            </div>

            {/* Company Info */}
            <div className="space-y-3 mb-6">
              {editingCompany ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Adresse</label>
                    <input value={companyEditData.address || ''} onChange={(e) => setCompanyEditData({...companyEditData, address: e.target.value})}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Ville</label>
                      <input value={companyEditData.city || ''} onChange={(e) => setCompanyEditData({...companyEditData, city: e.target.value})}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Région</label>
                      <input value={companyEditData.region || ''} onChange={(e) => setCompanyEditData({...companyEditData, region: e.target.value})}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Téléphone</label>
                    <input value={companyEditData.phone_number || ''} onChange={(e) => setCompanyEditData({...companyEditData, phone_number: e.target.value})}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Email</label>
                    <input value={companyEditData.email || ''} onChange={(e) => setCompanyEditData({...companyEditData, email: e.target.value})}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">RCCM</label>
                      <input value={companyEditData.rccm_number || ''} onChange={(e) => setCompanyEditData({...companyEditData, rccm_number: e.target.value})}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-teal-500" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">NIF</label>
                      <input value={companyEditData.nif_number || ''} onChange={(e) => setCompanyEditData({...companyEditData, nif_number: e.target.value})}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-teal-500" />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {selectedCompany.address}, {selectedCompany.city}, {selectedCompany.region}
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <UserCircle className="h-4 w-4 text-slate-400" />
                    {selectedCompany.phone_number}
                  </div>
                  {selectedCompany.email && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <MessageCircle className="h-4 w-4 text-slate-400" />
                      {selectedCompany.email}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-slate-700/50 rounded-lg">
                    <div>
                      <p className="text-xs text-slate-400">RCCM</p>
                      <p className="text-white font-mono">{selectedCompany.rccm_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">NIF</p>
                      <p className="text-white font-mono">{selectedCompany.nif_number || '-'}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Contact Person */}
            <div className="mb-6 p-4 bg-slate-700/30 rounded-lg">
              <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Personne de Contact</h4>
              {editingCompany ? (
                <div className="space-y-2">
                  <input value={companyEditData.contact_person_name || ''} onChange={(e) => setCompanyEditData({...companyEditData, contact_person_name: e.target.value})}
                    placeholder="Nom" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500" />
                  <input value={companyEditData.contact_person_phone || ''} onChange={(e) => setCompanyEditData({...companyEditData, contact_person_phone: e.target.value})}
                    placeholder="Téléphone" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500" />
                </div>
              ) : (
                <>
                  <p className="text-white">{selectedCompany.contact_person_name}</p>
                  <p className="text-slate-400">{selectedCompany.contact_person_phone}</p>
                </>
              )}
            </div>

            {/* Description */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-slate-300 uppercase mb-2">Description</h4>
              {editingCompany ? (
                <textarea
                  value={companyEditData.description || ''}
                  onChange={(e) => setCompanyEditData({...companyEditData, description: e.target.value})}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-teal-500"
                  rows={4}
                />
              ) : (
                <p className="text-slate-400 text-sm">{selectedCompany.description}</p>
              )}
            </div>

            {/* Save / Cancel buttons for edit mode */}
            {editingCompany && (
              <div className="flex gap-3 mb-6 pt-4 border-t border-slate-700">
                <Button
                  onClick={async () => {
                    try {
                      await adminApi.put(`${API}/admin/companies/${selectedCompany.id}/update`, companyEditData);
                      toast.success('Entreprise mise à jour avec succès');
                      const updated = { ...selectedCompany, ...companyEditData };
                      setSelectedCompany(updated);
                      setCompanies(prev => prev.map(c => c.id === selectedCompany.id ? updated : c));
                      setEditingCompany(false);
                    } catch (err) {
                      console.error('Update error:', err.response?.data || err.message);
                      toast.error(err.response?.data?.detail || 'Erreur lors de la mise à jour');
                    }
                  }}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 gap-2"
                  data-testid="save-company-edit-btn"
                >
                  <CheckCircle className="h-4 w-4" /> Enregistrer
                </Button>
                <Button
                  onClick={() => setEditingCompany(false)}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Annuler
                </Button>
              </div>
            )}

            {/* Documents Section */}
            <div className="mb-6 p-4 bg-slate-700/50 rounded-lg">
              <h4 className="text-sm font-bold text-slate-300 uppercase mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents de l Entreprise
              </h4>
              <div className="space-y-2">
                {selectedCompany.licence_exploitation ? (
                  <a
                    href={`${BACKEND_URL}${selectedCompany.licence_exploitation}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Licence d Exploitation
                    </span>
                    <Eye className="h-4 w-4 text-slate-400" />
                  </a>
                ) : (
                  <div className="flex items-center gap-2 p-2 text-sm text-slate-500">
                    <XCircle className="h-4 w-4" />
                    Licence d Exploitation - Non fournie
                  </div>
                )}

                {selectedCompany.rccm_document ? (
                  <a
                    href={`${BACKEND_URL}${selectedCompany.rccm_document}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Document RCCM
                    </span>
                    <Eye className="h-4 w-4 text-slate-400" />
                  </a>
                ) : (
                  <div className="flex items-center gap-2 p-2 text-sm text-slate-500">
                    <XCircle className="h-4 w-4" />
                    Document RCCM - Non fourni
                  </div>
                )}

                {selectedCompany.nif_document ? (
                  <a
                    href={`${BACKEND_URL}${selectedCompany.nif_document}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Document NIF
                    </span>
                    <Eye className="h-4 w-4 text-slate-400" />
                  </a>
                ) : (
                  <div className="flex items-center gap-2 p-2 text-sm text-slate-500">
                    <XCircle className="h-4 w-4" />
                    Document NIF - Non fourni
                  </div>
                )}

                {selectedCompany.attestation_fiscale ? (
                  <a
                    href={`${BACKEND_URL}${selectedCompany.attestation_fiscale}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 bg-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      Attestation Fiscale
                    </span>
                    <Eye className="h-4 w-4 text-slate-400" />
                  </a>
                ) : (
                  <div className="flex items-center gap-2 p-2 text-sm text-slate-500">
                    <XCircle className="h-4 w-4" />
                    Attestation Fiscale - Non fournie
                  </div>
                )}

                {selectedCompany.documents_additionnels && selectedCompany.documents_additionnels.length > 0 && (
                  <div className="pt-2 border-t border-slate-600">
                    <span className="text-xs text-slate-400 mb-2 block">Documents Additionnels</span>
                    {selectedCompany.documents_additionnels.map((doc, idx) => (
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

            <div className="text-xs text-slate-500 mb-4">
              Inscrite le {new Date(selectedCompany.created_at).toLocaleDateString('fr-FR')}
            </div>

            {/* Company Products Section */}
            <div className="mb-6 p-4 bg-slate-700/30 rounded-lg">
              <h4 className="text-sm font-bold text-slate-300 uppercase mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Produits de la Boutique ({companyProducts.length})
              </h4>
              {loadingProducts ? (
                <div className="text-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-teal-500 mx-auto" />
                  <p className="text-slate-400 text-sm mt-2">Chargement des produits...</p>
                </div>
              ) : companyProducts.length === 0 ? (
                <div className="text-center py-6">
                  <Store className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Aucun produit dans cette boutique</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {companyProducts.map(product => {
                    const isEditing = editingAdminProduct === product.id;
                    const isPhotosExpanded = expandedProductPhotos === product.id;
                    return (
                      <div key={product.id} className="bg-slate-800 rounded-lg overflow-hidden border border-slate-600" data-testid={`admin-product-${product.id}`}>
                        {/* Product header */}
                        <div className="flex gap-3 p-3">
                          {/* Thumbnail */}
                          <div
                            className="w-20 h-20 bg-slate-700 rounded-lg flex-shrink-0 relative cursor-pointer overflow-hidden"
                            onClick={() => setExpandedProductPhotos(isPhotosExpanded ? null : product.id)}
                            data-testid={`admin-product-thumb-${product.id}`}
                          >
                            {product.photos?.length > 0 ? (
                              <img src={getImageUrl(product.photos[0])} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-6 w-6 text-slate-500" />
                              </div>
                            )}
                            {product.photos?.length > 0 && (
                              <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[10px] px-1 rounded flex items-center gap-0.5">
                                <ImageIcon className="h-2.5 w-2.5" /> {product.photos.length}
                              </span>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="space-y-2">
                                <input
                                  value={adminProductEditData.name || ''}
                                  onChange={e => setAdminProductEditData({...adminProductEditData, name: e.target.value})}
                                  className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-teal-500"
                                  placeholder="Nom du produit"
                                />
                                <textarea
                                  value={adminProductEditData.description || ''}
                                  onChange={e => setAdminProductEditData({...adminProductEditData, description: e.target.value})}
                                  className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm resize-none focus:outline-none focus:border-teal-500"
                                  rows={2}
                                  placeholder="Description"
                                />
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    value={adminProductEditData.price || ''}
                                    onChange={e => setAdminProductEditData({...adminProductEditData, price: e.target.value})}
                                    className="w-32 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-teal-500"
                                    placeholder="Prix"
                                  />
                                  <label className="flex items-center gap-1 text-xs text-slate-300">
                                    <input
                                      type="checkbox"
                                      checked={adminProductEditData.is_negotiable || false}
                                      onChange={e => setAdminProductEditData({...adminProductEditData, is_negotiable: e.target.checked})}
                                    />
                                    Négociable
                                  </label>
                                  <label className="flex items-center gap-1 text-xs text-slate-300">
                                    <input
                                      type="checkbox"
                                      checked={adminProductEditData.is_available !== false}
                                      onChange={e => setAdminProductEditData({...adminProductEditData, is_available: e.target.checked})}
                                    />
                                    En stock
                                  </label>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleAdminUpdateProduct(product.id)}
                                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded font-medium flex items-center gap-1"
                                    data-testid={`admin-save-product-${product.id}`}
                                  >
                                    <Save className="h-3 w-3" /> Enregistrer
                                  </button>
                                  <button
                                    onClick={() => setEditingAdminProduct(null)}
                                    className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded"
                                  >
                                    Annuler
                                  </button>
                                </div>
                                {/* Photo management inside edit mode */}
                                <div className="pt-2 border-t border-slate-700">
                                  <p className="text-xs text-slate-400 mb-2">
                                    Photos ({product.photos?.length || 0})
                                    {product.photos?.length > 0 && ' — cliquez sur la croix pour supprimer'}
                                  </p>
                                  {product.photos?.length > 0 && (
                                    <div className="flex gap-2 flex-wrap mb-2">
                                      {product.photos.map((photo, idx) => (
                                        <div key={idx} className="relative group h-14 w-14 rounded border border-slate-600 overflow-hidden bg-slate-900">
                                          <img src={getImageUrl(photo)} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                                          <button
                                            type="button"
                                            onClick={() => handleAdminDeletePhoto(product.id, idx)}
                                            disabled={deletingAdminPhoto === `${product.id}-${idx}`}
                                            className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow"
                                            data-testid={`admin-edit-delete-photo-${product.id}-${idx}`}
                                          >
                                            {deletingAdminPhoto === `${product.id}-${idx}` ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <X className="h-3 w-3" />
                                            )}
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <label
                                    className={`inline-flex items-center gap-1 px-3 py-1 text-xs rounded font-medium cursor-pointer ${uploadingAdminPhotos === product.id ? 'bg-slate-700 text-slate-400 cursor-wait' : 'bg-teal-600/20 hover:bg-teal-600/40 text-teal-400'}`}
                                    data-testid={`admin-edit-add-photos-${product.id}`}
                                  >
                                    {uploadingAdminPhotos === product.id ? (
                                      <><Loader2 className="h-3 w-3 animate-spin" /> Envoi…</>
                                    ) : (
                                      <><ImagePlus className="h-3 w-3" /> Ajouter une / des photo(s)</>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      className="hidden"
                                      onChange={(e) => { handleAdminAddPhotos(product.id, e.target.files); e.target.value = ''; }}
                                      disabled={uploadingAdminPhotos === product.id}
                                    />
                                  </label>
                                </div>
                              </div>
                            ) : (
                              <>
                                <h5 className="font-medium text-white text-sm truncate">{product.name}</h5>
                                <p className="text-xs text-slate-400 line-clamp-1">{product.description}</p>
                                <p className="text-teal-400 font-bold text-sm mt-1">
                                  {Number(product.price || 0).toLocaleString('fr-FR')} GNF
                                  {product.is_negotiable && <span className="text-xs font-normal text-slate-500 ml-1">(Négociable)</span>}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${product.is_available ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                                    {product.is_available ? 'En stock' : 'Rupture'}
                                  </span>
                                  <span className="text-[10px] text-slate-500 flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{product.total_views || 0}</span>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Action buttons */}
                          {!isEditing && (
                            <div className="flex flex-col gap-1 flex-shrink-0">
                              <button
                                onClick={() => { setEditingAdminProduct(product.id); setAdminProductEditData({ name: product.name, description: product.description, price: product.price, is_negotiable: product.is_negotiable, is_available: product.is_available }); }}
                                className="p-1.5 bg-teal-600/20 hover:bg-teal-600/40 text-teal-400 rounded"
                                title="Modifier"
                                data-testid={`admin-edit-product-${product.id}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleAdminDeleteProduct(product.id)}
                                className="p-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded"
                                title="Supprimer"
                                data-testid={`admin-delete-product-${product.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Expanded photos gallery */}
                        {isPhotosExpanded && product.photos?.length > 0 && (
                          <div className="border-t border-slate-600 bg-slate-900/50 p-3" data-testid={`admin-photo-gallery-${product.id}`}>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-medium text-slate-400">
                                Photos ({product.photos.length}) — cliquez sur X pour supprimer
                              </p>
                              <button onClick={() => setExpandedProductPhotos(null)} className="text-slate-500 hover:text-white">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {product.photos.map((photo, idx) => (
                                <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-600 bg-slate-800">
                                  <img src={getImageUrl(photo)} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                                  <button
                                    onClick={() => handleAdminDeletePhoto(product.id, idx)}
                                    disabled={deletingAdminPhoto === `${product.id}-${idx}`}
                                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                    data-testid={`admin-delete-photo-${product.id}-${idx}`}
                                    title="Supprimer cette photo"
                                  >
                                    {deletingAdminPhoto === `${product.id}-${idx}` ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </button>
                                  <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1 rounded">{idx + 1}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Show "click to see photos" hint when photos exist but not expanded */}
                        {!isPhotosExpanded && product.photos?.length > 0 && (
                          <button
                            onClick={() => setExpandedProductPhotos(product.id)}
                            className="w-full text-center py-1.5 text-[11px] text-teal-400 hover:text-teal-300 border-t border-slate-700 hover:bg-slate-700/50 transition-colors"
                            data-testid={`admin-show-photos-${product.id}`}
                          >
                            <Camera className="h-3 w-3 inline mr-1" />
                            Voir les {product.photos.length} photo(s)
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            {selectedCompany.verification_status === 'pending' && (
              <div className="flex gap-3 pt-4 border-t border-slate-700 mb-4">
                <Button
                  onClick={() => handleApproveCompany(selectedCompany.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                >
                  <UserCheck className="h-4 w-4" />
                  Approuver
                </Button>
                <Button
                  onClick={() => handleRejectCompany(selectedCompany.id)}
                  variant="outline"
                  className="flex-1 border-red-600 text-red-400 hover:bg-red-600 hover:text-white gap-2"
                >
                  <UserX className="h-4 w-4" />
                  Rejeter
                </Button>
              </div>
            )}

            <Button
              onClick={() => confirmDelete('company', selectedCompany.id, selectedCompany.company_name)}
              variant="outline"
              className="w-full border-red-600 text-red-400 hover:bg-red-600 hover:text-white gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer cette entreprise
            </Button>
          </Card>
        ) : (
          <Card className="p-8 bg-slate-800 border-slate-700 text-center">
            <Building className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Sélectionnez une entreprise pour voir ses détails</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminCompaniesTab;
