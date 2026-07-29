import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, Plus, Search, Trash2, Calendar, 
  BookOpen, Layers, Shield, X, Clock, RefreshCw, 
  AlertCircle, CheckSquare, Square, Info, Check, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import apiClient from '../../../services/api';

export default function InsAdminTutorAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'historical'
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  
  // Form states
  const [selectedTutorId, setSelectedTutorId] = useState('');
  const [assignmentType, setAssignmentType] = useState('course'); // 'course' | 'batch'
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const [batchSearch, setBatchSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAssignments(),
        fetchTutors(),
        fetchBatches(),
        fetchCourses()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load page data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await apiClient.get('/institution/tutor-assignments');
      if (response.data?.success) {
        setAssignments(response.data.data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching tutor assignments:', error);
    }
  };

  const fetchTutors = async () => {
    try {
      const response = await apiClient.get('/institution/tutors/approved');
      if (response.data?.success) {
        setTutors(response.data.data.tutors || []);
      }
    } catch (error) {
      console.error('Error fetching tutors:', error);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await apiClient.get('/institution/batches', {
        params: { limit: 100 }
      });
      if (response.data?.success) {
        setBatches(response.data.data.batches || []);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await apiClient.get('/courses/admin/all', {
        params: { limit: 100 }
      });
      if (response.data?.success) {
        setCourses(response.data.data.courses || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const openCreateModal = () => {
    setSelectedTutorId('');
    setAssignmentType('course');
    setSelectedCourseIds([]);
    setSelectedBatchId('');
    setCourseSearch('');
    setBatchSearch('');
    setShowCreateModal(true);
  };

  const toggleCourseSelect = (courseId) => {
    setSelectedCourseIds(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId) 
        : [...prev, courseId]
    );
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!selectedTutorId) {
      toast.error('Please select a tutor');
      return;
    }

    const payload = {
      tutorId: selectedTutorId
    };

    if (assignmentType === 'course') {
      if (selectedCourseIds.length === 0) {
        toast.error('Please select at least one course');
        return;
      }
      payload.courseIds = selectedCourseIds;
    } else {
      if (!selectedBatchId) {
        toast.error('Please select a batch');
        return;
      }
      payload.batchIds = [selectedBatchId];
    }

    setSubmitting(true);
    const assignToast = toast.loading('Creating tutor assignment...');
    try {
      const response = await apiClient.post('/institution/tutor-assignments', payload);
      if (response.data?.success) {
        toast.success('Tutor assigned successfully!', { id: assignToast });
        setShowCreateModal(false);
        fetchAssignments();
        fetchBatches(); // Refetch batches to show updated tutor
        fetchCourses(); // Refetch courses to show updated tutor
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to assign tutor', { id: assignToast });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    setConfirmRemoveId(assignmentId);
  };

  const confirmRemoveAssignment = async () => {
    if (!confirmRemoveId) return;
    const assignmentId = confirmRemoveId;
    setConfirmRemoveId(null);
    const removeToast = toast.loading('Removing tutor assignment...');
    try {
      const response = await apiClient.delete(`/institution/tutor-assignments/${assignmentId}`);
      if (response.data?.success) {
        toast.success('Assignment removed successfully', { id: removeToast });
        fetchAssignments();
        fetchBatches();
        fetchCourses();
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to remove assignment', { id: removeToast });
    }
  };

  const formatSimpleDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Filter assignments based on search term and current status tab
  const filteredAssignments = assignments.filter(assignment => {
    const statusMatches = activeTab === 'active' 
      ? assignment.status === 'active' 
      : assignment.status === 'removed';

    if (!statusMatches) return false;

    const tutorName = assignment.tutorId?.name || '';
    const tutorEmail = assignment.tutorId?.email || '';
    const courseTitle = assignment.courseId?.title || '';
    const batchName = assignment.batchId?.name || '';

    const searchStr = `${tutorName} ${tutorEmail} ${courseTitle} ${batchName}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  // Filter lists inside creation modal
  const filteredCoursesForModal = courses.filter(c => 
    c.title.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const filteredBatchesForModal = batches.filter(b => 
    b.status !== 'archived' && 
    b.name.toLowerCase().includes(batchSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">Tutor Assignments</h2>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Assign approved instructors to courses and student batches</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md shadow-emerald-600/10 self-start sm:self-auto shrink-0"
        >
          <Plus size={16} /> Assign Tutor
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-white/2 border border-white/5 rounded-2xl">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
          <input
            type="text"
            placeholder="Search by tutor, course, or batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 font-medium"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                activeTab === 'active' 
                  ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                  : 'text-white/40 hover:text-white'
              }`}
            >
              Active Duties
            </button>
            <button
              onClick={() => setActiveTab('historical')}
              className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                activeTab === 'historical' 
                  ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                  : 'text-white/40 hover:text-white'
              }`}
            >
              Historical Archive
            </button>
          </div>
          <button
            onClick={fetchData}
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-xl transition-all cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
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
              <div className="h-8 w-full bg-white/10 rounded-xl pt-2" />
            </div>
          ))}
        </div>
      ) : filteredAssignments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssignments.map((assignment) => {
            const isCourse = assignment.assignmentType === 'course';
            const targetName = isCourse 
              ? assignment.courseId?.title || 'Unknown Course' 
              : assignment.batchId?.name || 'Unknown Batch';
            const targetId = isCourse 
              ? assignment.courseId?._id 
              : assignment.batchId?._id;
            
            return (
              <div 
                key={assignment._id || assignment.id}
                className={`glass-card p-6 rounded-[32px] border transition-all flex flex-col justify-between group bg-white/2 ${
                  activeTab === 'historical'
                    ? 'border-white/2 opacity-70 hover:opacity-100 bg-white/[0.01]'
                    : 'border-white/5 hover:border-emerald-500/20'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl border ${
                        isCourse 
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/25' 
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                      }`}>
                        {isCourse ? <BookOpen size={16} /> : <Layers size={16} />}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-white/30">
                        {isCourse ? 'Course Duty' : 'Batch Lead'}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                      assignment.status === 'active' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-white/10 text-white/30 border border-white/5'
                    }`}>
                      {assignment.status}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-white/30 uppercase tracking-wider leading-none mb-1.5">Assigned Target</h4>
                      <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                        {targetName}
                      </p>
                    </div>

                    <div className="p-3.5 bg-white/3 border border-white/5 rounded-2xl space-y-2">
                      <h4 className="text-[9px] font-black text-white/30 uppercase tracking-widest leading-none">Tutor Profile</h4>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">
                          {assignment.tutorId?.name?.charAt(0) || 'T'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white leading-tight truncate">{assignment.tutorId?.name || 'Deleted Tutor'}</p>
                          <p className="text-[9px] text-white/30 font-semibold truncate leading-none mt-0.5">{assignment.tutorId?.email || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-semibold text-white/40">
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-emerald-500/60" />
                      Assigned: {formatSimpleDate(assignment.createdAt)}
                    </span>
                    {activeTab === 'historical' && assignment.removedAt && (
                      <span className="text-red-400/70">
                        Removed: {formatSimpleDate(assignment.removedAt)}
                      </span>
                    )}
                  </div>

                  {activeTab === 'active' && (
                    <button
                      onClick={() => handleRemoveAssignment(assignment._id || assignment.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500 border border-red-500/20 text-red-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ml-auto"
                      title="De-assign Tutor"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-24 text-center border border-white/5 border-dashed rounded-[32px] flex flex-col items-center justify-center">
          <GraduationCap size={48} className="text-white/10 mb-4 animate-bounce" />
          <h4 className="text-base font-bold text-white mb-2">No tutor assignments found</h4>
          <p className="text-xs text-white/30 mb-6 max-w-sm leading-relaxed">
            {activeTab === 'active' 
              ? 'Tutors must be explicitly assigned to manage course materials and student batches internally.' 
              : 'The historical archive records all de-assigned or revoked teaching structures.'}
          </p>
          {activeTab === 'active' && (
            <button
              onClick={openCreateModal}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              Assign Your First Tutor
            </button>
          )}
        </div>
      )}

      {/* Assign Tutor Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f172a] border border-white/10 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl text-white flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01] shrink-0">
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-emerald-400">
                    Create Tutor Assignment
                  </h3>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Deploy instructors to specific courses or learner cohorts</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateAssignment} className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                
                {/* 1. Tutor Selector */}
                <div>
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Select Approved Tutor *</label>
                  {tutors.length === 0 ? (
                    <div className="p-4 border border-amber-500/25 bg-amber-500/10 rounded-2xl text-amber-400 text-xs font-semibold leading-relaxed flex items-start gap-2.5">
                      <AlertCircle size={18} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold uppercase tracking-wider text-[10px] mb-1">No Active Tutors Found</p>
                        <p className="text-white/60 font-medium">There are no approved tutors linked to your institution. Please add or link tutors in the Users tab first.</p>
                      </div>
                    </div>
                  ) : (
                    <select
                      required
                      value={selectedTutorId}
                      onChange={(e) => setSelectedTutorId(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                    >
                      <option value="" className="bg-[#0f172a] text-white/60">Choose from approved tutors...</option>
                      {tutors.map((tutor) => (
                        <option key={tutor.id || tutor._id} value={tutor.id || tutor._id} className="bg-[#0f172a] text-white">
                          {tutor.name} ({tutor.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 2. Assignment Type */}
                <div>
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-2">Assignment Type *</label>
                  <div className="flex border border-white/15 rounded-xl p-1 bg-white/[0.01]">
                    <button
                      type="button"
                      onClick={() => {
                        setAssignmentType('course');
                        setSelectedBatchId('');
                      }}
                      className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                        assignmentType === 'course' ? 'bg-emerald-600 text-white shadow-md' : 'text-white/40 hover:text-white'
                      }`}
                    >
                      Assign to Courses
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAssignmentType('batch');
                        setSelectedCourseIds([]);
                      }}
                      className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                        assignmentType === 'batch' ? 'bg-emerald-600 text-white shadow-md' : 'text-white/40 hover:text-white'
                      }`}
                    >
                      Assign to student Batch
                    </button>
                  </div>
                </div>

                {/* 3. Target Selection Lists */}
                {assignmentType === 'course' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">Select Courses (Check one or more) *</label>
                      <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">{selectedCourseIds.length} Selected</span>
                    </div>
                    
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                      <input
                        type="text"
                        placeholder="Search courses..."
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        className="w-full bg-white/3 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none"
                      />
                    </div>

                    {filteredCoursesForModal.length > 0 ? (
                      <div className="max-h-[200px] overflow-y-auto border border-white/5 rounded-2xl bg-white/[0.01] p-2 space-y-1.5 custom-scrollbar">
                        {filteredCoursesForModal.map((course) => {
                          const isSelected = selectedCourseIds.includes(course._id || course.id);
                          return (
                            <div
                              key={course._id || course.id}
                              onClick={() => toggleCourseSelect(course._id || course.id)}
                              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                                isSelected 
                                  ? 'bg-emerald-500/10 border-emerald-500/35 text-white' 
                                  : 'bg-transparent border-transparent text-white/60 hover:text-white hover:bg-white/2'
                              }`}
                            >
                              <div className={isSelected ? 'text-emerald-400' : 'text-white/20'}>
                                {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate leading-none mb-1">{course.title}</p>
                                <p className="text-[9px] text-white/30 font-semibold leading-none">Author: {course.authorId?.name || 'Unassigned'}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-8 text-center border border-white/5 border-dashed rounded-2xl bg-white/[0.01]">
                        <BookOpen size={24} className="text-white/10 mb-2 mx-auto" />
                        <p className="text-xs font-bold text-white/20 uppercase tracking-widest">No matching courses</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">Select student Batch *</label>
                    
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                      <input
                        type="text"
                        placeholder="Search batches..."
                        value={batchSearch}
                        onChange={(e) => setBatchSearch(e.target.value)}
                        className="w-full bg-white/3 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none"
                      />
                    </div>

                    {filteredBatchesForModal.length > 0 ? (
                      <div className="max-h-[200px] overflow-y-auto border border-white/5 rounded-2xl bg-white/[0.01] p-2 space-y-1.5 custom-scrollbar">
                        {filteredBatchesForModal.map((batch) => {
                          const isSelected = selectedBatchId === (batch._id || batch.id);
                          return (
                            <div
                              key={batch._id || batch.id}
                              onClick={() => setSelectedBatchId(batch._id || batch.id)}
                              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                                isSelected 
                                  ? 'bg-emerald-500/10 border-emerald-500/35 text-white' 
                                  : 'bg-transparent border-transparent text-white/60 hover:text-white hover:bg-white/2'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={isSelected ? 'text-emerald-400' : 'text-white/20'}>
                                  {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold truncate leading-none mb-1">{batch.name}</p>
                                  <p className="text-[9px] text-white/30 font-semibold leading-none">
                                    Learners: {batch.studentCount || batch.students?.length || 0} | Status: {batch.status}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[8px] font-bold text-white/30 truncate max-w-[120px]">
                                Current Tutor: {batch.assignedTutorId?.name || 'None'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-8 text-center border border-white/5 border-dashed rounded-2xl bg-white/[0.01]">
                        <Layers size={24} className="text-white/10 mb-2 mx-auto" />
                        <p className="text-xs font-bold text-white/20 uppercase tracking-widest">No matching batches</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit Panel */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-600/25"
                  >
                    {submitting ? 'Processing...' : 'Create Assignment'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Remove Confirmation Modal */}
      <AnimatePresence>
        {confirmRemoveId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[160] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f172a] border border-red-500/20 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl text-white p-6 space-y-6"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-500/10 rounded-2xl text-red-400 shrink-0 border border-red-500/20">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-red-400 font-elmessiri">Remove Assignment?</h3>
                  <p className="text-xs text-white/60 font-medium leading-relaxed mt-2">
                    Are you sure you want to remove this tutor assignment? The tutor will retain historical data/records, but will be de-assigned from active duties.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmRemoveId(null)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRemoveAssignment}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-red-600/25"
                >
                  Yes, Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
