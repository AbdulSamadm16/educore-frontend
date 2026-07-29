import React, { useState, useEffect } from 'react';
import { 
  StickyNote, Search, Filter, Trash2, Edit3, 
  ChevronRight, BookOpen, Clock, AlertCircle,
  Plus, MoreVertical, Save, X, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import apiClient from '../../services/api';
import { Link } from 'react-router-dom';
import UniversalModal from '../../components/shared/UniversalModal';
import { useSearch } from '../../context/SearchContext';

export default function Notes() {
  const { searchQuery: search, setSearchQuery: setSearch, setPlaceholder } = useSearch();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [editContent, setEditContent] = useState('');

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm',
    onConfirm: () => {}
  });

  useEffect(() => {
    setPlaceholder('Search notes...');
    fetchNotes();
    return () => {
      setPlaceholder('Search...');
      setSearch('');
    };
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/notes');
      setNotes(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError('Failed to load your saved notes.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setModalConfig({
      isOpen: true,
      title: 'Delete Note',
      message: 'Are you sure you want to permanently delete this note?',
      type: 'confirm',
      onConfirm: async () => {
        try {
          await apiClient.delete(`/notes/${id}`);
          setNotes(notes.filter(n => n._id !== id));
          toast.success('Insight purged from archive.');
        } catch (err) {
          console.error('Error deleting note:', err);
          toast.error('Failed to delete the note.');
        }
      }
    });
  };

  const handleUpdate = async (id) => {
    try {
      const response = await apiClient.put(`/notes/${id}`, { content: editContent });
      setNotes(notes.map(n => n._id === id ? { ...n, content: response.data.data.content } : n));
      setEditingNote(null);
      toast.success('Note updated successfully.');
    } catch (err) {
      console.error('Error updating note:', err);
      toast.error('Failed to update the note.');
    }
  };

  const filteredNotes = notes.filter(note => 
    note.content.toLowerCase().includes(search.toLowerCase()) ||
    note.courseId?.title?.toLowerCase().includes(search.toLowerCase()) ||
    note.lessonId?.title?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px]">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-blue-400 font-bold tracking-[0.3em] uppercase animate-pulse text-sm">Loading Notes</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8 mb-12">
        <div>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-4"
          >
          </motion.div>
          <h2 className="text-5xl font-black text-white mb-4 tracking-tighter leading-tight">
            Study <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Notes</span>
          </h2>
          <p className="text-blue-200/40 text-lg font-medium">Manage and review your saved study notes and session highlights.</p>
        </div>

        <div className="flex gap-4 w-full xl:w-auto">
          {/* Search Bar Removed, moved to Navbar */}
          <div className="flex-1 xl:w-80" />
        </div>
      </div>

      {/* Main Content */}
      {error ? (
        <div className="glass-card rounded-[40px] p-12 border border-red-500/20 flex flex-col items-center justify-center min-h-[400px] bg-red-500/5">
          <AlertCircle size={64} className="text-red-400/20 mb-6" />
          <h3 className="text-2xl font-bold text-white mb-2">Unable to Load Notes</h3>
          <p className="text-red-200/40 text-center max-w-sm mb-8">{error}</p>
          <button 
            onClick={fetchNotes}
            className="px-8 py-3 bg-red-500 hover:bg-red-400 text-white rounded-2xl font-bold transition-all"
          >
            Try Again
          </button>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="glass-card rounded-[40px] p-20 border border-white/5 border-dashed flex flex-col items-center justify-center text-center">
          <div className="p-6 bg-white/5 rounded-[32px] text-white/10 mb-6">
            <StickyNote size={64} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">No Notes Found</h3>
          <p className="text-white/20 max-w-sm mb-10">You haven't saved any notes yet. Start taking notes during your learning sessions.</p>
          <Link 
            to="/learner-dashboard/learning" 
            className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20"
          >
            Start Learning
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredNotes.map((note, idx) => (
            <motion.div
              key={note._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-card group p-8 rounded-[32px] border border-white/5 hover:border-blue-500/30 transition-all duration-500 flex flex-col h-full"
            >
              {/* Note Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                    <BookOpen size={12} />
                    {note.courseId?.title || 'Unknown Course'}
                  </div>
                  <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={12} />
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setEditingNote(note._id);
                      setEditContent(note.content);
                    }}
                    className="p-2 rounded-lg bg-white/5 text-white/20 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(note._id)}
                    className="p-2 rounded-lg bg-white/5 text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Note Content */}
              <div className="flex-1 mb-8">
                <div className="text-[10px] font-black text-white/10 uppercase tracking-widest mb-2">Lesson Context</div>
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  {note.lessonId?.title || 'General Note'}
                  <ChevronRight size={14} className="text-white/10" />
                </h4>
                
                {editingNote === note._id ? (
                  <div className="mt-4">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full bg-white/5 border border-blue-500/30 rounded-xl p-4 text-sm text-white/80 h-32 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={() => handleUpdate(note._id)}
                        className="flex-1 py-2 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-blue-500 transition-all"
                      >
                        Save Changes
                      </button>
                      <button 
                        onClick={() => setEditingNote(null)}
                        className="px-4 py-2 bg-white/5 text-white/40 text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-white/10 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap italic">
                    "{note.content}"
                  </p>
                )}
              </div>

              {/* Footer */}
              {!editingNote && (
                <Link 
                  to={`/learner-dashboard/catalogue/${note.courseId?._id}`}
                  className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between group/link"
                >
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest group-hover/link:text-white transition-colors">Go to Course</span>
                  <ExternalLink size={14} className="text-white/10 group-hover/link:text-blue-400 transition-colors" />
                </Link>
              )}
            </motion.div>
          ))}
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
