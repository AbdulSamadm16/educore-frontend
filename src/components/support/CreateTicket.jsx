import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, UploadCloud, X, Save, AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ticketService } from '../../services/ticket.service';
import apiClient from '../../services/api';
import { useAuth } from '../../context/useAuth';
import { getTheme } from '../../utils/supportTheme';

export default function CreateTicket({ basePath }) {
  const { user } = useAuth();
  const theme = getTheme(user?.role);
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  
  const [formData, setFormData] = useState({
    subject: '',
    issueType: 'technical',
    priority: 'medium',
    courseId: '',
    description: ''
  });

  useEffect(() => {
    if (user?.role === 'learner' && formData.issueType === 'academic') {
      const fetchCourses = async () => {
        try {
          const res = await apiClient.get('/enrollments/my-courses', { params: { limit: 50 } });
          setEnrolledCourses(res.data?.data?.enrollments || []);
        } catch (err) {
          console.error('Failed to fetch courses:', err);
        }
      };
      fetchCourses();
    }
  }, [user?.role, formData.issueType]);

  const [files, setFiles] = useState([]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (files.length + selectedFiles.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }
    
    // Quick size validation
    const oversized = selectedFiles.some(f => f.size > 10 * 1024 * 1024);
    if (oversized) {
      toast.error('Each file must be under 10MB');
      return;
    }

    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const data = new FormData();
      data.append('subject', formData.subject);
      data.append('issueType', formData.issueType);
      data.append('priority', formData.priority);
      if (formData.courseId && formData.issueType === 'academic') {
        data.append('courseId', formData.courseId);
      }
      data.append('description', formData.description);
      
      files.forEach(file => {
        data.append('attachments', file);
      });

      const response = await ticketService.createTicket(data);
      toast.success('Ticket created successfully!');
      // Navigate to the detail page of the new ticket
      navigate(`${basePath}/${response.data.id || response.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create ticket');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto">
      <button 
        onClick={() => navigate(basePath)}
        className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-6 group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-black uppercase tracking-widest">Back to Support</span>
      </button>

      <div className="mb-10">
        <h2 className="text-4xl font-black text-white tracking-tighter mb-2">Create New Ticket</h2>
        <p className="text-white/40 text-sm font-medium">Describe your issue in detail and attach any relevant files.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="glass-card p-10 rounded-[40px] border border-white/5 space-y-8 bg-black/20">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">Subject / Title *</label>
              <input 
                type="text"
                required
                maxLength={150}
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                className={`w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 focus:outline-none focus:ring-2 transition-all font-medium ${theme.ringFocus}`}
                placeholder="Briefly describe the issue..."
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">Issue Category</label>
              <select 
                value={formData.issueType}
                onChange={(e) => setFormData({...formData, issueType: e.target.value})}
                className={`w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 transition-all cursor-pointer ${theme.ringFocus}`}
              >
                <option value="technical" className="bg-[#0b0f1a]">Technical Issue</option>
                {user?.role === 'learner' && (
                  <option value="academic" className="bg-[#0b0f1a]">Academic / Course</option>
                )}
                <option value="billing" className="bg-[#0b0f1a]">Billing / Payment</option>
                <option value="account" className="bg-[#0b0f1a]">Account Access</option>
                <option value="other" className="bg-[#0b0f1a]">Other</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">Priority</label>
              <select 
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className={`w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 transition-all cursor-pointer ${theme.ringFocus}`}
              >
                <option value="low" className="bg-[#0b0f1a]">Low - General inquiry</option>
                <option value="medium" className="bg-[#0b0f1a]">Medium - Needs attention</option>
                <option value="high" className="bg-[#0b0f1a]">High - Urgent issue</option>
                <option value="critical" className="bg-[#0b0f1a]">Critical - Blocker / System Down</option>
              </select>
            </div>

            {user?.role === 'learner' && formData.issueType === 'academic' && (
              <div>
                 <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">Related Course *</label>
                 <select 
                  required
                  value={formData.courseId}
                  onChange={(e) => setFormData({...formData, courseId: e.target.value})}
                  className={`w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 transition-all cursor-pointer ${theme.ringFocus}`}
                >
                  <option value="" disabled className="bg-[#0b0f1a]">Select a course</option>
                  {enrolledCourses.map(enc => (
                    <option key={enc.course?._id} value={enc.course?._id} className="bg-[#0b0f1a]">
                      {enc.course?.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">Description *</label>
              <textarea 
                required
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className={`w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white placeholder:text-white/10 h-48 focus:outline-none focus:ring-2 transition-all font-medium ${theme.ringFocus}`}
                placeholder="Provide detailed information about your issue..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">Attachments (Max 5)</label>
              
              <div className={`border-2 border-dashed border-white/10 rounded-3xl p-8 text-center hover:bg-white/5 transition-all cursor-pointer relative ${theme.borderHover}`}>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={files.length >= 5}
                />
                <div className="flex flex-col items-center pointer-events-none">
                  <UploadCloud className="text-white/20 mb-4" size={40} />
                  <p className="text-white font-bold mb-1">Click or drag files to attach</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Images and Videos only (Max 10MB)</p>
                </div>
              </div>

              {files.length > 0 && (
                <div className="mt-6 space-y-2">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-white/10 rounded-lg shrink-0">
                          <UploadCloud size={14} className="text-white" />
                        </div>
                        <span className="text-sm font-medium text-white truncate">{file.name}</span>
                        <span className="text-xs text-white/40 shrink-0">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeFile(idx)}
                        className="p-2 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-6">
          <button 
            type="button"
            onClick={() => navigate(basePath)}
            className="px-8 py-4 text-white/40 font-bold uppercase tracking-widest hover:text-white transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={saving}
            className={`px-10 py-4 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-3 cursor-pointer disabled:opacity-50 ${theme.bgSolid} ${theme.bgHover} ${theme.shadow}`}
          >
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={20} />}
            Submit Ticket
          </button>
        </div>
      </form>
    </div>
  );
}
