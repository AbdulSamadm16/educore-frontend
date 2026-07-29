import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Award, Loader2, CheckCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../../services/api';

export default function CertificateTemplateEditor({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialFetchLoading, setInitialFetchLoading] = useState(!!id);
  const [error, setError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    thumbnailUrl: '',
    isActive: true,
    content: {
      title: 'CERTIFICATE OF COMPLETION',
      presentationText: 'This is proudly presented to [learner_name]',
      courseMessage: 'for successfully completing the course [course_name]',
      tutorMessage: 'instructed by [tutor_name]',
      primaryColor: '#1e3a8a',
      secondaryColor: '#d4af37'
    }
  });

  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTemplate();
    }
  }, [id]);

  const fetchTemplate = async () => {
    try {
      setInitialFetchLoading(true);
      // Since there's no get-by-id endpoint, we fetch all and filter
      const endpoint = mode === 'platform' ? '/platform-admin/certificate-templates' : '/institution-admin/certificate-templates';
      const res = await apiClient.get(endpoint);
      const templates = res.data?.data || [];
      const template = templates.find(t => (t.id || t._id) === id);
      
      if (template) {
        setFormData({
          name: template.name || '',
          thumbnailUrl: template.thumbnailUrl || '',
          isActive: template.isActive !== undefined ? template.isActive : true,
          content: {
            title: template.content?.title || '',
            presentationText: template.content?.presentationText || '',
            courseMessage: template.content?.courseMessage || '',
            tutorMessage: template.content?.tutorMessage || '',
            primaryColor: template.content?.primaryColor || '#1e3a8a',
            secondaryColor: template.content?.secondaryColor || '#d4af37'
          }
        });
      } else {
        setError('Template not found.');
        toast.error('Template not found.');
      }
    } catch (err) {
      console.error('Error fetching template:', err);
      setError('Failed to load template.');
      toast.error('Failed to load template.');
    } finally {
      setInitialFetchLoading(false);
    }
  };

  const handlePreview = async () => {
    let previewWindow = null;
    try {
      previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write('<div style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: white;">Generating PDF Preview...</div>');
      }

      setPreviewLoading(true);
      const endpoint = mode === 'platform' ? '/platform-admin/certificate-templates/preview' : '/institution-admin/certificate-templates/preview';
      const res = await apiClient.post(
        endpoint,
        { content: formData.content },
        { responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      if (previewWindow) {
        previewWindow.location.href = url;
      } else {
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('Preview error:', err);
      toast.error('Failed to generate preview.');
      if (previewWindow) {
        previewWindow.close();
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleContentChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        [name]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const endpoint = mode === 'platform' ? '/platform-admin/certificate-templates' : '/institution-admin/certificate-templates';
      if (id) {
        await apiClient.patch(`${endpoint}/${id}`, formData);
        toast.success('Template updated successfully');
      } else {
        await apiClient.post(endpoint, formData);
        toast.success('Template created successfully');
      }
      navigate(-1);
    } catch (err) {
      console.error('Submit error:', err);
      if (err.response?.data?.code === 'ACTIVE_LIMIT_EXCEEDED') {
        toast.error(`You have reached the limit of 4 active templates. Please deactivate one of your other templates in the templates list before activating this one.`, { duration: 6000 });
      } else {
        toast.error(err.response?.data?.message || 'Failed to save template. API may be missing.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialFetchLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-white/40">
        <Loader2 className="animate-spin mb-4 text-amber-500" size={32} />
        <span className="text-xs font-bold uppercase tracking-widest">Loading Template...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-24 text-red-500">
        <p>{error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-white/10 rounded-xl text-white">Go Back</button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/70"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {id ? 'Edit Certificate Template' : 'Create Certificate Template'}
          </h2>
          <p className="text-white/60 text-sm mt-1">
            {mode === 'platform' ? 'Platform-wide template' : 'Institution-wide template'}
          </p>
        </div>
      </div>

      <div className="w-full bg-[#0f172a] border border-white/10 rounded-[32px] shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/20">
          <h2 className="text-xl font-bold text-white">
            Template Settings
          </h2>
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewLoading}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {previewLoading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            Preview PDF
          </button>
        </div>

        <div className="flex-1 p-6">
          <form id="templateForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-2">Template Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500/50" 
                  placeholder="e.g. Modern Dark Theme" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-2">Thumbnail URL</label>
                <input 
                  type="url" 
                  value={formData.thumbnailUrl}
                  onChange={(e) => setFormData(prev => ({...prev, thumbnailUrl: e.target.value}))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500/50" 
                  placeholder="https://..." 
                />
              </div>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({...prev, isActive: e.target.checked}))}
                  className="w-5 h-5 rounded border-white/20 bg-black/50 text-amber-500 focus:ring-amber-500 focus:ring-offset-gray-900" 
                />
                <span className="text-sm font-semibold text-white">Set as Active</span>
              </label>
              <p className="text-xs text-white/40 mt-1 ml-8">Active templates can be selected by tutors. Max 4 active templates allowed.</p>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Template Content</h3>
              
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Certificate Title</label>
                <input 
                  type="text" 
                  name="title"
                  value={formData.content.title}
                  onChange={handleContentChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Presentation Text</label>
                <input 
                  type="text" 
                  name="presentationText"
                  value={formData.content.presentationText}
                  onChange={handleContentChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Course Message</label>
                <input 
                  type="text" 
                  name="courseMessage"
                  value={formData.content.courseMessage}
                  onChange={handleContentChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">Tutor Message</label>
                <input 
                  type="text" 
                  name="tutorMessage"
                  value={formData.content.tutorMessage}
                  onChange={handleContentChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">Primary Color</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      name="primaryColor"
                      value={formData.content.primaryColor}
                      onChange={handleContentChange}
                      className="w-10 h-10 rounded border-0 bg-transparent cursor-pointer" 
                    />
                    <input 
                      type="text" 
                      name="primaryColor"
                      value={formData.content.primaryColor}
                      onChange={handleContentChange}
                      className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">Secondary Color</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      name="secondaryColor"
                      value={formData.content.secondaryColor}
                      onChange={handleContentChange}
                      className="w-10 h-10 rounded border-0 bg-transparent cursor-pointer" 
                    />
                    <input 
                      type="text" 
                      name="secondaryColor"
                      value={formData.content.secondaryColor}
                      onChange={handleContentChange}
                      className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-[11px] text-white/40 mb-2">Supported Placeholders:</p>
              <div className="flex flex-wrap gap-2">
                {['[learner_name]', '[course_name]', '[completion_date]', '[tutor_name]', '[institution_name]', '[certificate_id]'].map(tag => (
                  <span key={tag} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-mono text-white/70">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => navigate(-1)}
                className="px-6 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-colors font-bold text-sm"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {id ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
