import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlayCircle, X, Pause, Play, RefreshCw, 
  Upload, Loader, CheckCircle, AlertCircle, Film
} from 'lucide-react';
import toast from 'react-hot-toast';
import { videoService } from '../../services/video.service';
import apiClient from '../../services/api';

export default function VideoUploadZone({ lessonId, videoUrl, onUploadComplete, onUploadingStateChange }) {
  const [isDragging, setIsDragging] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [uploadState, setUploadState] = useState('idle'); // idle, uploading, paused, processing, success, error
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [externalUrl, setExternalUrl] = useState(videoUrl || '');
  const [notifyLearners, setNotifyLearners] = useState(false); // Always start false; DB fetch sets real value
  const [prefLoaded, setPrefLoaded] = useState(false); // Guard against race before DB pref arrives

  const fileInputRef = useRef(null);
  const uploaderRef = useRef(null);
  
  // Sync externalUrl state with props
  useEffect(() => {
    if (videoUrl !== undefined) {
      setExternalUrl(videoUrl);
      if (videoUrl && !videoFile) {
        setUploadState('success');
      }
    }
  }, [videoUrl]);

  // Fetch existing lesson's notification preference from backend on mount/load
  useEffect(() => {
    if (!lessonId) {
      // No lesson yet — default to true (will be sent at upload-init time)
      setPrefLoaded(true);
      setNotifyLearners(true);
      return;
    }
    const fetchLessonPref = async () => {
      try {
        const res = await apiClient.get(`/lessons/${lessonId}`);
        if (res.data && res.data.data) {
          const pref = res.data.data.notifyEnrolledOnReady;
          // Treat undefined/null as true (opt-out model for existing lessons without the field)
          setNotifyLearners(pref === false ? false : true);
        }
      } catch (err) {
        console.error('Failed to fetch lesson notification preference:', err);
        setNotifyLearners(true); // safe fallback on error
      } finally {
        setPrefLoaded(true);
      }
    };
    fetchLessonPref();
  }, [lessonId]);

  // Clean up uploader on unmount
  useEffect(() => {
    return () => {
      if (uploaderRef.current) {
        uploaderRef.current.cancel();
      }
    };
  }, []);

  // Update parent on uploading state changes
  useEffect(() => {
    const isUploadingActive = uploadState === 'uploading' || uploadState === 'processing';
    if (onUploadingStateChange) {
      onUploadingStateChange(isUploadingActive);
    }
  }, [uploadState]);

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
      if (file.type.startsWith('video/') || ['.mp4', '.mov', '.avi'].some(ext => file.name.toLowerCase().endsWith(ext))) {
        handleFileSelect(file);
      } else {
        toast.error('Invalid format. Supported formats: .mp4, .mov, .avi');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;

    if (uploadState === 'uploading' || uploadState === 'processing') {
      toast.error('An upload is currently in progress.');
      return;
    }

    if (!lessonId) {
      toast.error('Save or pre-create the lesson before uploading video.');
      return;
    }

    // Validate File Extension (.mp4, .mov, .avi)
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!['.mp4', '.mov', '.avi'].includes(ext)) {
      toast.error('Invalid format. Supported formats: .mp4, .mov, .avi');
      return;
    }

    // Validate File Size (Max 2GB)
    const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > MAX_SIZE) {
      toast.error('Video file size exceeds the maximum limit of 2GB');
      return;
    }

    setVideoFile(file);
    setUploadState('ready'); // State indicating file is selected and ready for upload parameters check!
    setProgress(0);
    setSpeed(0);
  };

  const startUpload = () => {
    if (!videoFile) return;

    if (uploaderRef.current) {
      uploaderRef.current.cancel();
    }

    // Initialize mock uploader service
    const uploader = videoService.createUploader(videoFile, {
      lessonId,
      notifyLearners,
      onProgress: (p, s) => {
        setProgress(p);
        setSpeed(s);
      },
      onStateChange: (state) => {
        setUploadState(state);
      },
      onSuccess: (result) => {
        setExternalUrl(result.url);
        onUploadComplete(result.url);
        toast.success('Video upload and processing complete!');
      },
      onError: (err) => {
        setUploadState('error');
        const errMsg = err.response?.data?.message || err.message || 'Video upload failed.';
        toast.error(`Video upload failed: ${errMsg}`);
      }
    });

    uploaderRef.current = uploader;
    uploader.start();
  };

  const pauseUpload = () => {
    if (uploaderRef.current) {
      uploaderRef.current.pause();
    }
  };

  const resumeUpload = () => {
    if (uploaderRef.current) {
      uploaderRef.current.resume();
    }
  };

  const cancelUpload = () => {
    if (uploaderRef.current) {
      uploaderRef.current.cancel();
      uploaderRef.current = null;
    }
    setVideoFile(null);
    setUploadState('idle');
    setProgress(0);
    setSpeed(0);
    setExternalUrl('');
    onUploadComplete('');
  };

  const retryUpload = () => {
    if (uploaderRef.current) {
      uploaderRef.current.cancel();
      uploaderRef.current.start();
    }
  };

  const handleExternalUrlChange = (val) => {
    setExternalUrl(val);
    onUploadComplete(val);
  };

  const formatSpeed = (bytesPerSec) => {
    if (bytesPerSec === 0) return '0 MB/s';
    return (bytesPerSec / (1024 * 1024)).toFixed(1) + ' MB/s';
  };

  const formatSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">Lesson Video Source</label>
        
        <div
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (uploadState === 'idle' || uploadState === 'error' || (!videoFile && !externalUrl)) {
              fileInputRef.current?.click();
            }
          }}
          className={`aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center relative group overflow-hidden transition-all duration-300
            ${isDragging 
              ? 'border-violet-500 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.2)]' 
              : 'border-white/10 bg-white/5 hover:border-violet-500/30 cursor-pointer'
            }
          `}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".mp4,.mov,.avi,video/*"
            className="hidden"
          />

          <AnimatePresence mode="wait">
            {/* 1. Uploading / Processing State */}
            {(uploadState === 'uploading' || uploadState === 'processing') && (
              <motion.div
                key="uploading-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#0f172a]/95 flex flex-col items-center justify-center p-8 z-20"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative w-16 h-16 mb-4 flex items-center justify-center shrink-0">
                  {/* Outer Ring - Clockwise */}
                  <div className="absolute inset-0 rounded-full border-2 border-violet-500/10" />
                  <div className="absolute inset-0 rounded-full border-t-2 border-l-2 border-violet-500 animate-spin" />
                  
                  {/* Inner Ring - Counter-Clockwise */}
                  <div className="absolute inset-2.5 rounded-full border-2 border-fuchsia-500/5" />
                  <div className="absolute inset-2.5 rounded-full border-b-2 border-r-2 border-fuchsia-400 opacity-80 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                  
                  {/* Central Film Icon */}
                  <div className="absolute inset-4 flex items-center justify-center text-violet-400/30 animate-pulse">
                    <Film size={16} />
                  </div>
                </div>
                
                <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest animate-pulse mb-2">
                  {uploadState === 'processing' ? 'Processing & Optimizing Video...' : 'Uploading video...'}
                </p>

                {videoFile && (
                  <p className="text-[10px] text-white/70 font-semibold mb-1 max-w-[180px] truncate">{videoFile.name}</p>
                )}

                {(uploadState === 'uploading' || uploadState === 'processing') && (
                  <>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mb-2 max-w-[200px]">
                      <motion.div
                        className={`h-full bg-violet-500 rounded-full ${uploadState === 'processing' ? 'animate-pulse' : ''}`}
                        initial={{ width: 0 }}
                        animate={{ width: uploadState === 'processing' ? '100%' : `${progress}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-white/70 mb-4">
                      {uploadState === 'processing' 
                        ? '100% • Transcoding' 
                        : `${Math.round(progress)}% • ${formatSpeed(speed)}`
                      }
                    </span>
                  </>
                )}

                <div className="flex items-center gap-3">
                  {uploadState === 'uploading' && (
                    <button
                      onClick={pauseUpload}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                      <Pause size={12} />
                      Pause
                    </button>
                  )}
                  <button
                    onClick={cancelUpload}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                  >
                    <X size={12} />
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {/* 2. Paused State */}
            {uploadState === 'paused' && (
              <motion.div
                key="paused-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#0f172a]/95 flex flex-col items-center justify-center p-8 z-20"
                onClick={(e) => e.stopPropagation()}
              >
                <Pause size={36} className="text-amber-500 mb-4 animate-bounce" />
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">Upload Paused</p>
                <p className="text-[10px] text-white/40 font-mono mb-4">{Math.round(progress)}% completed</p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={resumeUpload}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-white font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-violet-600/20"
                  >
                    <Play size={12} />
                    Resume
                  </button>
                  <button
                    onClick={cancelUpload}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                  >
                    <X size={12} />
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {/* 3. Error State */}
            {uploadState === 'error' && (
              <motion.div
                key="error-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#0f172a]/95 flex flex-col items-center justify-center p-8 z-20"
                onClick={(e) => e.stopPropagation()}
              >
                <AlertCircle size={36} className="text-red-500 mb-4" />
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-4">Upload Encountered an Error</p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={retryUpload}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-white font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                  >
                    <RefreshCw size={12} />
                    Retry
                  </button>
                  <button
                    onClick={cancelUpload}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                  >
                    <X size={12} />
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {/* 4. Success State (Video is Ready) */}
            {uploadState === 'success' && externalUrl && (
              <motion.div
                key="success-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-10 keep-white"
                onClick={(e) => e.stopPropagation()}
              >
                <CheckCircle size={44} className="text-emerald-400 mb-3" />
                <p className="text-xs text-white/80 font-bold tracking-wider px-8 text-center max-w-full truncate">
                  {videoFile ? videoFile.name : 'Stream Video Registered'}
                </p>
                <p className="text-[9px] text-white/30 font-mono mt-1 mb-4 w-full text-center truncate px-4">{externalUrl}</p>
                
                <button
                  onClick={cancelUpload}
                  className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 font-bold text-[10px] uppercase tracking-widest transition-all"
                >
                  Remove & Replace
                </button>
              </motion.div>
            )}

            {/* Ready State - Selected file review */}
            {uploadState === 'ready' && videoFile && (
              <motion.div
                key="ready-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#0f172a]/95 flex flex-col items-center justify-center p-3 z-20 text-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Film size={20} className="text-violet-400 animate-pulse" />
                <h4 className="text-[10px] font-bold text-white/60 uppercase tracking-widest leading-none">Video File Selected</h4>
                <p className="text-xs text-white font-bold px-4 w-full text-center truncate leading-tight">{videoFile.name}</p>
                <p className="text-[9px] text-white/40 font-mono leading-none">{formatSize(videoFile.size)}</p>
                
                <div className="flex items-center gap-3 mt-1">
                  <button
                    onClick={startUpload}
                    disabled={!prefLoaded}
                    className={`px-4 py-2 rounded-xl text-white font-bold text-[9px] uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-lg ${
                      prefLoaded
                        ? 'bg-violet-600 hover:bg-violet-500 shadow-violet-600/20 cursor-pointer'
                        : 'bg-violet-600/40 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Upload size={10} />
                    {prefLoaded ? 'Start Video Upload' : 'Loading...'}
                  </button>
                  <button
                    onClick={cancelUpload}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white font-bold text-[9px] uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {/* 5. Idle State (No file, prompt dropzone) */}
            {uploadState === 'idle' && !externalUrl && (
              <motion.div
                key="idle-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center p-8"
              >
                <Film size={40} className="text-white/15 mb-4 group-hover:text-violet-400/30 transition-colors duration-300" />
                <h3 className="text-sm font-bold text-white/60 mb-1 group-hover:text-white transition-colors">Drag & drop lesson video</h3>
                <p className="text-[10px] text-white/30 mb-4">or click to browse from your computer</p>
                <div className="text-[9px] font-bold text-violet-400/40 uppercase tracking-widest bg-violet-500/5 border border-violet-500/10 px-3 py-1 rounded-full">
                  Formats: .mp4, .mov, .avi
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {uploadState !== 'idle' && (
        <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-3xl text-left select-none animate-in fade-in slide-in-from-bottom duration-300">
          <input
            type="checkbox"
            id="notifyLearners"
            checked={notifyLearners}
            onChange={async (e) => {
              const val = e.target.checked;
              setNotifyLearners(val);
              if (lessonId) {
                try {
                  await apiClient.patch(`/lessons/${lessonId}`, { notifyEnrolledOnReady: val });
                } catch (err) {
                  console.error('Failed to sync video notification preference:', err);
                }
              }
            }}
            className="w-5 h-5 rounded accent-violet-500 bg-white/5 border-white/10 focus:ring-0 cursor-pointer flex-shrink-0"
          />
          <label htmlFor="notifyLearners" className="text-xs font-bold text-white/60 hover:text-white cursor-pointer transition-colors leading-relaxed">
            Notify enrolled learners when video is ready
          </label>
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20">
          <PlayCircle size={16} />
        </div>
        <input
          type="text"
          value={externalUrl}
          onChange={(e) => handleExternalUrlChange(e.target.value)}
          placeholder="Or paste an external video URL (e.g. YouTube, Vimeo)..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all font-medium"
        />
      </div>
    </div>
  );
}
