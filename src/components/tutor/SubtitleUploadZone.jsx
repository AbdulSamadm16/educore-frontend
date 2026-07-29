import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Subtitles, X, Loader, CheckCircle, AlertCircle, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import apiClient from '../../services/api';

export default function SubtitleUploadZone({ lessonId, subtitleUrl, onSubtitleChange, onUploadingStateChange }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState('idle'); // idle, uploading, success, error
  const [progress, setProgress] = useState(0);
  const [subtitleFilename, setSubtitleFilename] = useState('');
  const [activeController, setActiveController] = useState(null);
  
  const fileInputRef = useRef(null);

  // Sync state with incoming subtitleUrl from DB
  useEffect(() => {
    if (subtitleUrl) {
      setUploadState('success');
      const basename = subtitleUrl.split('/').pop();
      setSubtitleFilename(basename);
    } else {
      if (uploadState === 'success') {
        setUploadState('idle');
        setSubtitleFilename('');
      }
    }
  }, [subtitleUrl]);

  // Sync parent on uploading state changes
  useEffect(() => {
    const isUploadingActive = uploadState === 'uploading';
    if (onUploadingStateChange) {
      onUploadingStateChange(isUploadingActive);
    }
  }, [uploadState]);

  // Clean up uploader on unmount
  useEffect(() => {
    return () => {
      if (activeController) {
        activeController.abort();
      }
    };
  }, [activeController]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = async (file) => {
    if (!file) return;

    if (uploadState === 'uploading') {
      toast.error('An upload is currently in progress.');
      return;
    }

    if (!lessonId) {
      toast.error('Please save or create the lesson before uploading subtitles.');
      return;
    }

    // Validate Extension (.vtt, .srt)
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!['.vtt', '.srt'].includes(ext)) {
      toast.error('Unsupported subtitle format. Supported formats: WebVTT (.vtt) and SubRip (.srt)');
      return;
    }

    // Validate Size (Max 2MB)
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      toast.error('Subtitle file size exceeds the maximum limit of 2MB');
      return;
    }

    await uploadSubtitleFile(file);
  };

  const uploadSubtitleFile = async (file) => {
    setUploadState('uploading');
    setProgress(0);
    setSubtitleFilename(file.name);

    const formData = new FormData();
    formData.append('subtitle', file);

    const controller = new AbortController();
    setActiveController(controller);

    try {
      const response = await apiClient.post(`/lessons/${lessonId}/subtitles`, formData, {
        signal: controller.signal,
        onUploadProgress: (progressEvent) => {
          const percent = Math.min(99, Math.round((progressEvent.loaded * 100) / progressEvent.total));
          setProgress(percent);
        }
      });

      setProgress(100);
      setUploadState('success');
      
      const updatedLesson = response.data.data;
      const finalUrl = updatedLesson?.subtitleUrl || '';
      
      setTimeout(() => {
        onSubtitleChange(finalUrl);
        toast.success(`Subtitle "${file.name}" uploaded successfully!`);
      }, 300);

    } catch (err) {
      if (axios.isCancel(err) || controller.signal.aborted) {
        console.log('[Subtitle] Upload canceled.');
        return;
      }
      console.error('[Subtitle] Upload failed:', err);
      setUploadState('error');
      const errMsg = err.response?.data?.message || 'Subtitle upload failed.';
      toast.error(errMsg);
    }
  };

  const cancelUpload = () => {
    if (activeController) {
      activeController.abort();
      setActiveController(null);
    }
    setUploadState('idle');
    setProgress(0);
    setSubtitleFilename('');
  };

  const removeSubtitle = async () => {
    if (!lessonId) return;

    const toastId = toast.loading('Removing subtitle...');
    try {
      await apiClient.delete(`/lessons/${lessonId}/subtitles`);
      
      setUploadState('idle');
      setProgress(0);
      setSubtitleFilename('');
      onSubtitleChange(null);
      
      toast.success('Subtitle removed successfully!', { id: toastId });
    } catch (err) {
      console.error('[Subtitle] Deletion failed:', err);
      toast.error('Failed to remove subtitle.', { id: toastId });
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return bytes + ' B';
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block font-sans">Lesson Subtitles & Captions</label>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (uploadState === 'idle' || uploadState === 'error') {
            fileInputRef.current?.click();
          }
        }}
        className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all duration-300
          ${uploadState === 'uploading'
            ? 'border-violet-500/30 bg-violet-500/5 cursor-not-allowed'
            : isDragging 
              ? 'border-violet-500 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.15)] cursor-pointer' 
              : 'border-white/10 bg-white/2 hover:border-violet-500/30 cursor-pointer'
          }
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".vtt,.srt"
          disabled={uploadState === 'uploading'}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {/* Uploading State */}
          {uploadState === 'uploading' && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center py-2 animate-pulse w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Loader size={24} className="text-violet-400 animate-spin mb-3" />
              <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest truncate max-w-[200px]">
                Uploading: {subtitleFilename}
              </p>
              <div className="w-full max-w-[200px] bg-white/5 h-1.5 rounded-full overflow-hidden mt-3 mb-2 flex items-center">
                <div 
                  className="h-full bg-violet-500 rounded-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[9px] font-mono text-white/40">{Math.round(progress)}% completed</span>
              
              <button
                onClick={cancelUpload}
                className="mt-4 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 font-bold text-[9px] uppercase tracking-widest transition-all"
              >
                Cancel
              </button>
            </motion.div>
          )}

          {/* Success State */}
          {uploadState === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center py-2 w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <CheckCircle size={28} className="text-emerald-400 mb-2" />
              <p className="text-xs font-bold text-white/80 truncate max-w-[240px]">
                {subtitleFilename}
              </p>
              <p className="text-[9px] text-white/30 font-mono mt-1 mb-4">Captions Loaded</p>
              
              <button
                type="button"
                onClick={removeSubtitle}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
              >
                <Trash2 size={12} />
                Remove Subtitles
              </button>
            </motion.div>
          )}

          {/* Error State */}
          {uploadState === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center py-2"
            >
              <AlertCircle size={24} className="text-red-500 mb-2" />
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Upload Failed</p>
              <p className="text-[9px] text-white/30 mt-1 mb-4">Unsupported format or connection lost.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-white font-bold text-[9px] uppercase tracking-widest transition-all"
                >
                  Browse Again
                </button>
                <button
                  onClick={cancelUpload}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 font-bold text-[9px] uppercase tracking-widest transition-all"
                >
                  Clear
                </button>
              </div>
            </motion.div>
          )}

          {/* Idle State */}
          {uploadState === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center"
            >
              <Subtitles size={24} className="text-white/10 group-hover:text-violet-400/50 transition-colors mb-2" />
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest text-center">Add timed subtitle captions</p>
              <p className="text-[9px] text-white/10 mt-1">VTT, SRT up to 2MB</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
