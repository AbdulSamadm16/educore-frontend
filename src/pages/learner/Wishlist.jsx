import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Heart, ArrowRight, Play, Star, Clock, 
  BookOpen, Trash2, ShoppingCart, Zap 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import apiClient from '../../services/api';
import { useAuth } from '../../context/useAuth';

export default function Wishlist() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchWishlist();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/wishlist');
      setCourses(response.data.data);
    } catch (err) {
      console.error('Error fetching wishlist:', err);
      toast.error('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (courseId) => {
    try {
      await apiClient.delete(`/wishlist/${courseId}`);
      setCourses(courses.filter(c => (c._id || c.id) !== courseId));
      toast.success('Removed from wishlist');
      window.dispatchEvent(new Event('wishlist-updated'));
    } catch (err) {
      console.error('Error removing from wishlist:', err);
      toast.error('Failed to remove item');
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
        <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center text-white/20 mb-6">
          <Heart size={40} />
        </div>
        <h2 className="text-3xl font-black text-white mb-4">Your Wishlist is Waiting</h2>
        <p className="text-white/40 max-w-md mb-8">Sign in to save your favorite courses and build your learning path.</p>
        <button 
          onClick={() => navigate('/login')}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-blue-400 font-bold tracking-[0.2em] uppercase text-xs">Loading Wishlist</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-5xl font-black text-white tracking-tighter">
            My <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Wishlist</span>
          </h2>
          <p className="text-white/30 font-medium mt-4">Manage the courses you're planning to master.</p>
        </div>
        <div className="flex items-center gap-4 text-white/40 font-bold text-xs uppercase tracking-widest bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
           Total Items: <span className="text-white">{courses.length}</span>
        </div>
      </div>

      <div className="h-px bg-white/5" />

      {courses.length === 0 ? (
        <div className="py-24 glass-card rounded-[40px] border border-white/5 border-dashed flex flex-col items-center text-center">
           <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center text-white/10 mb-8">
              <Zap size={40} />
           </div>
           <h3 className="text-xl font-bold text-white mb-2">No Courses Found</h3>
           <p className="text-white/20 text-sm max-w-xs mb-8">Your wishlist is currently empty. Explore our catalogue to find your next challenge.</p>
           <button 
             onClick={() => navigate('/learner-dashboard/catalogue')}
             className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3"
           >
             Browse Catalogue <ArrowRight size={16} />
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {courses.map((course, idx) => (
              <motion.div
                key={course._id || course.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className="glass-card rounded-[32px] overflow-hidden border border-white/5 group hover:border-blue-500/30 transition-all duration-500 flex flex-col h-full"
              >
                <div className="relative aspect-video">
                  <img src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800\u0026q=80'} className="w-full h-full object-cover" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020617] to-transparent opacity-60"></div>
                  
                  <button 
                    onClick={() => removeFromWishlist(course._id || course.id)}
                    className="absolute top-4 right-4 p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl border border-red-500/20 backdrop-blur-md transition-all z-20"
                    title="Remove from wishlist"
                  >
                    <Trash2 size={18} />
                  </button>

                  <div className="absolute bottom-4 left-4">
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-lg backdrop-blur-md border border-blue-500/30">
                      {course.level}
                    </span>
                  </div>
                </div>

                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em]">{course.category}</span>
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star size={14} fill="currentColor" />
                      <span className="text-xs font-bold">{course.averageRating?.toFixed(1) || '0.0'}</span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors mb-2 line-clamp-1">{course.title}</h3>
                  <p className="text-white/40 text-sm font-medium line-clamp-2 mb-6 h-10">{course.shortDescription}</p>

                  <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-auto">
                    <div className="text-xl font-black text-white">
                      {course.isFree ? 'FREE' : `$${course.price}`}
                    </div>
                    <button 
                      onClick={() => navigate(`/learner-dashboard/catalogue/${course.slug || course._id || course.id}`)}
                      className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all"
                    >
                      <Play size={18} fill="currentColor" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
