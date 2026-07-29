import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Plus, Edit2, Loader2, Image, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../../services/api';

export default function PlatformCertificates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/platform-admin/certificate-templates');
      setTemplates(res.data?.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates. The API may not be implemented yet.');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (template = null) => {
    if (template) {
      navigate(`edit/${template.id || template._id}`);
    } else {
      navigate('create');
    }
  };

  const toggleActiveStatus = async (template) => {
    try {
      const templateId = template.id || template._id;
      const newStatus = !template.isActive;
      await apiClient.patch(`/platform-admin/certificate-templates/${templateId}`, { isActive: newStatus });
      toast.success(`Template ${newStatus ? 'activated' : 'deactivated'} successfully`);
      fetchTemplates();
    } catch (err) {
      if (err.response?.data?.code === 'ACTIVE_LIMIT_EXCEEDED') {
        toast.error('Maximum active platform certificate templates limit of 4 has been reached. Deactivate another template first.', { duration: 6000 });
      } else {
        toast.error('Failed to toggle status.');
      }
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Certificate Templates</h2>
          <p className="text-white/60 text-sm mt-1">Manage and design platform-wide certificates.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-amber-500/20"
        >
          <Plus size={18} />
          Create Template
        </button>
      </div>

      {error && (
        <div className="glass-panel p-6 border border-amber-500/20 bg-amber-500/5 rounded-[24px] flex items-start gap-4">
          <AlertTriangle className="text-amber-400 flex-shrink-0" size={24} />
          <div>
            <h3 className="text-amber-400 font-bold mb-1">Backend Missing or Offline</h3>
            <p className="text-amber-400/80 text-sm">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-white/40">
          <Loader2 className="animate-spin mb-4 text-amber-500" size={32} />
          <span className="text-xs font-bold uppercase tracking-widest">Loading Templates...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {templates.map(template => (
            <div key={template.id || template._id} className="glass-panel border border-white/5 rounded-[24px] overflow-hidden group">
              {/* Thumbnail Area */}
              <div className="aspect-[4/3] bg-black/40 relative flex items-center justify-center overflow-hidden">
                {template.thumbnailUrl ? (
                  <img src={template.thumbnailUrl} alt={template.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <div className="text-white/20 flex flex-col items-center">
                    <Image size={48} className="mb-2" />
                    <span className="text-xs font-medium">No Thumbnail</span>
                  </div>
                )}
                <div className="absolute top-4 right-4 flex gap-2">
                  <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg backdrop-blur-md border ${
                    template.isActive 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                    : 'bg-white/10 text-white/60 border-white/10'
                  }`}>
                    {template.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              {/* Details */}
              <div className="p-5">
                <h3 className="text-lg font-bold text-white mb-1 truncate">{template.name}</h3>
                <p className="text-xs text-white/50 mb-4 font-mono">v{template.version || 1} • {template.scope || 'Platform'}</p>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => openModal(template)}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                  <button 
                    onClick={() => toggleActiveStatus(template)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                      template.isActive 
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {template.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {templates.length === 0 && !error && (
            <div className="col-span-full py-24 flex flex-col items-center text-center border border-dashed border-white/10 rounded-[32px] bg-white/5">
              <Award className="text-white/20 mb-4" size={48} />
              <h3 className="text-lg font-bold text-white mb-2">No Templates Found</h3>
              <p className="text-white/50 text-sm max-w-sm mb-6">Create your first certificate template to allow courses to issue automated certificates.</p>
              <button
                onClick={() => openModal()}
                className="bg-amber-500 text-black px-6 py-2.5 rounded-xl font-bold text-sm"
              >
                Create First Template
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
