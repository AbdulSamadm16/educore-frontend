import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X, Check, Loader, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import apiClient from '../../services/api';
import { API_BASE_URL } from '../../services/api';

export default function AttachmentUploadZone({ lessonId, attachments = [], onAttachmentsChange, onUploadingStateChange }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState([]); // { id, name, size, progress, state: 'uploading'|'success', controller }
  const fileInputRef = useRef(null);

  // Sync parent when upload state changes
  useEffect(() => {
    const isUploadingActive = uploadingFiles.some(f => f.state === 'uploading');
    if (onUploadingStateChange) {
      onUploadingStateChange(isUploadingActive);
    }
  }, [uploadingFiles]);

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
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (files) => {
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    const totalCurrentCount = attachments.length + uploadingFiles.filter(f => f.state === 'uploading').length;

    if (totalCurrentCount + files.length > 5) {
      toast.error('You can only attach up to 5 supplemental documents in total.');
      files = files.slice(0, 5 - totalCurrentCount);
    }

    if (files.length === 0) return;

    if (!lessonId) {
      toast.error('Save or pre-create the lesson before uploading attachments.');
      return;
    }

    for (const file of files) {
      const extension = '.' + file.name.split('.').pop().toLowerCase();
      if (!allowedExtensions.includes(extension)) {
        toast.error(`"${file.name}" rejected: Only PDF, DOC, and DOCX are allowed.`);
        continue;
      }

      if (file.size > maxFileSize) {
        toast.error(`"${file.name}" rejected: Exceeds 50MB size limit.`);
        continue;
      }

      await startRealUpload(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startRealUpload = async (file) => {
    const fileId = Math.random().toString(36).substr(2, 9);
    const newFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      progress: 0,
      state: 'uploading'
    };

    setUploadingFiles(prev => [...prev, newFile]);

    const formData = new FormData();
    formData.append('attachment', file);

    const controller = new AbortController();
    
    // Associate abort controller with the state file
    setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, controller } : f));

    try {
      const response = await apiClient.post(`/lessons/${lessonId}/attachments`, formData, {
        signal: controller.signal,
        onUploadProgress: (progressEvent) => {
          const percent = Math.min(99, Math.round((progressEvent.loaded * 100) / progressEvent.total));
          setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: percent } : f));
        }
      });

      // Complete upload
      setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: 100, state: 'success' } : f));
      
      const updatedAttachments = response.data.data || [];
      
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
        onAttachmentsChange(updatedAttachments);
        toast.success(`"${file.name}" uploaded successfully!`);
      }, 300);

    } catch (err) {
      if (axios.isCancel(err) || controller.signal.aborted) {
        console.log('[Attachment] Upload canceled.');
        return;
      }
      console.error('[Attachment] Upload failed:', err);
      setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
      toast.error(`"${file.name}" upload failed.`);
    }
  };

  const cancelUploadingFile = (id, filename) => {
    const target = uploadingFiles.find(f => f.id === id);
    if (target && target.controller) {
      target.controller.abort();
    }
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
    toast.error(`"${filename}" upload canceled.`);
  };

  const deleteAttachment = async (idx, file) => {
    const attachmentId = file._id || file.id;
    if (!attachmentId) {
      const updated = attachments.filter((_, i) => i !== idx);
      onAttachmentsChange(updated);
      toast.success(`Removed "${file.title}".`);
      return;
    }

    try {
      const response = await apiClient.delete(`/lessons/${lessonId}/attachments/${attachmentId}`);
      const updatedAttachments = response.data.data || [];
      onAttachmentsChange(updatedAttachments);
      toast.success(`Removed "${file.title}".`);
    } catch (err) {
      console.error('[Attachment] Deletion failed:', err);
      toast.error(`Failed to delete "${file.title}".`);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const resolveFileUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    // API_BASE_URL includes /api/v1 - strip that to get root origin
    const apiRoot = API_BASE_URL.replace(/\/api(\/.*)?$/, '').replace(/\/$/, '');
    return `${apiRoot}${url.startsWith('/') ? url : '/' + url}`;
  };

  const activeUploads = uploadingFiles.filter(f => f.state === 'uploading');
  const hasActiveUploads = activeUploads.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block font-sans">Supplemental Documents</label>
        <span className="text-[10px] font-bold text-white/20 bg-[#0f172a] px-2.5 py-1 rounded-full border border-white/5">
          {attachments.length + uploadingFiles.filter(f => f.state === 'uploading').length} / 5
        </span>
      </div>

      {attachments.length + uploadingFiles.filter(f => f.state === 'uploading').length < 5 && (
        <div
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!hasActiveUploads) {
              fileInputRef.current?.click();
            }
          }}
          className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-all duration-300
            ${hasActiveUploads
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
            multiple
            accept=".pdf,.doc,.docx"
            disabled={hasActiveUploads}
            className="hidden"
          />
          {hasActiveUploads ? (
            <div className="flex flex-col items-center text-center py-2 animate-pulse">
              <Loader size={24} className="text-violet-400 animate-spin mb-3" />
              <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">
                Uploading {activeUploads.length} Document{activeUploads.length > 1 ? 's' : ''}...
              </p>
              <p className="text-[9px] text-white/30 mt-1">Please wait for completion</p>
            </div>
          ) : (
            <>
              <FileText size={24} className="text-white/10 group-hover:text-violet-400/50 transition-colors mb-2" />
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest text-center">Add setup files or worksheets</p>
              <p className="text-[9px] text-white/10 mt-1">PDF, DOC, DOCX up to 50MB</p>
            </>
          )}
        </div>
      )}

      {/* Uploading Queue */}
      <AnimatePresence>
        {uploadingFiles.length > 0 && (
          <div className="space-y-2">
            {uploadingFiles.map(file => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-3 bg-violet-950/20 border border-violet-500/20 rounded-xl space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Loader size={12} className="text-violet-400 animate-spin shrink-0" />
                    <span className="text-xs font-bold text-violet-300 truncate max-w-[150px]">{file.name}</span>
                    <span className="text-[9px] font-mono text-white/30 shrink-0">({formatSize(file.size)})</span>
                  </div>
                  <button
                    onClick={() => cancelUploadingFile(file.id, file.name)}
                    className="p-1 rounded-md text-white/20 hover:text-red-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-violet-500 rounded-full transition-all duration-150"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono font-bold text-violet-400">{Math.round(file.progress)}%</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Completed Attachments Queue */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
            {attachments.map((file, idx) => (
              <motion.div
                key={`${file.title}-${idx}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, padding: 0, marginBottom: 0 }}
                className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl group hover:border-violet-500/20 transition-all duration-300"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText size={16} className="text-violet-400 shrink-0" />
                  {file.fileUrl ? (
                    <a
                      href={resolveFileUrl(file.fileUrl)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-xs font-bold text-white/60 truncate group-hover:text-white transition-colors"
                    >
                      {file.title}
                    </a>
                  ) : (
                    <span className="text-xs font-bold text-white/60 truncate group-hover:text-white transition-colors">
                      {file.title}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => deleteAttachment(idx, file)}
                  className="p-1 rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Remove resource"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
