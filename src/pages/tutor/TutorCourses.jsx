import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Filter, MoreVertical, Edit2, 
  Trash2, Globe, Lock, Eye, Users, Star,
  LayoutGrid, List, AlertCircle, CheckCircle,
  Play, FileText, ChevronLeft, ChevronRight, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import apiClient from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';
import UniversalModal from '../../components/shared/UniversalModal';
import { useSearch } from '../../context/SearchContext';
import { resolvePlayerLesson } from '../../utils/coursePlayer';

export default function TutorCourses() {
  const { searchQuery: search, setSearchQuery: setSearch, setPlaceholder } = useSearch();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCourses, setTotalCourses] = useState(0);
  const [stats, setStats] = useState({ totalStudents: 0, publishedCourses: 0, avgRating: '0.0' });

  useEffect(() => {
    setPlaceholder('Search courses...');
    return () => {
      setPlaceholder('Search...');
      setSearch('');
    };
  }, [setPlaceholder, setSearch]);

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm',
    onConfirm: () => {}
  });

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/courses/my-courses?limit=10000');
      const allCourses = response.data.data.courses || [];
      const totalStudents = allCourses.reduce((acc, c) => acc + (c.enrollmentCount || 0), 0);
      const publishedCourses = allCourses.filter(c => c.status === 'published').length;
      const avgRating = (allCourses.reduce((acc, c) => acc + (c.averageRating || 0), 0) / (allCourses.length || 1)).toFixed(1);
      setStats({ totalStudents, publishedCourses, avgRating });
    } catch (err) {
      console.error('Error fetching tutor stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchMyCourses = useCallback(async (targetPage = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (search) params.append('search', search);
      params.append('page', targetPage);
      params.append('limit', 9);
      
      const response = await apiClient.get(`/courses/my-courses?${params.toString()}`);
      setCourses(response.data.data.courses || []);
      const pagination = response.data.data.pagination || {};
      setTotalPages(pagination.pages || 1);
      setTotalCourses(pagination.total || 0);
      setError(null);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Failed to retrieve your courses.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMyCourses(page);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchMyCourses, page]);

  const handlePublishToggle = async (courseId, currentStatus) => {
    const isPublishing = currentStatus !== 'published';
    setModalConfig({
      isOpen: true,
      title: isPublishing ? 'Publish Course' : 'Unpublish Course',
      message: isPublishing 
        ? 'This will make the course visible and accessible to all learners.' 
        : 'This will take the course offline. Enrolled learners will still have access.',
      type: 'confirm',
      showNotificationCheckbox: isPublishing, // only show checkbox when publishing
      onConfirm: async (sendNotification) => {
        const endpoint = `/courses/${courseId}/${isPublishing ? 'publish' : 'unpublish'}`;
        try {
          await apiClient.patch(endpoint, isPublishing ? { sendNotification } : {});
          setCourses(courses.map(c => 
            c._id === courseId ? { ...c, status: isPublishing ? 'published' : 'unpublished' } : c
          ));
          fetchStats();
          toast.success(`Course successfully ${isPublishing ? 'published' : 'unpublished'}.`);
        } catch (err) {
          console.error('Error toggling publish state:', err);
          toast.error(err.response?.data?.message || 'Failed to update publication status.');
        }
      }
    });
  };

  const handleDeleteCourse = (courseId) => {
    setModalConfig({
      isOpen: true,
      title: 'Delete Course',
      message: 'Are you sure you want to permanently delete this course? This action cannot be reversed.',
      type: 'confirm',
      onConfirm: async () => {
        try {
          await apiClient.delete(`/courses/${courseId}`);
          setCourses(courses.filter(c => c._id !== courseId));
          setTotalCourses(prev => Math.max(0, prev - 1));
          fetchStats();
          toast.success('Course successfully deleted.');
        } catch (err) {
          console.error('Error deleting course:', err);
          toast.error('Failed to delete course.');
        }
      }
    });
  };

  const filteredCourses = courses;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px]">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-violet-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-violet-400 font-bold tracking-[0.3em] uppercase animate-pulse text-sm">Loading Courses</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8 mb-12">
        <div>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-4"
          />
          <h2 className="text-5xl font-black text-white mb-4 tracking-tighter leading-tight">
            My <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Courses</span>
          </h2>
          <p className="text-violet-200/40 text-lg font-medium">Create, manage, and monitor your educational courses.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
          {/* Search Bar Removed, moved to Navbar */}
          <div className="flex-1 sm:w-80" />

          <button 
            onClick={() => navigate('/tutor-dashboard/courses/new')}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-violet-600/20"
          >
            <Plus size={20} strokeWidth={3} />
            Create Course
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-12 bg-white/5 p-1.5 rounded-2xl border border-white/5 w-fit">
        {['all', 'draft', 'published'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              statusFilter === status 
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' 
              : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <QuickStat label="Total Students" value={stats.totalStudents} icon={Users} color="violet" />
        <QuickStat label="Published Courses" value={stats.publishedCourses} icon={Globe} color="fuchsia" />
        <QuickStat label="Avg. Rating" value={stats.avgRating} icon={Star} color="amber" />
      </div>

      {/* Main Grid */}
      {error ? (
        <div className="glass-card rounded-[40px] p-12 border border-red-500/20 flex flex-col items-center justify-center min-h-[400px] bg-red-500/5">
          <AlertCircle size={64} className="text-red-400/20 mb-6" />
          <h3 className="text-2xl font-bold text-white mb-2">Unable to Load Courses</h3>
          <p className="text-red-200/40 text-center max-w-sm mb-8">{error}</p>
          <button onClick={fetchMyCourses} className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-bold transition-all">Retry</button>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="glass-card rounded-[40px] p-20 border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
          <div className="p-6 bg-white/5 rounded-[32px] text-white/10 mb-6">
            <FileText size={64} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">No Courses Found</h3>
          <p className="text-white/20 max-w-sm mb-10">You haven't created any courses yet. Create your first course to start sharing knowledge.</p>
          <button 
            onClick={() => navigate('/tutor-dashboard/courses/new')}
            className="px-10 py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all"
          >
            Create Your First Course
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCourses.map((course, idx) => (
            <TutorCourseCard 
              key={course._id} 
              course={course} 
              index={idx} 
              onDelete={handleDeleteCourse}
              onTogglePublish={handlePublishToggle}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && courses.length > 0 && (
        <div className="mt-16 flex flex-col sm:flex-row justify-between items-center gap-6 border-t border-white/5 pt-8 animate-in fade-in duration-500">
          <p className="text-sm text-white/40 font-medium">
            Showing <span className="text-white font-bold">{Math.min((page - 1) * 9 + 1, totalCourses)}</span> to{" "}
            <span className="text-white font-bold">{Math.min(page * 9, totalCourses)}</span> of{" "}
            <span className="text-white font-bold">{totalCourses}</span> courses
          </p>
          
          <div className="flex items-center gap-2">
            {/* Previous Button */}
            <button
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all disabled:opacity-30 disabled:hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page Numbers */}
            {(() => {
              const pages = [];
              const maxVisible = 5;
              if (totalPages <= maxVisible) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                if (page <= 3) {
                  pages.push(1, 2, 3, 4, '...', totalPages);
                } else if (page >= totalPages - 2) {
                  pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                } else {
                  pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
                }
              }
              return pages;
            })().map((p, idx) => (
              p === '...' ? (
                <span key={`dots-${idx}`} className="px-3 text-white/20 select-none">...</span>
              ) : (
                <button
                  key={`page-${p}`}
                  onClick={() => setPage(p)}
                  className={`w-10 h-10 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                    p === page
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20 border border-violet-500"
                      : "bg-white/5 text-white/60 hover:text-white border border-white/10 hover:bg-white/10"
                  }`}
                >
                  {p}
                </button>
              )
            ))}

            {/* Next Button */}
            <button
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages}
              className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all disabled:opacity-30 disabled:hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <UniversalModal 
        isOpen={modalConfig.isOpen}
        config={modalConfig}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
      />
    </div>
  );
}

function QuickStat({ label, value, icon: Icon, color }) {
  const colors = {
    violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    fuchsia: "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };

  return (
    <div className="glass-card p-6 rounded-3xl border border-white/5 flex items-center gap-6">
      <div className={`p-4 rounded-2xl border ${colors[color]}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">{label}</p>
        <p className="text-3xl font-black text-white tracking-tighter">{value}</p>
      </div>
    </div>
  );
}

function TutorCourseCard({ course, index, onDelete, onTogglePublish }) {
  const [showOptions, setShowOptions] = useState(false);
  const navigate = useNavigate();
  const isPublished = course.status === 'published';

  return (
    <Link to={`/tutor-dashboard/courses/edit/${course._id}`} className="block h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="glass-card group p-6 rounded-[32px] border border-white/5 hover:border-violet-500/30 transition-all duration-500 relative flex flex-col h-full"
      >
        {/* Options Dropdown */}
        <div className="absolute top-8 right-8 z-10">
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowOptions(!showOptions); }}
            className="p-2 rounded-xl bg-violet-500/10 text-violet-400 hover:text-violet-300 hover:bg-violet-500/20 transition-all"
          >
            <MoreVertical size={20} />
          </button>
          
          <AnimatePresence>
            {showOptions && (
              <>
                <div className="fixed inset-0 z-10" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowOptions(false); }} />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="absolute right-0 mt-2 w-48 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-20"
                >
                  <div 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/tutor-dashboard/courses/edit/${course._id}`); }}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <Edit2 size={16} />
                    Edit Course
                  </div>
                  <div
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowOptions(false);
                      try {
                        const lessonId = await resolvePlayerLesson(course._id);
                        if (lessonId) {
                          navigate(`/learner-dashboard/player/${course._id}/${lessonId}`);
                        } else {
                          toast.error('No lessons found in this course.');
                        }
                      } catch {
                        toast.error('Failed to open course player.');
                      }
                    }}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <Play size={16} />
                    Open Course Player
                  </div>
                  <div 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/learner-dashboard/catalogue/${course.slug || course._id}`); }}
                    className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <Eye size={16} />
                    View as Learner
                  </div>
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePublish(course._id, course.status); setShowOptions(false); }}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                  >
                    {isPublished ? <Lock size={16} /> : <Globe size={16} />}
                    {isPublished ? 'Unpublish' : 'Publish Course'}
                  </button>
                  <div className="h-[1px] bg-white/5 mx-2" />
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(course._id); setShowOptions(false); }}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={16} />
                    Delete Course
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Thumbnail */}
        <div className="relative aspect-video rounded-2xl overflow-hidden mb-6 shadow-2xl">
          <img 
            src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80'} 
            alt={course.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] to-transparent opacity-60"></div>
          <div className="absolute bottom-4 left-4">
            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border backdrop-blur-md ${
              isPublished 
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}>
              {course.status}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-2 gap-4">
            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em]">{course.category}</span>
            <div className="flex items-center gap-1.5 text-amber-400">
              <Star size={14} fill="currentColor" />
              <span className="text-xs font-bold">{course.averageRating?.toFixed(1) || '0.0'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
             <div className="w-1.5 h-1.5 rounded-full bg-violet-400/40" />
             <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
               Last updated: {new Date(course.updatedAt).toLocaleDateString()}
             </p>
          </div>

          <h3 className="text-xl font-bold text-white mb-4 tracking-tight group-hover:text-violet-400 transition-colors line-clamp-1">
            {course.title}
          </h3>

          {/* Course Progress / Stats */}
          <div className="grid grid-cols-2 gap-4 pt-6 mt-auto border-t border-white/5">
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
                  <Users size={16} />
               </div>
               <div>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest leading-none mb-1">Students</p>
                  <p className="text-sm font-black text-white leading-none">{course.enrollmentCount || 0}</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-400">
                  <TrendingUp size={16} />
               </div>
               <div>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest leading-none mb-1">Status</p>
                  <p className="text-sm font-black text-white leading-none">{isPublished ? 'Active' : 'Offline'}</p>
               </div>
            </div>
          </div>

        </div>
      </motion.div>
    </Link>
  );
}
