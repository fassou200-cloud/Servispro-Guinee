import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  Building2, LogOut, FileText, Upload, Briefcase, Users, MapPin,
  CheckCircle, XCircle, Clock, Phone, Mail, Globe, Edit, Plus,
  Eye, AlertTriangle, Shield, User, ExternalLink, Trash2
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CompanyDashboard = () => {
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [services, setServices] = useState([]);
  const [jobOffers, setJobOffers] = useState([]);

  // Fetch company profile
  useEffect(() => {
    const fetchCompanyProfile = async () => {
      try {
        const token = localStorage.getItem('companyToken');
        if (!token) {
          navigate('/company/auth');
          return;
        }

        const response = await axios.get(`${API}/company/profile/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCompany(response.data);
      } catch (error) {
        console.error('Error fetching profile:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('companyToken');
          navigate('/company/auth');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyProfile();
  }, [navigate]);

  // Fetch services and job offers
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('companyToken');
      if (!token) return;

      try {
        const [servicesRes, jobsRes] = await Promise.all([
          axios.get(`${API}/company/services/my`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/company/job-offers/my`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setServices(servicesRes.data);
        setJobOffers(jobsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (company) fetchData();
  }, [company]);

  const handleLogout = () => {
    localStorage.removeItem('companyToken');
    localStorage.removeItem('company');
    toast.success('Déconnexion réussie');
    navigate('/');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle, label: 'Approuvée' };
      case 'rejected':
        return { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle, label: 'Rejetée' };
      default:
        return { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock, label: 'En attente' };
    }
  };

  const getDocumentStatus = () => {
    if (!company) return { complete: 0, total: 4 };
    const docs = [
      company.licence_exploitation,
      company.rccm_document,
      company.nif_document,
      company.attestation_fiscale
    ];
    const complete = docs.filter(Boolean).length;
    return { complete, total: 4 };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Card className="p-8 bg-slate-800 border-slate-700 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Session expirée</h2>
          <p className="text-slate-400 mb-4">Veuillez vous reconnecter</p>
          <Button onClick={() => navigate('/company/auth')} className="bg-emerald-600 hover:bg-emerald-700">
            Se reconnecter
          </Button>
        </Card>
      </div>
    );
  }

  const statusBadge = getStatusBadge(company.verification_status);
  const docStatus = getDocumentStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {company.logo ? (
                <img src={`${BACKEND_URL}${company.logo}`} alt="Logo" className="h-12 w-12 rounded-xl object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-white">{company.company_name}</h1>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${statusBadge.color}`}>
                    <statusBadge.icon className="h-3 w-3" />
                    {statusBadge.label}
                  </span>
                  <span className="text-xs text-slate-500">{company.sector}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${company.online_status ? 'text-green-400' : 'text-slate-400'}`}>
                  {company.online_status ? 'En ligne' : 'Hors ligne'}
                </span>
                <Switch
                  checked={company.online_status}
                  onCheckedChange={async (checked) => {
                    try {
                      const token = localStorage.getItem('companyToken');
                      await axios.put(`${API}/company/profile/me`, 
                        { online_status: checked },
                        { headers: { Authorization: `Bearer ${token}` } }
                      );
                      setCompany({ ...company, online_status: checked });
                    } catch (error) {
                      toast.error('Erreur lors de la mise à jour');
                    }
                  }}
                />
              </div>
              <Button variant="outline" onClick={handleLogout} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Pending Verification Banner */}
      {company.verification_status === 'pending' && (
        <div className="bg-amber-500/10 border-b border-amber-500/30">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-400" />
              <div>
                <p className="text-amber-400 font-medium">Votre entreprise est en attente de validation</p>
                <p className="text-amber-200/70 text-sm">
                  Notre équipe vérifie vos documents. Vous pourrez publier des services et offres demploi une fois approuvé.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { id: 'profile', label: 'Profil', icon: Building2 },
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'services', label: 'Services', icon: Briefcase },
            { id: 'jobs', label: 'Offres Emploi', icon: Users },
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'border-slate-600 text-slate-300 hover:bg-slate-700'}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Company Info Card */}
            <Card className="lg:col-span-2 p-6 bg-slate-800/50 border-slate-700">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-400" />
                Informations de lentreprise
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-slate-400 text-sm">Nom</Label>
                  <p className="text-white font-medium">{company.company_name}</p>
                </div>
                <div>
                  <Label className="text-slate-400 text-sm">Secteur</Label>
                  <p className="text-white">{company.sector}</p>
                </div>
                <div>
                  <Label className="text-slate-400 text-sm">Numéro RCCM</Label>
                  <p className="text-white font-mono">{company.rccm_number}</p>
                </div>
                <div>
                  <Label className="text-slate-400 text-sm">Numéro NIF</Label>
                  <p className="text-white font-mono">{company.nif_number || '-'}</p>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-slate-400 text-sm">Adresse</Label>
                  <p className="text-white flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-400" />
                    {company.address}, {company.city}, {company.region}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-400 text-sm">Téléphone</Label>
                  <p className="text-white flex items-center gap-2">
                    <Phone className="h-4 w-4 text-emerald-400" />
                    {company.phone_number}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-400 text-sm">Email</Label>
                  <p className="text-white flex items-center gap-2">
                    <Mail className="h-4 w-4 text-emerald-400" />
                    {company.email || '-'}
                  </p>
                </div>
                {company.website && (
                  <div className="md:col-span-2">
                    <Label className="text-slate-400 text-sm">Site web</Label>
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {company.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                <div className="md:col-span-2">
                  <Label className="text-slate-400 text-sm">Description</Label>
                  <p className="text-slate-300">{company.description}</p>
                </div>
              </div>

              {/* Contact Person */}
              <div className="mt-6 p-4 bg-slate-700/30 rounded-xl">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-400" />
                  Personne de contact
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-400 text-sm">Nom</Label>
                    <p className="text-white">{company.contact_person_name}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-sm">Téléphone</Label>
                    <p className="text-white">{company.contact_person_phone}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Stats Card */}
            <Card className="p-6 bg-slate-800/50 border-slate-700">
              <h2 className="text-xl font-bold text-white mb-6">Statistiques</h2>
              
              <div className="space-y-4">
                <div className="p-4 bg-slate-700/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400">Services publiés</span>
                    <Briefcase className="h-5 w-5 text-emerald-400" />
                  </div>
                  <p className="text-3xl font-bold text-white">{services.length}</p>
                </div>

                <div className="p-4 bg-slate-700/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400">Offres demploi</span>
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                  <p className="text-3xl font-bold text-white">{jobOffers.length}</p>
                </div>

                <div className="p-4 bg-slate-700/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400">Documents</span>
                    <FileText className="h-5 w-5 text-amber-400" />
                  </div>
                  <p className="text-xl font-bold text-white">{docStatus.complete}/{docStatus.total}</p>
                  <div className="w-full bg-slate-600 rounded-full h-2 mt-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${(docStatus.complete / docStatus.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <Card className="p-6 bg-slate-800/50 border-slate-700">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-400" />
              Documents de lentreprise
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Logo */}
              <DocumentCard
                title="Logo"
                document={company.logo}
                onUpload={async (file) => {
                  const formData = new FormData();
                  formData.append('file', file);
                  const token = localStorage.getItem('companyToken');
                  await axios.post(`${API}/company/upload-logo`, formData, {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                  });
                  const res = await axios.get(`${API}/company/profile/me`, { headers: { Authorization: `Bearer ${token}` } });
                  setCompany(res.data);
                  toast.success('Logo mis à jour');
                }}
              />

              {/* Licence */}
              <DocumentCard
                title="Licence dexploitation"
                document={company.licence_exploitation}
                required
                onUpload={async (file) => {
                  const formData = new FormData();
                  formData.append('file', file);
                  const token = localStorage.getItem('companyToken');
                  await axios.post(`${API}/company/upload-document/licence_exploitation`, formData, {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                  });
                  const res = await axios.get(`${API}/company/profile/me`, { headers: { Authorization: `Bearer ${token}` } });
                  setCompany(res.data);
                  toast.success('Document mis à jour');
                }}
              />

              {/* RCCM */}
              <DocumentCard
                title="Document RCCM"
                document={company.rccm_document}
                required
                onUpload={async (file) => {
                  const formData = new FormData();
                  formData.append('file', file);
                  const token = localStorage.getItem('companyToken');
                  await axios.post(`${API}/company/upload-document/rccm_document`, formData, {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                  });
                  const res = await axios.get(`${API}/company/profile/me`, { headers: { Authorization: `Bearer ${token}` } });
                  setCompany(res.data);
                  toast.success('Document mis à jour');
                }}
              />

              {/* NIF */}
              <DocumentCard
                title="Document NIF"
                document={company.nif_document}
                onUpload={async (file) => {
                  const formData = new FormData();
                  formData.append('file', file);
                  const token = localStorage.getItem('companyToken');
                  await axios.post(`${API}/company/upload-document/nif_document`, formData, {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                  });
                  const res = await axios.get(`${API}/company/profile/me`, { headers: { Authorization: `Bearer ${token}` } });
                  setCompany(res.data);
                  toast.success('Document mis à jour');
                }}
              />

              {/* Attestation Fiscale */}
              <DocumentCard
                title="Attestation de Régularité Fiscale"
                document={company.attestation_fiscale}
                onUpload={async (file) => {
                  const formData = new FormData();
                  formData.append('file', file);
                  const token = localStorage.getItem('companyToken');
                  await axios.post(`${API}/company/upload-document/attestation_fiscale`, formData, {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                  });
                  const res = await axios.get(`${API}/company/profile/me`, { headers: { Authorization: `Bearer ${token}` } });
                  setCompany(res.data);
                  toast.success('Document mis à jour');
                }}
              />
            </div>

            {/* Additional Documents */}
            {company.documents_additionnels && company.documents_additionnels.length > 0 && (
              <div className="mt-6">
                <h3 className="text-white font-bold mb-4">Autres Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {company.documents_additionnels.map((doc, idx) => (
                    <a
                      key={idx}
                      href={`${BACKEND_URL}${doc}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors flex items-center gap-3"
                    >
                      <FileText className="h-5 w-5 text-emerald-400" />
                      <span className="text-slate-300">Document {idx + 1}</span>
                      <ExternalLink className="h-4 w-4 text-slate-500 ml-auto" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            {company.verification_status !== 'approved' ? (
              <Card className="p-8 bg-slate-800/50 border-slate-700 text-center">
                <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Fonctionnalité restreinte</h3>
                <p className="text-slate-400">
                  Vous pourrez publier des services une fois votre entreprise approuvée par notre équipe.
                </p>
              </Card>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">Mes Services</h2>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un service
                  </Button>
                </div>

                {services.length === 0 ? (
                  <Card className="p-8 bg-slate-800/50 border-slate-700 text-center">
                    <Briefcase className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Aucun service publié</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {services.map(service => (
                      <Card key={service.id} className="p-4 bg-slate-800/50 border-slate-700">
                        <h3 className="text-white font-bold">{service.title}</h3>
                        <p className="text-slate-400 text-sm mt-1">{service.description}</p>
                        <div className="flex items-center justify-between mt-4">
                          <span className="text-emerald-400">
                            {service.price_min && service.price_max 
                              ? `${service.price_min.toLocaleString()} - ${service.price_max.toLocaleString()} GNF`
                              : 'Prix sur devis'}
                          </span>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="text-slate-400">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-400">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Job Offers Tab */}
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            {company.verification_status !== 'approved' ? (
              <Card className="p-8 bg-slate-800/50 border-slate-700 text-center">
                <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Fonctionnalité restreinte</h3>
                <p className="text-slate-400">
                  Vous pourrez publier des offres demploi une fois votre entreprise approuvée par notre équipe.
                </p>
              </Card>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">Mes Offres dEmploi</h2>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Publier une offre
                  </Button>
                </div>

                {jobOffers.length === 0 ? (
                  <Card className="p-8 bg-slate-800/50 border-slate-700 text-center">
                    <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Aucune offre demploi publiée</p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {jobOffers.map(job => (
                      <Card key={job.id} className="p-6 bg-slate-800/50 border-slate-700">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-white font-bold text-lg">{job.title}</h3>
                            <p className="text-slate-400 text-sm mt-1">{job.description}</p>
                            <div className="flex gap-4 mt-4 text-sm">
                              <span className="text-slate-500 flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {job.location}
                              </span>
                              <span className="text-emerald-400">{job.contract_type}</span>
                              {job.salary_min && job.salary_max && (
                                <span className="text-slate-400">
                                  {job.salary_min.toLocaleString()} - {job.salary_max.toLocaleString()} GNF
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`px-3 py-1 rounded text-xs ${job.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                              {job.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-slate-500 text-sm">{job.applications_count} candidature(s)</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Document Card Component
const DocumentCard = ({ title, document, required, onUpload }) => {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop grand (max 10MB)');
      return;
    }

    setUploading(true);
    try {
      await onUpload(file);
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 bg-slate-700/50 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className={`h-5 w-5 ${document ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span className="text-white font-medium">{title}</span>
          {required && <span className="text-red-400 text-xs">*</span>}
        </div>
        {document ? (
          <CheckCircle className="h-5 w-5 text-emerald-400" />
        ) : (
          <XCircle className="h-5 w-5 text-slate-500" />
        )}
      </div>

      <div className="flex gap-2">
        {document && (
          <a
            href={`${BACKEND_URL}${document}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-600">
              <Eye className="h-4 w-4 mr-2" />
              Voir
            </Button>
          </a>
        )}
        <div className="flex-1">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="hidden"
            id={`doc-${title}`}
          />
          <Button
            variant="outline"
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-600"
            onClick={() => document.getElementById(`doc-${title}`).click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Envoi...' : document ? 'Remplacer' : 'Télécharger'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;
