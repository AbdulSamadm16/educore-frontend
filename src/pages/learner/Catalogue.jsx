import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Filter, BookOpen, Clock, Star, 
  ChevronLeft, ChevronRight, Play, LayoutGrid, List,
  TrendingUp, Award, Zap, CheckCircle, Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../services/api';
import { useSearch } from '../../context/SearchContext';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import toast from 'react-hot-toast';

export default function Catalogue() {
  const { searchQuery: search, setSearchQuery: setSearch, setPlaceholder } = useSearch();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [togglingId, setTogglingId] = useState(null);
  const { user } = useAuth();
  
  // Filter States
  const [filters, setFilters] = useState({
    category: '',
    level: '',
    sort: 'newest',
    price: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setPlaceholder('Search courses...');
    return () => {
      setPlaceholder('Search...');
      setSearch(''); // Clear search on unmount
    };
  }, []);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCourses, setTotalCourses] = useState(0);

  const fetchCourses = useCallback(async (targetPage = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filters.category) params.append('category', filters.category);
      if (filters.level) params.append('level', filters.level);
      if (filters.sort) params.append('sort', filters.sort);
      if (filters.price !== 'all') params.append('price', filters.price);
      if (filters.rating) params.append('rating', filters.rating);
      params.append('page', targetPage);
      params.append('limit', 9);

      const response = await apiClient.get(`/courses/catalogue?${params.toString()}`);
      const { courses: newCourses, pagination } = response.data.data;
      
      const sorted = [...newCourses].sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return 0;
      });
      setCourses(sorted);
      setTotalPages(pagination.pages || 1);
      setTotalCourses(pagination.total || 0);
      setError(null);
    } catch (err) {
      console.error('Error fetching catalogue:', err);
      setError('Failed to load the course catalogue. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, filters]);

  // Reset page to 1 when search query or filters change
  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  // Debounced course fetch on search/filter/page transitions
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCourses(page);
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchCourses, page]);

  useEffect(() => {
    if (user) {
      fetchWishlistIds();
    } else {
      setWishlistIds(new Set());
    }
  }, [user]);

  const fetchWishlistIds = async () => {
    try {
      const response = await apiClient.get('/wishlist');
      const ids = new Set(response.data.data.map(c => c._id || c.id));
      setWishlistIds(ids);
    } catch (err) {
      console.error('Error fetching wishlist ids:', err);
    }
  };

  const handleWishlistToggle = async (e, courseId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error('Please sign in to save to wishlist');
      return;
    }

    if (togglingId) return;

    const isAdded = wishlistIds.has(courseId);
    setTogglingId(courseId);

    try {
      if (isAdded) {
        await apiClient.delete(`/wishlist/${courseId}`);
        setWishlistIds(prev => {
          const next = new Set(prev);
          next.delete(courseId);
          return next;
        });
        toast.success('Removed from wishlist');
      } else {
        await apiClient.post(`/wishlist/${courseId}`);
        setWishlistIds(prev => {
          const next = new Set(prev);
          next.add(courseId);
          return next;
        });
        toast.success('Added to wishlist');
      }
      window.dispatchEvent(new Event('wishlist-updated'));
    } catch (err) {
      console.error('Wishlist toggle error:', err);
      toast.error('Failed to update wishlist');
    } finally {
      setTogglingId(null);
    }
  };

  const categories = ['Development', 'Design', 'Business', 'Marketing', 'Photography', 'Music', 'Finance', 'Data Science', 'Artificial Intelligence', 'Cybersecurity', 'Health & Fitness', 'Language Learning'];
  const levels = ['Beginner', 'Intermediate', 'Advanced'];

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8 mb-12">
        <div className="max-w-2xl">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-4"
          >
          </motion.div>
          <h2 className="text-5xl font-black text-white mb-4 tracking-tighter leading-tight">
            Explore the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Catalogue</span>
          </h2>
          <p className="text-blue-200/40 text-lg font-medium">Find your next course and learn from top-tier industry experts.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
          {/* Search Bar Removed from here, moved to Navbar */}
            <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white keep-white shadow-lg shadow-blue-600/20' : 'text-white/40 hover:text-white'}`}
                  >
                    <LayoutGrid size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Grid</span>
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white keep-white shadow-lg shadow-blue-600/20' : 'text-white/40 hover:text-white'}`}
                  >
                    <List size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">List</span>
                  </button>
                </div>

          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all border ${
              showFilters 
              ? 'bg-blue-600 text-white keep-white border-blue-500 shadow-lg shadow-blue-600/20' 
              : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Filter size={20} />
            Filters
          </button>
        </div>
      </div>

      {/* Advanced Filters Overlay */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-12"
          >
            <div className="glass-card p-8 rounded-[32px] border border-white/10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Category */}
              <div>
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">Category</label>
                <select 
                  value={filters.category}
                  onChange={(e) => setFilters({...filters, category: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                >
                  <option value="" className="bg-[#0b0f1a]">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat} className="bg-[#0b0f1a]">{cat}</option>
                  ))}
                </select>
              </div>

              {/* Level */}
              <div>
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">Experience Level</label>
                <select 
                  value={filters.level}
                  onChange={(e) => setFilters({...filters, level: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                >
                  <option value="" className="bg-[#0b0f1a]">All Levels</option>
                  {levels.map(lvl => (
                    <option key={lvl} value={lvl} className="bg-[#0b0f1a]">{lvl}</option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">Sort By</label>
                <select 
                  value={filters.sort}
                  onChange={(e) => setFilters({...filters, sort: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                >
                  <option value="newest" className="bg-[#0b0f1a]">Newest</option>
                  <option value="popular" className="bg-[#0b0f1a]">Most Popular</option>
                  <option value="rating" className="bg-[#0b0f1a]">Highest Rated</option>
                  <option value="price_low" className="bg-[#0b0f1a]">Price: Low to High</option>
                  <option value="price_high" className="bg-[#0b0f1a]">Price: High to Low</option>
                </select>
              </div>

              {/* Price Type */}
              <div>
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">Price</label>
                <select 
                  value={filters.price}
                  onChange={(e) => setFilters({...filters, price: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                >
                  <option value="all" className="bg-[#0b0f1a]">All Courses</option>
                  <option value="free" className="bg-[#0b0f1a]">Free</option>
                  <option value="paid" className="bg-[#0b0f1a]">Paid</option>
                </select>
              </div>

              {/* Rating */}
              <div>
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">Minimum Rating</label>
                <select 
                  value={filters.rating || ''}
                  onChange={(e) => setFilters({...filters, rating: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                >
                  <option value="" className="bg-[#0b0f1a]">Any Rating</option>
                  <option value="4" className="bg-[#0b0f1a]">4.0+ Stars</option>
                  <option value="3" className="bg-[#0b0f1a]">3.0+ Stars</option>
                  <option value="2" className="bg-[#0b0f1a]">2.0+ Stars</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="lg:col-span-4 flex justify-end items-center gap-6 pt-4 border-t border-white/5">
                <button 
                  onClick={() => {setSearch(''); setFilters({category: '', level: '', sort: 'newest', price: 'all', rating: ''})}}
                  className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-300 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      {loading ? (
        <div className="glass-card rounded-[40px] p-12 border border-white/5 flex flex-col items-center justify-center min-h-[500px]">
          <div className="relative w-20 h-20 mb-8">
            <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2 animate-pulse">Loading Catalogue...</h3>
          <p className="text-white/20 text-center font-medium uppercase tracking-widest text-xs">Loading available courses</p>
        </div>
      ) : error ? (
        <div className="glass-card rounded-[40px] p-12 border border-red-500/20 flex flex-col items-center justify-center min-h-[500px] bg-red-500/5">
          <Zap size={64} className="text-red-400/20 mb-6" />
          <h3 className="text-2xl font-bold text-white mb-2">Unable to Load Courses</h3>
          <p className="text-red-200/40 text-center max-w-sm mb-8">{error}</p>
          <button 
            onClick={() => fetchCourses(page)}
            className="px-8 py-3 bg-red-500 hover:bg-red-400 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/20"
          >
            Try Again
          </button>
        </div>
      ) : courses.length === 0 ? (
        <div className="glass-card rounded-[40px] p-12 border border-white/5 flex flex-col items-center justify-center min-h-[500px]">
          <Search size={64} className="text-white/5 mb-6" />
          <h3 className="text-2xl font-bold text-white mb-2">No results found</h3>
          <p className="text-white/20 text-center max-w-sm mb-8">Your search did not match any available courses.</p>
          <button 
            onClick={() => {setSearch(''); setFilters({category: '', level: '', sort: 'newest', price: 'all'})}}
            className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-bold transition-all"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "flex flex-col gap-6"}>
          {courses.map((course, idx) => (
            <CourseCard 
              key={course._id || course.id || `course-${idx}`} 
              course={course} 
              index={idx} 
              viewMode={viewMode} 
              inWishlist={wishlistIds.has(course._id || course.id)}
              onWishlistToggle={(e) => handleWishlistToggle(e, course._id || course.id)}
              isToggling={togglingId === (course._id || course.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && courses.length > 0 && (
        <div className="mt-16 flex flex-col sm:flex-row justify-between items-center gap-6 border-t border-white/5 pt-8">
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
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 border border-blue-500"
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
    </div>
  );
}

function CourseCard({ course, index, viewMode, inWishlist, onWishlistToggle, isToggling }) {
  const isGrid = viewMode === 'grid';

  return (
    <Link to={`/learner-dashboard/catalogue/${course.slug || course._id || course.id}`} className="block h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`glass-card group overflow-hidden border border-white/5 hover:border-blue-500/30 transition-all duration-500 h-full ${
          isGrid ? 'rounded-[32px] flex flex-col' : 'rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row gap-4 sm:gap-8 p-3 sm:p-4'
        }`}
      >
        {/* Thumbnail Container */}
        <div className={`relative overflow-hidden ${isGrid ? 'aspect-video' : 'w-full sm:w-72 h-48 sm:h-44 rounded-xl sm:rounded-2xl shrink-0'}`}>
          <img 
            src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80'} 
            alt={course.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
          
          {/* Wishlist Button */}
          <button 
            onClick={onWishlistToggle}
            disabled={isToggling}
            className={`absolute top-4 right-4 p-2.5 rounded-xl backdrop-blur-md border transition-all z-20 group ${
              inWishlist 
              ? 'bg-red-500/20 border-red-500/30 text-red-500' 
              : 'bg-[#020617]/50 border-white/10 text-white/40 hover:text-white hover:border-white/30'
            }`}
          >
            {isToggling ? (
              <div className="w-4.5 h-4.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Heart size={18} className={inWishlist ? 'fill-red-500' : 'group-hover:scale-110 transition-transform'} />
            )}
          </button>

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {course.featured && (
              <span className="w-fit px-3 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-lg backdrop-blur-md border border-amber-500/30 flex items-center gap-1.5 shadow-xl">
                <TrendingUp size={12} />
                Featured
              </span>
            )}
            <span className="w-fit px-3 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-lg backdrop-blur-md border border-blue-500/30">
              {course.level}
            </span>
          </div>

          {/* Play Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-90 group-hover:scale-100">
             <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-2xl shadow-blue-600/40">
               <Play size={28} fill="currentColor" />
             </div>
          </div>
        </div>

        {/* Content Container */}
        <div className={`flex flex-col flex-1 min-w-0 ${isGrid ? 'p-6 sm:p-8' : 'p-2 sm:py-2 sm:pr-4'}`}>
          <div className="flex justify-between items-start mb-2 gap-4">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em]">{course.category}</span>
            <div className="flex items-center gap-1.5 text-amber-400">
              <Star size={14} fill="currentColor" />
              <span className="text-xs font-bold">{course.averageRating?.toFixed(1) || '0.0'}</span>
              <span className="text-[10px] text-white/20 font-medium">({course.reviewCount || 0})</span>
            </div>
          </div>

          <h3 className={`font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors mb-1 leading-snug ${isGrid ? 'text-lg sm:text-xl' : 'text-base sm:text-2xl'}`}>
            {course.title}
          </h3>

          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-3">By {course.authorId?.name || 'Instructor'}</p>

          <p className={`text-white/40 font-medium mb-4 sm:mb-6 line-clamp-2 ${isGrid ? 'text-sm' : 'text-xs sm:text-base'}`}>
            {course.shortDescription}
          </p>

          {/* Footer Meta */}
          <div className={`mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/5 ${isGrid ? 'pt-6' : 'pt-4'}`}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-white/40">
                <Clock size={16} />
                <span className="text-xs font-bold">{Math.round(course.durationInMinutes / 60) || 1}h</span>
              </div>
              <div className="flex items-center gap-2 text-white/40">
                <BookOpen size={16} />
                <span className="text-xs font-bold">{course.totalLessons || 0} Lessons</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest leading-none mb-1">
                  {course.isEnrolled ? 'Status' : 'Price'}
                </p>
                {course.isEnrolled ? (
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle size={14} />
                    <span className="text-xs font-black uppercase tracking-widest">Enrolled</span>
                  </div>
                ) : (
                  <p className="text-lg sm:text-xl font-black text-white leading-none">
                    {course.isFree ? 'FREE' : `${course.currency || '$'}${course.price}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
