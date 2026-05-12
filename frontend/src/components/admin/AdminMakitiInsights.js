import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, TrendingUp, Lightbulb, RefreshCw, Trash2, Loader2, Phone, User, Check, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_COLORS = {
  pending: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  reviewed: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  added: 'bg-green-500/20 text-green-300 border-green-500/40',
  rejected: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
};
const STATUS_LABELS = {
  pending: 'En attente',
  reviewed: 'Examinée',
  added: 'Ajoutée',
  rejected: 'Rejetée',
};

const getAdminHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return { headers: { Authorization: `Bearer ${token}` } };
};

const AdminMakitiInsights = () => {
  const [searches, setSearches] = useState({ recent: [], top_queries: [], total: 0 });
  const [suggestions, setSuggestions] = useState({ suggestions: [], total: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('searches'); // searches | suggestions

  const load = async () => {
    setLoading(true);
    try {
      const [s, sug] = await Promise.all([
        axios.get(`${API}/admin/makiti/searches`, getAdminHeaders()),
        axios.get(`${API}/admin/makiti/product-suggestions`, getAdminHeaders()),
      ]);
      setSearches(s.data);
      setSuggestions(sug.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const deleteSearch = async (id) => {
    if (!window.confirm('Supprimer cette recherche ?')) return;
    try {
      await axios.delete(`${API}/admin/makiti/searches/${id}`, getAdminHeaders());
      setSearches(prev => ({
        ...prev,
        recent: prev.recent.filter(r => r.id !== id),
        total: prev.total - 1,
      }));
      toast.success('Supprimée');
    } catch (err) {
      toast.error('Erreur');
    }
  };

  const updateSuggestionStatus = async (id, status) => {
    try {
      await axios.put(`${API}/admin/makiti/product-suggestions/${id}/status`, { status }, getAdminHeaders());
      setSuggestions(prev => ({
        ...prev,
        suggestions: prev.suggestions.map(s => s.id === id ? { ...s, status } : s),
        pending: prev.suggestions.find(s => s.id === id)?.status === 'pending' && status !== 'pending'
          ? prev.pending - 1 : prev.pending,
      }));
      toast.success('Statut mis à jour');
    } catch (err) {
      toast.error('Erreur');
    }
  };

  const deleteSuggestion = async (id) => {
    if (!window.confirm('Supprimer cette suggestion ?')) return;
    try {
      await axios.delete(`${API}/admin/makiti/product-suggestions/${id}`, getAdminHeaders());
      setSuggestions(prev => ({
        ...prev,
        suggestions: prev.suggestions.filter(s => s.id !== id),
        total: prev.total - 1,
      }));
      toast.success('Supprimée');
    } catch (err) {
      toast.error('Erreur');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-makiti-insights">
      {/* Header */}
      <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 border-0 p-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6" />
            <div>
              <h3 className="text-lg font-bold">Insights Makiti</h3>
              <p className="text-indigo-100 text-sm">Recherches utilisateurs et suggestions de produits</p>
            </div>
          </div>
          <Button onClick={load} variant="outline" size="sm" className="bg-white/10 text-white border-white/30 hover:bg-white/20">
            <RefreshCw className="h-4 w-4 mr-2" /> Actualiser
          </Button>
        </div>
      </Card>

      {/* View toggle */}
      <div className="flex gap-2">
        <Button
          variant={view === 'searches' ? 'default' : 'outline'}
          onClick={() => setView('searches')}
          className={view === 'searches' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
          data-testid="insights-tab-searches"
        >
          <Search className="h-4 w-4 mr-2" />
          Recherches ({searches.total})
        </Button>
        <Button
          variant={view === 'suggestions' ? 'default' : 'outline'}
          onClick={() => setView('suggestions')}
          className={view === 'suggestions' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
          data-testid="insights-tab-suggestions"
        >
          <Lightbulb className="h-4 w-4 mr-2" />
          Suggestions ({suggestions.total})
          {suggestions.pending > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white rounded-full text-xs">{suggestions.pending}</span>
          )}
        </Button>
      </div>

      {/* SEARCHES VIEW */}
      {view === 'searches' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top queries */}
          <Card className="bg-slate-800 border-slate-700 p-5 lg:col-span-1">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-400" />
              Top recherches
            </h4>
            {searches.top_queries.length === 0 ? (
              <p className="text-slate-400 text-sm">Aucune recherche enregistrée</p>
            ) : (
              <div className="space-y-2">
                {searches.top_queries.map((tq, idx) => {
                  const max = searches.top_queries[0]?.count || 1;
                  const percent = (tq.count / max) * 100;
                  return (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white truncate">{tq.query}</span>
                        <span className="text-slate-400">{tq.count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-amber-400"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Recent searches */}
          <Card className="bg-slate-800 border-slate-700 p-5 lg:col-span-2">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Search className="h-4 w-4 text-blue-400" />
              Recherches récentes
            </h4>
            {searches.recent.length === 0 ? (
              <p className="text-slate-400 text-sm">Aucune recherche enregistrée</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {searches.recent.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg" data-testid={`search-row-${s.id}`}>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{s.query}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(s.created_at).toLocaleString('fr-FR')}
                        {' • '}
                        {s.results_count} résultat(s)
                        {s.customer_id && <span className="ml-2 text-blue-300">• Client connecté</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteSearch(s.id)}
                      className="text-slate-400 hover:text-red-400 transition-colors p-1"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* SUGGESTIONS VIEW */}
      {view === 'suggestions' && (
        <Card className="bg-slate-800 border-slate-700 p-5">
          <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            Suggestions de produits demandés
          </h4>

          {suggestions.suggestions.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">
              Aucune suggestion pour le moment.
              <br />
              Les suggestions des utilisateurs apparaîtront ici.
            </p>
          ) : (
            <div className="space-y-3">
              {suggestions.suggestions.map((s) => (
                <div key={s.id} className="bg-slate-700/50 rounded-xl p-4" data-testid={`suggestion-row-${s.id}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <p className="text-white text-sm leading-relaxed">{s.suggestion}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full border whitespace-nowrap ${STATUS_COLORS[s.status] || STATUS_COLORS.pending}`}>
                      {STATUS_LABELS[s.status] || s.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap mt-2">
                    <span>{new Date(s.created_at).toLocaleString('fr-FR')}</span>
                    {s.contact_name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> {s.contact_name}
                      </span>
                    )}
                    {s.contact_phone && (
                      <a href={`tel:${s.contact_phone}`} className="flex items-center gap-1 text-blue-300 hover:underline">
                        <Phone className="h-3 w-3" /> {s.contact_phone}
                      </a>
                    )}
                    {s.customer_id && <span className="text-blue-300">Client connecté</span>}
                  </div>

                  <div className="flex gap-2 mt-3 flex-wrap">
                    {s.status !== 'reviewed' && (
                      <Button size="sm" variant="outline" onClick={() => updateSuggestionStatus(s.id, 'reviewed')} className="bg-blue-500/10 border-blue-500/40 text-blue-300 hover:bg-blue-500/20">
                        Examiner
                      </Button>
                    )}
                    {s.status !== 'added' && (
                      <Button size="sm" variant="outline" onClick={() => updateSuggestionStatus(s.id, 'added')} className="bg-green-500/10 border-green-500/40 text-green-300 hover:bg-green-500/20">
                        <Check className="h-3.5 w-3.5 mr-1" /> Ajoutée
                      </Button>
                    )}
                    {s.status !== 'rejected' && (
                      <Button size="sm" variant="outline" onClick={() => updateSuggestionStatus(s.id, 'rejected')} className="bg-gray-500/10 border-gray-500/40 text-gray-300 hover:bg-gray-500/20">
                        <XIcon className="h-3.5 w-3.5 mr-1" /> Rejeter
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => deleteSuggestion(s.id)} className="bg-red-500/10 border-red-500/40 text-red-300 hover:bg-red-500/20 ml-auto">
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default AdminMakitiInsights;
