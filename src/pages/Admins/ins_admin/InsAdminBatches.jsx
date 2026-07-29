import React, { useState, useEffect, useRef } from 'react';
import { 
  Layers, Users, Calendar, Plus, Search, Filter, 
  Trash2, Archive, Edit, X, Upload, Mail, Check, 
  ArrowRight, Shield, AlertCircle, Clock, RefreshCw, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import apiClient from '../../../services/api';

export default function InsAdminBatches() {
  const [batches, setBatches] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [showRosterModal, setShowRosterModal] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', type: '', action: null });

  // Batch Form State
  const [batchForm, setBatchForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    assignedTutorId: ''
  });

  // Enrollment form states
  const [enrollMode, setEnrollMode] = useState('individual'); // 'individual' | 'csv'
  const [studentEmail, setStudentEmail] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [enrollmentResults, setEnrollmentResults] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterData, setRosterData] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchBatches();
    fetchTutors();
  }, [filterStatus]);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/institution/batches', {
        params: {
          status: filterStatus === 'all' ? undefined : filterStatus,
          search: searchTerm || undefined,
          limit: 100
        }
      });
      if (response.data?.success) {
        setBatches(response.data.data.batches);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchTutors = async () => {
    try {
      const response = await apiClient.get('/institution/tutors/approved');
      if (response.data?.success) {
        setTutors(response.data.data.tutors);
      }
    } catch (error) {
      console.error('Error fetching tutors:', error);
    }
  };

  const handleCreateOrUpdateBatch = async (e) => {
    e.preventDefault();
    if (!batchForm.name.trim() || !batchForm.startDate || !batchForm.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (new Date(batchForm.endDate) <= new Date(batchForm.startDate)) {
      toast.error('End date must be after start date');
      return;
    }

    const payload = {
      name: batchForm.name,
      startDate: batchForm.startDate,
      endDate: batchForm.endDate,
      assignedTutorId: batchForm.assignedTutorId || ''
    };

    try {
      if (editingBatch) {
        const response = await apiClient.patch(`/institution/batches/${editingBatch._id || editingBatch.id}`, payload);
        if (response.data?.success) {
          toast.success('Batch updated successfully');
          setEditingBatch(null);
          setShowCreateModal(false);
          fetchBatches();
        }
      } else {
        const response = await apiClient.post('/institution/batches', payload);
        if (response.data?.success) {
          toast.success('Batch created successfully');
          setShowCreateModal(false);
          fetchBatches();
        }
      }
    } catch (error) {
      console.error('Error saving batch:', error);
      toast.error(error.response?.data?.message || 'Failed to save batch');
    }
  };

  const openEditModal = (batch) => {
    setEditingBatch(batch);
    setBatchForm({
      name: batch.name || '',
      startDate: batch.startDate ? batch.startDate.split('T')[0] : '',
      endDate: batch.endDate ? batch.endDate.split('T')[0] : '',
      assignedTutorId: batch.assignedTutorId?._id || batch.assignedTutorId || ''
    });
    setShowCreateModal(true);
  };

  const openCreateModal = () => {
    setEditingBatch(null);
    setBatchForm({
      name: '',
      startDate: '',
      endDate: '',
      assignedTutorId: ''
    });
    setShowCreateModal(true);
  };

  const confirmArchiveBatch = async (batchId) => {
    const archiveToast = toast.loading('Archiving batch...');
    try {
      const response = await apiClient.patch(`/institution/batches/${batchId}/archive`);
      if (response.data?.success) {
        toast.success('Batch archived successfully', { id: archiveToast });
        fetchBatches();
      }
    } catch (error) {
      console.error('Error archiving batch:', error);
      toast.error('Failed to archive batch', { id: archiveToast });
    }
  };

  const handleArchiveBatch = (batchId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Archive Batch',
      message: 'Are you sure you want to archive this batch? It will mark the status as archived.',
      type: 'warning',
      action: () => confirmArchiveBatch(batchId)
    });
  };

  const confirmDeleteBatch = async (batchId) => {
    const deleteToast = toast.loading('Deleting batch...');
    try {
      const response = await apiClient.delete(`/institution/batches/${batchId}`);
      if (response.data?.success) {
        toast.success('Batch deleted successfully', { id: deleteToast });
        fetchBatches();
      }
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast.error(error.response?.data?.message || 'Failed to delete batch', { id: deleteToast });
    }
  };

  const handleDeleteBatch = (batchId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Batch',
      message: 'Are you sure you want to delete this batch? This action is permanent (soft-delete) and will remove it from view.',
      type: 'danger',
      action: () => confirmDeleteBatch(batchId)
    });
  };

  const fetchRoster = async (batchId) => {
    setRosterLoading(true);
    try {
      const response = await apiClient.get(`/institution/batches/${batchId}`);
      if (response.data?.success) {
        setRosterData(response.data.data.batch);
      }
    } catch (error) {
      console.error('Error fetching roster:', error);
      toast.error('Failed to load student roster');
    } finally {
      setRosterLoading(false);
    }
  };

  const openRosterModal = (batch) => {
    setShowRosterModal(batch);
    setUploadResult(null);
    setCsvFile(null);
    setStudentEmail('');
    setEnrollMode('individual');
    fetchRoster(batch._id || batch.id);
  };

  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    if (!studentEmail.trim()) {
      toast.error('Please provide student email');
      return;
    }

    const payload = {
      emails: [studentEmail.trim()]
    };

    const enrollToast = toast.loading('Adding student to batch...');
    try {
      const response = await apiClient.post(`/institution/batches/${showRosterModal._id || showRosterModal.id}/students`, payload);
      if (response.data?.success) {
        const added = response.data.data.added || [];
        const failed = response.data.data.failed || [];

        if (failed.length > 0) {
          toast.error(`Completed with errors. Added: ${added.length}, Failed: ${failed.length}`, { id: enrollToast });
          setEnrollmentResults({ added, failed });
        } else {
          toast.success(`Successfully added ${added.length} student(s)!`, { id: enrollToast });
        }

        setStudentEmail('');
        fetchRoster(showRosterModal._id || showRosterModal.id);
        fetchBatches(); // update student count in lists
      }
    } catch (error) {
      console.error('Error enrolling student:', error);
      toast.error(error.response?.data?.message || 'Failed to add student', { id: enrollToast });
    }
  };

  const handleUploadCSV = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      toast.error('Please select a CSV file first');
      return;
    }

    const formData = new FormData();
    formData.append('csv', csvFile);

    const uploadToast = toast.loading('Uploading and processing CSV...');
    try {
      const response = await apiClient.post(
        `/institution/batches/${showRosterModal._id || showRosterModal.id}/students`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      if (response.data?.success) {
        const added = response.data.data.added || [];
        const failed = response.data.data.failed || [];

        if (failed.length > 0) {
          toast.error(`Completed with errors. Added: ${added.length}, Failed: ${failed.length}`, { id: uploadToast });
          setEnrollmentResults({ added, failed });
        } else {
          toast.success('CSV processed successfully!', { id: uploadToast });
        }

        setUploadResult(response.data.data);
        setCsvFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        fetchRoster(showRosterModal._id || showRosterModal.id);
        fetchBatches();
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      toast.error(error.response?.data?.message || 'CSV upload failed', { id: uploadToast });
    }
  };

  const confirmRemoveStudent = async (studentUserId) => {
    const removeToast = toast.loading('Removing student...');
    try {
      const response = await apiClient.delete(
        `/institution/batches/${showRosterModal._id || showRosterModal.id}/students/${studentUserId}`
      );
      if (response.data?.success) {
        toast.success('Student removed successfully', { id: removeToast });
        fetchRoster(showRosterModal._id || showRosterModal.id);
        fetchBatches();
      }
    } catch (error) {
      console.error('Error removing student:', error);
      toast.error('Failed to remove student', { id: removeToast });
    }
  };

  const handleRemoveStudent = (studentUserId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Student',
      message: 'Are you sure you want to remove this student from the batch?',
      type: 'danger',
      action: () => confirmRemoveStudent(studentUserId)
    });
  };

  const formatSimpleDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">Batch Management</h2>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Organize student rosters by class or group</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md shadow-emerald-600/10 self-start sm:self-auto shrink-0"
        >
          <Plus size={16} /> Create Batch
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-white/2 border border-white/5 rounded-2xl">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
          <input
            type="text"
            placeholder="Search batches by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchBatches()}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 font-medium"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 w-full md:w-auto">
            {['all', 'active', 'completed', 'archived'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                  filterStatus === status 
                    ? 'bg-emerald-600 text-white' 
                    : 'text-white/40 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <button
            onClick={fetchBatches}
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-xl transition-all cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Batches Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 rounded-[32px] border border-white/5 bg-white/2 space-y-4 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-4 w-32 bg-white/10 rounded" />
                <div className="h-4 w-12 bg-white/10 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-48 bg-white/10 rounded" />
                <div className="h-3 w-40 bg-white/10 rounded" />
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="h-8 w-24 bg-white/10 rounded-lg" />
                <div className="h-8 w-16 bg-white/10 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : batches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch) => {
            const isArchived = batch.status === 'archived';
            return (
              <div 
                key={batch._id || batch.id} 
                className={`glass-card p-6 rounded-[32px] border transition-all flex flex-col justify-between group ${
                  isArchived 
                    ? 'border-white/2 opacity-70 hover:opacity-100 bg-white/[0.01]' 
                    : 'border-white/5 hover:border-emerald-500/20 bg-white/2'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors truncate max-w-[70%]">
                      {batch.name}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                      batch.status === 'active' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : batch.status === 'completed'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-white/10 text-white/30 border border-white/5'
                    }`}>
                      {batch.status}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs text-white/40 mb-6 font-medium">
                    <p className="flex items-center gap-2">
                      <Calendar size={14} className="text-emerald-500" />
                      <span>{formatSimpleDate(batch.startDate)} – {formatSimpleDate(batch.endDate)}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Users size={14} className="text-emerald-500" />
                      <span className="text-white/60 font-semibold">{batch.studentCount || batch.students?.length || 0} Learners</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Shield size={14} className="text-emerald-500" />
                      <span>Tutor: <span className="text-white/60 font-semibold">{batch.assignedTutorId?.name || 'No Tutor Assigned'}</span></span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <button
                    onClick={() => openRosterModal(batch)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                  >
                    <Users size={12} /> Roster
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(batch)}
                      className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-all cursor-pointer"
                      title="Edit Batch"
                    >
                      <Edit size={14} />
                    </button>
                    {!isArchived && (
                      <button
                        onClick={() => handleArchiveBatch(batch._id || batch.id)}
                        className="p-2 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/10 transition-all cursor-pointer"
                        title="Archive Batch"
                      >
                        <Archive size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteBatch(batch._id || batch.id)}
                      className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/10 transition-all cursor-pointer"
                      title="Delete Batch"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-24 text-center border border-white/5 border-dashed rounded-[32px] flex flex-col items-center justify-center">
          <Layers size={48} className="text-white/10 mb-4" />
          <h4 className="text-base font-bold text-white mb-2">No student batches found</h4>
          <p className="text-xs text-white/30 mb-6">Create a batch to organize learners and assign instructors.</p>
          <button
            onClick={openCreateModal}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
          >
            Create Your First Batch
          </button>
        </div>
      )}

      {/* Create / Edit Batch Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f172a] border border-white/10 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl text-white flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-emerald-400">
                    {editingBatch ? 'Edit Student Batch' : 'Create Student Batch'}
                  </h3>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Configure batch parameters</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateOrUpdateBatch} className="p-6 space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Batch Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS-2026-A"
                    value={batchForm.name}
                    onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={batchForm.startDate}
                      onChange={(e) => setBatchForm({ ...batchForm, startDate: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30 color-scheme-dark"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">End Date *</label>
                    <input
                      type="date"
                      required
                      value={batchForm.endDate}
                      onChange={(e) => setBatchForm({ ...batchForm, endDate: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30 color-scheme-dark"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Assigned Tutor</label>
                  {tutors.length === 0 ? (
                    <div className="p-4 border border-amber-500/20 bg-amber-500/5 rounded-xl text-amber-400 text-xs font-semibold leading-relaxed flex items-start gap-2">
                      <span className="shrink-0 text-lg">⚠️</span>
                      <div>
                        <p className="font-bold uppercase tracking-wider text-[10px] mb-1">No Active Tutors Found</p>
                        <p className="text-white/60 font-medium">There are no approved tutors linked to your institution. Please add or link tutors in the Users tab first.</p>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={batchForm.assignedTutorId}
                      onChange={(e) => setBatchForm({ ...batchForm, assignedTutorId: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                    >
                      <option value="" className="bg-[#0f172a] text-white/60">No Tutor Assigned</option>
                      {tutors.map((tutor) => (
                        <option key={tutor.id || tutor._id} value={tutor.id || tutor._id} className="bg-[#0f172a] text-white">
                          {tutor.name} ({tutor.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-600/25"
                  >
                    {editingBatch ? 'Save Changes' : 'Create Batch'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Roster & Add Student Modal */}
      <AnimatePresence>
        {showRosterModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#0f172a] border border-white/10 w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl text-white flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-emerald-400">
                    Roster: {showRosterModal.name}
                  </h3>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                    Manage students in batch ({rosterData?.students?.length || 0} enrolled)
                  </p>
                </div>
                <button
                  onClick={() => setShowRosterModal(null)}
                  className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Student Roster List */}
                  <div className="lg:col-span-7 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-white/30">Active Student List</h4>

                    {rosterLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-14 bg-white/2 border border-white/5 rounded-xl animate-pulse" />
                        ))}
                      </div>
                    ) : rosterData?.students?.length > 0 ? (
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                        {rosterData.students.map((student) => {
                          const userObj = student.userId || {};
                          return (
                            <div 
                              key={userObj._id || userObj.id || student._id} 
                              className="flex items-center justify-between p-4 bg-white/2 border border-white/5 rounded-2xl group hover:border-emerald-500/10 transition-all"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white leading-none mb-1">
                                  {userObj.name || 'Unknown student'}
                                </p>
                                <p className="text-[9px] text-white/30 font-semibold truncate leading-none">
                                  {userObj.email || 'N/A'}
                                </p>
                              </div>
                              <button
                                onClick={() => handleRemoveStudent(userObj._id || userObj.id)}
                                className="p-2 text-white/20 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/10 rounded-xl transition-all cursor-pointer"
                                title="Remove Student"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-12 text-center border border-white/5 border-dashed rounded-2xl">
                        <Users size={32} className="text-white/10 mb-2 mx-auto" />
                        <p className="text-xs font-bold text-white/20 uppercase tracking-widest">No students enrolled</p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Add Student Interface */}
                  <div className="lg:col-span-5 glass-card p-6 border border-white/5 rounded-3xl space-y-6">
                    <div className="flex border border-white/15 rounded-xl p-1 bg-white/[0.01]">
                      <button
                        onClick={() => setEnrollMode('individual')}
                        className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                          enrollMode === 'individual' ? 'bg-emerald-600 text-white' : 'text-white/40 hover:text-white'
                        }`}
                      >
                        Enroll One
                      </button>
                      <button
                        onClick={() => setEnrollMode('csv')}
                        className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                          enrollMode === 'csv' ? 'bg-emerald-600 text-white' : 'text-white/40 hover:text-white'
                        }`}
                      >
                        CSV Upload
                      </button>
                    </div>

                    {enrollMode === 'individual' ? (
                      <form onSubmit={handleEnrollStudent} className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400">Enroll Individual Student</h4>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest block mb-2">Student Email</label>
                            <div className="relative">
                              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                              <input
                                type="email"
                                placeholder="student@example.com"
                                value={studentEmail}
                                onChange={(e) => setStudentEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full flex items-center justify-center gap-1.5 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer mt-4"
                        >
                          Add Student <ArrowRight size={13} />
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleUploadCSV} className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400">Enroll via CSV</h4>
                          <a 
                            href="data:text/csv;charset=utf-8,email%0Astudent1@example.com%0Astudent2@example.com"
                            download="educore_batch_template.csv"
                            className="text-[8px] font-black text-white/40 uppercase tracking-widest hover:text-emerald-400 flex items-center gap-1 transition-colors"
                          >
                            <Download size={10} /> Template
                          </a>
                        </div>
                        
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="py-10 border border-white/10 hover:border-emerald-500/30 border-dashed rounded-2xl text-center cursor-pointer hover:bg-white/[0.01] transition-all flex flex-col items-center justify-center"
                        >
                          <input
                            type="file"
                            ref={fileInputRef}
                            accept=".csv"
                            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                            className="hidden"
                          />
                          <Upload size={24} className="text-white/10 mb-3" />
                          {csvFile ? (
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-white max-w-[180px] truncate">{csvFile.name}</p>
                              <p className="text-[9px] text-white/30 font-semibold">{(csvFile.size / 1024).toFixed(1)} KB</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-white/55">Click to choose CSV</p>
                              <p className="text-[9px] text-white/30 font-semibold uppercase tracking-widest">Max file size: 5MB</p>
                            </div>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={!csvFile}
                          className="w-full flex items-center justify-center gap-1.5 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
                        >
                          Process File <ArrowRight size={13} />
                        </button>
                      </form>
                    )}

                    {/* CSV Upload results display */}
                    {uploadResult && (
                      <div className="p-4 border border-white/5 rounded-2xl bg-white/[0.01] space-y-3 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                          <span className="text-emerald-400">Added: {uploadResult.added?.length || 0}</span>
                          <span className="text-red-400">Failed: {uploadResult.failed?.length || 0}</span>
                        </div>
                        {uploadResult.failed?.length > 0 && (
                          <div className="max-h-[120px] overflow-y-auto border-t border-white/5 pt-2.5 space-y-1.5 custom-scrollbar text-[9px]">
                            {uploadResult.failed.map((fail, index) => (
                              <p key={index} className="text-red-400/80 font-medium truncate" title={fail.reason}>
                                • {fail.identifier}: {fail.reason}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-white/5 bg-white/[0.01] flex justify-end">
                <button
                  onClick={() => setShowRosterModal(null)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-600/25"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enrollment Results Grid Modal */}
      <AnimatePresence>
        {enrollmentResults && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[170] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f172a] border border-white/10 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl text-white flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-emerald-400">
                    Enrollment Results
                  </h3>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                    Summary of added and failed students
                  </p>
                </div>
                <button
                  onClick={() => setEnrollmentResults(null)}
                  className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-center">
                    <p className="text-2xl font-black text-emerald-400">{enrollmentResults.added?.length || 0}</p>
                    <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-wider mt-1">Successfully Added</p>
                  </div>
                  <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl text-center">
                    <p className="text-2xl font-black text-red-400">{enrollmentResults.failed?.length || 0}</p>
                    <p className="text-[10px] text-red-400/80 font-bold uppercase tracking-wider mt-1">Failed to Add</p>
                  </div>
                </div>

                <div className="border border-white/5 rounded-2xl overflow-hidden bg-white/[0.01]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/2 text-[9px] font-black uppercase tracking-widest text-white/40">
                        <th className="p-3.5 pl-5">Identifier</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 pr-5">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {enrollmentResults.added?.map((student, idx) => (
                        <tr key={`added-${idx}`} className="hover:bg-white/1">
                          <td className="p-3.5 pl-5 font-semibold text-white">
                            {student.name} <span className="text-white/30 font-medium">({student.email})</span>
                          </td>
                          <td className="p-3.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                              <Check size={10} className="shrink-0" /> Added
                            </span>
                          </td>
                          <td className="p-3.5 pr-5 text-white/40">—</td>
                        </tr>
                      ))}
                      {enrollmentResults.failed?.map((fail, idx) => (
                        <tr key={`failed-${idx}`} className="hover:bg-white/1">
                          <td className="p-3.5 pl-5 font-semibold text-white/80">{fail.identifier}</td>
                          <td className="p-3.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-red-400">
                              <X size={10} className="shrink-0" /> Failed
                            </span>
                          </td>
                          <td className="p-3.5 pr-5 text-red-400/80 font-medium">{fail.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-6 border-t border-white/5 bg-white/[0.01] flex justify-end shrink-0">
                <button
                  onClick={() => setEnrollmentResults(null)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-600/25"
                >
                  Acknowledge and Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Shared Confirmation Modal */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-[340px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 pb-5 text-center flex flex-col items-center">
                <div className={`p-3 rounded-full mb-4 ${confirmDialog.type === 'danger' ? 'bg-red-50 dark:bg-red-500/10 text-red-500' : 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-500'}`}>
                  {confirmDialog.type === 'danger' ? <Trash2 size={24} strokeWidth={2.5} /> : <Archive size={24} strokeWidth={2.5} />}
                </div>
                <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-widest mb-2">{confirmDialog.title}</h3>
                <p className="text-xs font-medium text-slate-500 dark:text-white/60 leading-relaxed max-w-[260px]">
                  {confirmDialog.message}
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-white/5 flex gap-3">
                <button
                  onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (confirmDialog.action) confirmDialog.action();
                    setConfirmDialog({ ...confirmDialog, isOpen: false });
                  }}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
                    confirmDialog.type === 'danger' 
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20 border border-transparent' 
                      : 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-md shadow-yellow-500/20 border border-transparent'
                  }`}
                >
                  Yes, {confirmDialog.title.split(' ')[0]}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
