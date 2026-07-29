import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, Search, Plus, Filter, 
  MoreHorizontal, Building2, Globe, Users, 
  BookOpen, ExternalLink, ShieldCheck, Edit3, 
  UserCheck, Power, RefreshCw, BarChart2, Mail, 
  X, AlertTriangle, Key, Layers, Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../../services/api';

export default function PlatformInstitutions() {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null); // stores institution object being edited
  const [showAssignModal, setShowAssignModal] = useState(null); // stores institution object
  const [showStatsModal, setShowStatsModal] = useState(null); // stores institution object
  const [statsData, setStatsData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  
  // Forms state
  const [addForm, setAddForm] = useState({
    name: '',
    domain: '',
    email: '',
    description: '',
    adminName: '',
    adminEmail: '',
    code: ''
  });
  const [editForm, setEditForm] = useState({
    name: '',
    domain: '',
    email: '',
    description: '',
    code: ''
  });
  const [assignForm, setAssignForm] = useState({
    adminName: '',
    adminEmail: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/platform/institutions');
      if (response.data?.success) {
        setInstitutions(response.data.data.institutions || []);
      }
    } catch (error) {
      console.error('Error fetching institutions:', error);
      toast.error('Failed to fetch institutions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await apiClient.post('/platform/institutions', addForm);
      if (response.data?.success) {
        toast.success('Institution created successfully!');
        setShowAddModal(false);
        setAddForm({
          name: '',
          domain: '',
          email: '',
          description: '',
          adminName: '',
          adminEmail: '',
          code: ''
        });
        fetchInstitutions();
      }
    } catch (error) {
      console.error('Error creating institution:', error);
      toast.error(error.response?.data?.message || 'Failed to create institution');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await apiClient.patch(`/platform/institutions/${showEditModal._id}`, editForm);
      if (response.data?.success) {
        toast.success('Institution updated successfully!');
        setShowEditModal(null);
        fetchInstitutions();
      }
    } catch (error) {
      console.error('Error updating institution:', error);
      toast.error(error.response?.data?.message || 'Failed to update institution');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await apiClient.post(`/platform/institutions/${showAssignModal._id}/admin`, assignForm);
      if (response.data?.success) {
        toast.success('Admin assigned successfully!');
        setShowAssignModal(null);
        setAssignForm({ adminName: '', adminEmail: '' });
        fetchInstitutions();
      }
    } catch (error) {
      console.error('Error assigning admin:', error);
      toast.error(error.response?.data?.message || 'Failed to assign admin');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (inst) => {
    const nextStatus = inst.status === 'active' ? 'suspended' : 'active';
    try {
      const response = await apiClient.patch(`/platform/institutions/${inst._id}/status`, { status: nextStatus });
      if (response.data?.success) {
        toast.success(`Institution ${nextStatus === 'suspended' ? 'disabled' : 'enabled'} successfully`);
        fetchInstitutions();
        setActiveDropdown(null);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const loadStats = async (inst) => {
    setShowStatsModal(inst);
    setLoadingStats(true);
    setStatsData(null);
    setActiveDropdown(null);
    try {
      const response = await apiClient.get(`/platform/institutions/${inst._id}/stats`);
      if (response.data?.success) {
        setStatsData(response.data.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Failed to load institution stats');
    } finally {
      setLoadingStats(false);
    }
  };

  const openEditModal = (inst) => {
    setShowEditModal(inst);
    setEditForm({
      name: inst.name || '',
      domain: inst.domain || '',
      email: inst.email || '',
      description: inst.description || '',
      code: inst.code || ''
    });
    setActiveDropdown(null);
  };

  const openAssignModal = (inst) => {
    setShowAssignModal(inst);
    setAssignForm({
      adminName: '',
      adminEmail: ''
    });
    setActiveDropdown(null);
  };

  const filteredInstitutions = institutions.filter(inst => 
    inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (inst.code && inst.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen pb-20">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-amber-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, email or code..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all w-72 font-medium"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-amber-500/20"
          >
            <Plus size={16} className="stroke-[3]" />
            Add Institution
          </button>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="glass-card rounded-[32px] p-6 border border-white/5 animate-pulse h-64">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/5 rounded w-1/2" />
                  <div className="h-3 bg-white/5 rounded w-1/3" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-white/5 rounded w-full" />
                <div className="h-4 bg-white/5 rounded w-full" />
                <div className="h-4 bg-white/5 rounded w-2/3" />
              </div>
            </div>
          ))
        ) : filteredInstitutions.length > 0 ? (
          filteredInstitutions.map((inst, i) => (
            <motion.div 
              key={inst._id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`glass-card rounded-[32px] p-6 border transition-all group relative overflow-hidden flex flex-col h-full ${
                inst.status === 'suspended' 
                  ? 'border-rose-500/10 bg-rose-500/2' 
                  : 'border-white/5 hover:border-amber-500/20'
              }`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full -translate-y-16 translate-x-16 group-hover:bg-amber-500/10 transition-all" />
              
              <div className="flex items-start justify-between mb-6">
                <div className={`p-3.5 rounded-2xl border ${
                  inst.status === 'suspended'
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    : 'bg-white/5 border-white/5 text-amber-400'
                }`}>
                  <Building2 size={24} />
                </div>
                
                {/* Dropdown Menu */}
                <div className="relative">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === inst._id ? null : inst._id)}
                    className="p-2 text-white/20 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <MoreHorizontal size={20} />
                  </button>
                  
                  <AnimatePresence>
                    {activeDropdown === inst._id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          className="absolute right-0 mt-2 w-48 bg-[#0d111d] border border-white/10 rounded-2xl p-2 shadow-2xl z-20 space-y-1"
                        >
                          <button 
                            onClick={() => openEditModal(inst)}
                            className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-all font-bold"
                          >
                            <Edit3 size={14} className="text-amber-500" />
                            Edit Details
                          </button>
                          <button 
                            onClick={() => openAssignModal(inst)}
                            className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-all font-bold"
                          >
                            <UserCheck size={14} className="text-amber-500" />
                            Assign Admin
                          </button>
                          <button 
                            onClick={() => loadStats(inst)}
                            className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/5 rounded-xl transition-all font-bold"
                          >
                            <BarChart2 size={14} className="text-amber-500" />
                            View Statistics
                          </button>
                          <button 
                            onClick={() => toggleStatus(inst)}
                            className={`flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-xs rounded-xl transition-all font-bold border border-transparent ${
                              inst.status === 'suspended'
                                ? 'text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20'
                                : 'text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20'
                            }`}
                          >
                            <Power size={14} />
                            {inst.status === 'suspended' ? 'Activate Uni' : 'Suspend Uni'}
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Title & Domain */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-amber-400 transition-colors truncate max-w-[200px]">
                    {inst.name}
                  </h3>
                  {inst.code && (
                    <span className="text-[10px] font-black text-amber-500 border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 rounded-lg tracking-wider">
                      {inst.code}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-white/40 font-bold uppercase tracking-widest">
                  <Globe size={12} className="text-amber-500/50" />
                  {inst.domain}
                </div>
              </div>

              {/* Description */}
              <p className="text-white/40 text-xs font-medium line-clamp-2 mb-6">
                {inst.description || 'No description provided.'}
              </p>

              {/* Admin Card */}
              <div className="bg-white/2 border border-white/5 rounded-2xl p-4 mb-6">
                <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider mb-2">Assigned Administrator</p>
                {inst.owner ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-xs font-black text-amber-500">
                      {inst.owner.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-white truncate">{inst.owner.name}</p>
                      <p className="text-[10px] text-white/40 font-medium truncate flex items-center gap-1">
                        <Mail size={10} />
                        {inst.owner.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-white/20 text-xs font-bold py-1 flex items-center gap-1">
                    <AlertTriangle size={14} className="text-amber-500/50" />
                    No admin assigned
                  </div>
                )}
              </div>

              {/* Stats & Status Footer */}
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5 mt-auto">
                <div className="flex flex-col gap-1">
                  <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Learners</p>
                  <div className="flex items-center gap-1.5">
                    <Users size={14} className="text-amber-400" />
                    <span className="text-sm font-black text-white">{inst.metadata?.learnerCount || 0}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Courses</p>
                  <div className="flex items-center justify-end gap-1.5">
                    <BookOpen size={14} className="text-amber-400" />
                    <span className="text-sm font-black text-white">{inst.metadata?.courseCount || 0}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 mt-4">
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider uppercase border ${
                  inst.status === 'suspended'
                    ? 'text-rose-400 border-rose-500/20 bg-rose-500/5'
                    : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                }`}>
                  <ShieldCheck size={12} />
                  {inst.status === 'suspended' ? 'SUSPENDED' : 'ACTIVE'}
                </div>
                <a 
                  href={`http://${inst.domain}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="text-[10px] font-black text-white/40 hover:text-amber-500 uppercase tracking-widest flex items-center gap-1 transition-colors group/btn"
                >
                  View Website <ExternalLink size={10} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-28 text-center glass-card rounded-[48px] border border-white/5">
             <div className="p-5 rounded-3xl bg-white/5 text-white/10 inline-block mb-4 border border-white/10">
               <GraduationCap size={48} />
             </div>
             <p className="text-white/20 font-black text-xl uppercase tracking-widest mb-1">No institutions found</p>
             <p className="text-white/10 text-xs font-medium">Try refining your search keyword.</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-[#06080f]/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="glass-card w-full max-w-2xl p-8 md:p-10 rounded-[40px] border border-white/10 relative overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-white">Add New Institution</h3>
                  <p className="text-white/40 text-xs font-medium">Configure settings and set the initial administrator.</p>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/5 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Institution Details */}
                  <div className="space-y-5">
                    <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">Institution Info</h4>
                    <div>
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Institution Name</label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. EduCore Academy"
                        value={addForm.name}
                        onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Web Domain</label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. educore.edu"
                        value={addForm.domain}
                        onChange={(e) => setAddForm({ ...addForm, domain: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Institution Code (Optional)</label>
                      <input 
                        type="text"
                        placeholder="e.g. ECA"
                        value={addForm.code}
                        onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Contact Email</label>
                      <input 
                        type="email"
                        required
                        placeholder="e.g. contact@educore.edu"
                        value={addForm.email}
                        onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                      />
                    </div>
                  </div>

                  {/* Admin Details */}
                  <div className="space-y-5">
                    <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">Primary Administrator</h4>
                    <div>
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Admin Full Name</label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. Dr. John Doe"
                        value={addForm.adminName}
                        onChange={(e) => setAddForm({ ...addForm, adminName: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Admin Email</label>
                      <input 
                        type="email"
                        required
                        placeholder="e.g. j.doe@educore.edu"
                        value={addForm.adminEmail}
                        onChange={(e) => setAddForm({ ...addForm, adminEmail: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Description</label>
                      <textarea 
                        placeholder="Describe the campus or notes..."
                        value={addForm.description}
                        onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium h-[116px] resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 border-t border-white/5 pt-6 justify-end">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-3.5 text-xs font-black text-white/40 hover:text-white uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-amber-500/25 flex items-center gap-2"
                  >
                    {submitting ? 'Creating...' : 'Create Institution'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(null)}
              className="absolute inset-0 bg-[#06080f]/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="glass-card w-full max-w-md p-8 md:p-10 rounded-[40px] border border-white/10 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-white">Edit Institution</h3>
                  <p className="text-white/40 text-xs font-medium">Update domain name, description or institutional code.</p>
                </div>
                <button 
                  onClick={() => setShowEditModal(null)}
                  className="p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/5 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Institution Name</label>
                  <input 
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Web Domain</label>
                  <input 
                    type="text"
                    required
                    value={editForm.domain}
                    onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Institution Code</label>
                  <input 
                    type="text"
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Contact Email</label>
                  <input 
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Description</label>
                  <textarea 
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium h-24 resize-none"
                  />
                </div>

                <div className="flex gap-4 border-t border-white/5 pt-6 justify-end">
                  <button 
                    type="button"
                    onClick={() => setShowEditModal(null)}
                    className="px-6 py-3.5 text-xs font-black text-white/40 hover:text-white uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-amber-500/25"
                  >
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Admin Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAssignModal(null)}
              className="absolute inset-0 bg-[#06080f]/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="glass-card w-full max-w-md p-8 md:p-10 rounded-[40px] border border-white/10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 text-amber-500/5 pointer-events-none">
                <Key size={120} />
              </div>

              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-white">Assign Administrator</h3>
                  <p className="text-white/40 text-xs font-medium">Link or create an administrative owner for this institution.</p>
                </div>
                <button 
                  onClick={() => setShowAssignModal(null)}
                  className="p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/5 transition-all relative z-10"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAssignSubmit} className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Admin Full Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Prof. Robert Smith"
                    value={assignForm.adminName}
                    onChange={(e) => setAssignForm({ ...assignForm, adminName: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-2">Admin Email</label>
                  <input 
                    type="email"
                    required
                    placeholder="e.g. r.smith@educore.edu"
                    value={assignForm.adminEmail}
                    onChange={(e) => setAssignForm({ ...assignForm, adminEmail: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium"
                  />
                </div>

                <div className="flex gap-4 border-t border-white/5 pt-6 justify-end">
                  <button 
                    type="button"
                    onClick={() => setShowAssignModal(null)}
                    className="px-6 py-3.5 text-xs font-black text-white/40 hover:text-white uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-amber-500/25"
                  >
                    {submitting ? 'Assigning...' : 'Assign Admin'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stats Modal */}
      <AnimatePresence>
        {showStatsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStatsModal(null)}
              className="absolute inset-0 bg-[#06080f]/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="glass-card w-full max-w-md p-8 md:p-10 rounded-[40px] border border-white/10 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-white">Campus Statistics</h3>
                  <p className="text-white/40 text-xs font-medium">{showStatsModal.name}</p>
                </div>
                <button 
                  onClick={() => setShowStatsModal(null)}
                  className="p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/5 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {loadingStats ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-white/40">
                  <RefreshCw className="animate-spin text-amber-500" size={32} />
                  <p className="text-sm font-bold">Querying campus nodes...</p>
                </div>
              ) : statsData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Learner Count */}
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-5 flex flex-col gap-1">
                      <Users className="text-amber-400 mb-2" size={20} />
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-wider">Total Learners</span>
                      <span className="text-3xl font-black text-white">{statsData.learnerCount || 0}</span>
                    </div>

                    {/* Tutor Count */}
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-5 flex flex-col gap-1">
                      <Award className="text-amber-400 mb-2" size={20} />
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-wider">Active Tutors</span>
                      <span className="text-3xl font-black text-white">{statsData.tutorCount || 0}</span>
                    </div>

                    {/* Course Count */}
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-5 flex flex-col gap-1">
                      <BookOpen className="text-amber-400 mb-2" size={20} />
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-wider">Courses Hosted</span>
                      <span className="text-3xl font-black text-white">{statsData.courseCount || 0}</span>
                    </div>

                    {/* Active Batches */}
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-5 flex flex-col gap-1">
                      <Layers className="text-amber-400 mb-2" size={20} />
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-wider">Active Batches</span>
                      <span className="text-3xl font-black text-white">{statsData.activeBatchCount || 0}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <button 
                      onClick={() => setShowStatsModal(null)}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-white/20">
                  <AlertTriangle size={36} className="mx-auto mb-2 text-amber-500/50" />
                  <p className="font-bold">Failed to load statistics.</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
