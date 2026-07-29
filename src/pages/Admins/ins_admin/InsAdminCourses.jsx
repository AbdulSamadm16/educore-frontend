import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Search, Filter, Star, Users, 
  Clock, CheckCircle2, PlayCircle, Eye, 
  Trash2, AlertTriangle, ChevronRight,
  Shield, XCircle, Info, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../services/api';

export default function InsAdminCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuspendModal, setShowSuspendModal] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
  }, [filterStatus, filterCategory]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/courses/admin/all', {
        params: {
          status: filterStatus === 'all' ? undefined : filterStatus,
          category: filterCategory === 'all' ? undefined : filterCategory,
          search: searchTerm || undefined
        }
      });
      if (response.data?.success) {
        setCourses(response.data.data.courses);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeature = async (courseId) => {
    try {
      const course = courses.find(c => c._id === courseId);
      await apiClient.patch(`/courses/${courseId}/feature`);
      setCourses(courses.map(c => c._id === courseId ? { ...c, featured: !c.featured } : c));
      toast.success(course.featured ? 'Removed from featured highlights' : 'Course featured successfully!');
    } catch (err) {
      console.error('Error featuring course:', err);
      toast.error('Failed to update featured status');
    }
  };

  const handleSuspend = async () => {
    if (!suspendReason.trim()) {
      toast.error('Please provide a reason for suspension');
      return;
    }
    try {
      await apiClient.patch(`/courses/${showSuspendModal}/suspend`, { reason: suspendReason });
      setCourses(courses.map(c => c._id === showSuspendModal ? { ...c, status: 'suspended' } : c));
      setShowSuspendModal(null);
      setSuspendReason('');
      toast.success('Course suspended and tutor notified via email');
    } catch (err) {
      console.error('Error suspending course:', err);
      toast.error('Failed to suspend course');
    }
  };

  const handleUnsuspend = async (courseId) => {
    try {
      await apiClient.patch(`/courses/${courseId}/unsuspend`);
      setCourses(courses.map(c => c._id === courseId ? { ...c, status: 'published' } : c));
      toast.success('Course unsuspended successfully');
    } catch (err) {
      console.error('Error unsuspending course:', err);
      toast.error('Failed to unsuspend course');
    }
  };

  const handleApprove = async (courseId) => {
    try {
      await apiClient.patch(`/courses/${courseId}/approve`);
      setCourses(courses.map(c => c._id === courseId ? { ...c, status: 'published' } : c));
      toast.success('Course approved and published successfully');
    } catch (err) {
      console.error('Error approving course:', err);
      toast.error('Failed to approve course');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-[10px] text-white font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer"
          >
            <option value="all" className="bg-[#0b0f1a]">Status: All Courses</option>
            <option value="published" className="bg-[#0b0f1a]">Status: Published</option>
            <option value="suspended" className="bg-[#0b0f1a]">Status: Suspended</option>
            <option value="review_pending" className="bg-[#0b0f1a]">Status: Pending Review</option>
            <option value="draft" className="bg-[#0b0f1a]">Status: Drafts</option>
          </select>

          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-[10px] text-white font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer"
          >
            <option value="all" className="bg-[#0b0f1a]">Category: All</option>
            <option value="Development" className="bg-[#0b0f1a]">Development</option>
            <option value="Design" className="bg-[#0b0f1a]">Design</option>
            <option value="Business" className="bg-[#0b0f1a]">Business</option>
            <option value="Marketing" className="bg-[#0b0f1a]">Marketing</option>
            <option value="Photography" className="bg-[#0b0f1a]">Photography</option>
            <option value="Music" className="bg-[#0b0f1a]">Music</option>
            <option value="Finance" className="bg-[#0b0f1a]">Finance</option>
            <option value="Data Science" className="bg-[#0b0f1a]">Data Science</option>
            <option value="Artificial Intelligence" className="bg-[#0b0f1a]">Artificial Intelligence</option>
            <option value="Cybersecurity" className="bg-[#0b0f1a]">Cybersecurity</option>
            <option value="Health & Fitness" className="bg-[#0b0f1a]">Health & Fitness</option>
            <option value="Language Learning" className="bg-[#0b0f1a]">Language Learning</option>
          </select>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-emerald-400 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search courses or tutors..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchCourses()}
              className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all w-64 font-medium"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="glass-card rounded-[32px] p-6 border border-white/5 animate-pulse flex gap-6">
               <div className="w-48 h-28 rounded-2xl bg-white/5" />
               <div className="flex-1 space-y-4 py-2">
                  <div className="h-4 bg-white/5 rounded w-1/4" />
                  <div className="h-6 bg-white/5 rounded w-1/2" />
                  <div className="h-4 bg-white/5 rounded w-1/3" />
               </div>
            </div>
          ))
        ) : courses.length > 0 ? (
          courses.map((course, i) => (
            <motion.div 
              key={course._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`glass-card rounded-[32px] p-6 border transition-all group flex flex-col sm:flex-row items-start sm:items-center gap-6 ${
                course.status === 'suspended' ? 'border-rose-500/20 bg-rose-500/5' : 'border-white/5 hover:border-emerald-500/20'
              }`}
            >
              <div className="w-full sm:w-48 h-28 rounded-2xl bg-white/5 overflow-hidden relative flex-shrink-0 border border-white/10">
                <img 
                  src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80'} 
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute top-2 left-2">
                   {course.featured && (
                     <div className="bg-emerald-500 text-white p-1.5 rounded-lg shadow-xl">
                       <Star size={12} fill="currentColor" />
                     </div>
                   )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                   <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">
                     {course.category}
                   </span>
                    <div className={`flex items-center gap-1.5 text-[9px] font-black px-2 py-0.5 rounded-full border ${
                      course.status === 'published' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
                      course.status === 'suspended' ? 'text-rose-400 border-rose-500/20 bg-rose-500/5' :
                      course.status === 'review_pending' ? 'text-amber-400 border-amber-500/20 bg-amber-500/5 animate-pulse' :
                      course.status === 'draft' ? 'text-blue-400 border-blue-500/20 bg-blue-500/5' :
                      'text-white/40 border-white/10 bg-white/5'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        course.status === 'published' ? 'bg-emerald-400' :
                        course.status === 'suspended' ? 'bg-rose-400' :
                        course.status === 'review_pending' ? 'bg-amber-400' :
                        course.status === 'draft' ? 'bg-blue-400' : 'bg-white/20'
                      }`} />
                      {course.status.toUpperCase()}
                    </div>
                </div>
                
                <h3 className="text-xl font-bold text-white truncate mb-2 group-hover:text-emerald-400 transition-colors">
                  {course.title}
                </h3>

                <div className="flex flex-wrap items-center gap-6 text-white/40">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-[10px] font-black text-emerald-500 border border-emerald-500/20">
                      {course.authorId?.name?.[0] || 'T'}
                    </div>
                    <span className="text-xs font-bold">{course.authorId?.name || 'Unknown Tutor'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Users size={14} className="text-emerald-500/60" />
                    <span>{course.enrollmentCount} Learners</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Clock size={14} className="text-emerald-500/60" />
                    <span>{new Date(course.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end sm:justify-start sm:ml-auto border-t sm:border-t-0 sm:border-l border-white/5 pt-4 sm:pt-0 sm:pl-8">
                 <button 
                  onClick={() => handleToggleFeature(course._id)}
                  data-tooltip={course.featured ? 'Remove from Featured' : 'Feature this course'}
                  className={`p-3 rounded-2xl transition-all border ${
                    course.featured ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white/5 text-white/20 border-white/10 hover:text-emerald-400'
                  }`}
                 >
                    <Star size={20} fill={course.featured ? 'currentColor' : 'none'} />
                 </button>
                 
                 <a 
                   href={`/learner-dashboard/catalogue/${course._id}`}
                   target="_blank"
                   rel="noreferrer"
                   className="p-3 rounded-2xl bg-white/5 text-white/20 hover:text-white border border-white/10 hover:bg-white/10 transition-all"
                   data-tooltip="Preview Course Details"
                 >
                    <Eye size={20} />
                 </a>

                  {course.status === 'review_pending' && (
                    <button 
                     onClick={() => handleApprove(course._id)}
                     className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all animate-pulse"
                     data-tooltip="Approve & Publish Course"
                    >
                       <CheckCircle2 size={20} />
                    </button>
                  )}

                  {course.status === 'suspended' && (
                    <button 
                     onClick={() => handleUnsuspend(course._id)}
                     className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all"
                     data-tooltip="Unsuspend Course"
                    >
                       <CheckCircle2 size={20} />
                    </button>
                  )}

                  {course.status === 'published' && (
                    <button 
                     onClick={() => setShowSuspendModal(course._id)}
                     className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all"
                     data-tooltip="Suspend Course"
                    >
                       <XCircle size={20} />
                    </button>
                  )}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="py-24 text-center glass-card rounded-[48px] border border-white/5 bg-white/2">
             <div className="w-20 h-20 rounded-3xl bg-white/5 text-white/10 flex items-center justify-center mx-auto mb-6 border border-white/10">
               <Shield size={40} />
             </div>
             <p className="text-white/20 font-black text-xl uppercase tracking-widest">No active courses found</p>
             <p className="text-white/10 text-sm mt-2">Adjust your search parameters or filter status.</p>
          </div>
        )}
      </div>

      {/* Suspend Modal */}
      <AnimatePresence>
        {showSuspendModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowSuspendModal(null)}
               className="absolute inset-0 bg-[#06080f]/90 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="glass-card w-full max-w-md p-10 rounded-[40px] border border-rose-500/20 relative overflow-hidden"
             >
                <div className="absolute top-0 right-0 p-8 text-rose-500/10">
                  <AlertTriangle size={80} />
                </div>
                
                <h3 className="text-2xl font-black text-white mb-2">Suspend Course</h3>
                <p className="text-white/40 text-sm font-medium mb-8">This will take the course offline. Enrolled learners will lose access until resolution.</p>
                
                <div className="space-y-6">
                   <div>
                      <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest block mb-3">Reason for Suspension</label>
                      <textarea 
                        value={suspendReason}
                        onChange={(e) => setSuspendReason(e.target.value)}
                        placeholder="Specify policy violation or quality issues..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white placeholder:text-white/10 h-32 focus:outline-none focus:ring-2 focus:ring-rose-500/30 font-medium text-sm"
                      />
                   </div>
                   
                   <div className="flex gap-4">
                      <button 
                        onClick={() => setShowSuspendModal(null)}
                        className="flex-1 py-4 text-xs font-black text-white/40 uppercase tracking-widest hover:text-white transition-all"
                      >
                        Abort
                      </button>
                      <button 
                        onClick={handleSuspend}
                        className="flex-1 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-rose-600/20"
                      >
                        Confirm
                      </button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
