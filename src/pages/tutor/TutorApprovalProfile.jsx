import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { AlertCircle, CheckCircle2, Download, FileText, Loader2, PlayCircle, Trash2, UploadCloud, X } from 'lucide-react';
import apiClient from '../../services/api';
import { useAuth } from '../../context/useAuth';

const aadharAccept = '.pdf,.jpg,.jpeg,.png,.webp';
const videoAccept = '.mp4,.mov,.webm';

const formatFileSize = (bytes = 0) => {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function TutorApprovalProfile() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [bio, setBio] = useState('');
  const [expertiseText, setExpertiseText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [isVideoDragging, setIsVideoDragging] = useState(false);
  const [sampleVideoFile, setSampleVideoFile] = useState(null);
  const [videoUploadState, setVideoUploadState] = useState('idle');
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoSpeed, setVideoSpeed] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const videoInputRef = useRef(null);
  const videoAbortRef = useRef(null);
  const statusTimerRef = useRef(null);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/users/me/tutor-approval');
      const data = response.data?.data || {};
      const approval = data.tutorApproval || {};
      setProfile(approval);
      setBio(data.user?.profile?.bio || '');
      setExpertiseText((approval.expertise || []).join(', '));
      if (data.user) {
        updateUser(data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tutor application.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => () => {
    if (videoAbortRef.current) {
      videoAbortRef.current.abort();
    }
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
    }
  }, []);

  const credentials = profile?.credentials || [];
  const sampleVideo = profile?.sampleVideo || {};
  const isComplete = useMemo(() => bio.trim().length >= 20 && credentials.length > 0 && Boolean(sampleVideo.videoUrl), [bio, credentials.length, sampleVideo.videoUrl]);

  const saveProfile = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const expertise = expertiseText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 10);

      const response = await apiClient.patch('/users/me/tutor-approval', {
        bio,
        expertise
      });
      const data = response.data?.data || {};
      setProfile(data.tutorApproval || {});
      if (data.user) updateUser(data.user);
      setMessage('Profile details saved.');
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile details.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const uploadCredential = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';
    if (selectedFiles.length === 0) return;

    const fileToUpload = selectedFiles[0];

    if (credentials.length > 0) {
      setError('Only one Aadhaar file can be submitted. Remove the current file to upload another.');
      return;
    }

    setUploading('credential');
    setError('');
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('aadhar', fileToUpload);

      const response = await apiClient.post('/users/me/tutor-approval/credentials', formData);
      const data = response.data?.data || {};

      setProfile(data.tutorApproval || {});
      if (data.user) updateUser(data.user);
      setMessage('Aadhaar file uploaded.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload Aadhaar file.');
    } finally {
      setUploading('');
    }
  };

  const removeCredential = async (credentialId) => {
    setUploading(`delete-${credentialId}`);
    setError('');
    setMessage('');
    try {
      const response = await apiClient.delete(`/users/me/tutor-approval/credentials/${credentialId}`);
      const data = response.data?.data || {};
      setProfile(data.tutorApproval || {});
      if (data.user) updateUser(data.user);
      setMessage('Aadhaar file removed.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove Aadhaar file.');
    } finally {
      setUploading('');
    }
  };

  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond) return '0 MB/s';
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const selectSampleVideo = (file) => {
    if (!file) return;

    const ext = `.${file.name.split('.').pop().toLowerCase()}`;
    if (!['.mp4', '.mov', '.webm'].includes(ext)) {
      setError('Sample video must be an MP4, MOV, or WEBM file.');
      return;
    }

    const maxSize = 2 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Sample video must be 2 GB or smaller.');
      return;
    }

    setSampleVideoFile(file);
    setVideoUploadState('ready');
    setVideoProgress(0);
    setVideoSpeed(0);
    setError('');
    setMessage('');
  };

  const handleSampleVideoInput = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    selectSampleVideo(file);
  };

  const pollMuxSampleVideo = (uploadId) => {
    const poll = async () => {
      try {
        const response = await apiClient.get(`/users/me/tutor-approval/sample-video/mux-upload-status/${uploadId}`, {
          params: { _t: Date.now() }
        });
        const data = response.data?.data || {};

        if (data.tutorApproval) {
          setProfile(data.tutorApproval);
        }
        if (data.user) {
          updateUser(data.user);
        }

        if (data.videoUrl || data.playbackId) {
          setVideoUploadState('success');
          setVideoProgress(100);
          setVideoSpeed(0);
          setSampleVideoFile(null);
          setMessage('Sample video uploaded and processed.');
          return;
        }

        if (data.status === 'errored' || data.status === 'failed') {
          setVideoUploadState('error');
          setError('Mux could not process this sample video.');
          return;
        }

        statusTimerRef.current = window.setTimeout(poll, 3000);
      } catch (err) {
        setVideoUploadState('error');
        setError(err.response?.data?.message || 'Failed to check sample video processing status.');
      }
    };

    statusTimerRef.current = window.setTimeout(poll, 1500);
  };

  const startSampleVideoUpload = async () => {
    if (!sampleVideoFile) return;

    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }

    setUploading('video');
    setVideoUploadState('uploading');
    setVideoProgress(0);
    setVideoSpeed(0);
    setError('');
    setMessage('');

    try {
      const initResponse = await apiClient.post('/users/me/tutor-approval/sample-video/mux-upload-init', {
        fileName: sampleVideoFile.name,
        fileSize: sampleVideoFile.size,
        mimeType: sampleVideoFile.type || 'video/mp4'
      });
      const initData = initResponse.data?.data || {};
      if (initData.tutorApproval) {
        setProfile(initData.tutorApproval);
      }
      if (initData.user) {
        updateUser(initData.user);
      }

      const uploadStartedAt = Date.now();
      videoAbortRef.current = new AbortController();

      await axios.put(initData.uploadUrl, sampleVideoFile, {
        headers: {
          'Content-Type': sampleVideoFile.type || 'video/mp4'
        },
        signal: videoAbortRef.current.signal,
        onUploadProgress: (progressEvent) => {
          const loaded = progressEvent.loaded || 0;
          const total = progressEvent.total || sampleVideoFile.size;
          const elapsedSeconds = Math.max((Date.now() - uploadStartedAt) / 1000, 0.1);
          setVideoProgress(Math.min(99, (loaded / total) * 100));
          setVideoSpeed(loaded / elapsedSeconds);
        }
      });

      videoAbortRef.current = null;
      setUploading('');
      setVideoUploadState('processing');
      setVideoProgress(100);
      setVideoSpeed(0);
      pollMuxSampleVideo(initData.uploadId);
    } catch (err) {
      if (axios.isCancel(err) || err.name === 'CanceledError') {
        setVideoUploadState('ready');
      } else {
        setVideoUploadState('error');
        setError(err.response?.data?.message || err.message || 'Sample video upload failed.');
      }
      setUploading('');
      setVideoSpeed(0);
    }
  };

  const cancelSampleVideoUpload = () => {
    if (videoAbortRef.current) {
      videoAbortRef.current.abort();
      videoAbortRef.current = null;
    }
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }
    setUploading('');
    setSampleVideoFile(null);
    setVideoUploadState(sampleVideo.videoUrl ? 'success' : 'idle');
    setVideoProgress(0);
    setVideoSpeed(0);
  };

  const submitForReview = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const saved = await saveProfile();
      if (!saved) return;
      const response = await apiClient.post('/users/me/tutor-approval/resubmit');
      const data = response.data?.data || {};
      if (data.user) updateUser(data.user);
      navigate('/pending-approval', { state: { email: data.user?.email || user?.email } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit application.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="theme-learner dashboard-container mesh-bg flex items-center justify-center p-6">
        <Loader2 size={36} className="animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="theme-learner dashboard-container mesh-bg min-h-screen p-6 overflow-y-auto">
      <div className="glow-blob bg-blue-600 w-[520px] h-[520px] -top-24 -left-24 opacity-20"></div>
      <div className="glow-blob bg-cyan-600 w-[420px] h-[420px] bottom-0 right-0 opacity-10"></div>

      <motion.main
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mx-auto max-w-5xl py-8"
      >
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-300/40 mb-3">Tutor Application</p>
            <h1 className="text-4xl font-bold text-white tracking-tight neon-text">Complete your profile</h1>
          </div>
          <button type="button" onClick={logout} className="self-start rounded-2xl border border-white/10 px-5 py-3 text-xs font-black uppercase tracking-widest text-white/50 hover:text-white">
            Sign out
          </button>
        </div>

        {profile?.rejectionReason && (
          <div className="mb-6 rounded-3xl border border-rose-500/20 bg-rose-500/10 p-5">
            <div className="mb-2 flex items-center gap-2 text-rose-300">
              <AlertCircle size={18} />
              <p className="text-xs font-black uppercase tracking-widest">Review feedback</p>
            </div>
            <p className="text-sm font-medium leading-6 text-rose-100/80">{profile.rejectionReason}</p>
          </div>
        )}

        {message && <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">{message}</div>}
        {error && <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-bold text-rose-300">{error}</div>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="glass-panel rounded-[28px] border border-white/5 p-6 lg:col-span-2">
            <h2 className="mb-5 text-lg font-black text-white">Profile details</h2>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-blue-300/40">Teaching bio</label>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={6}
              maxLength={500}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-medium leading-6 text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
            <label className="mb-2 mt-5 block text-[10px] font-black uppercase tracking-widest text-blue-300/40">Expertise</label>
            <input
              value={expertiseText}
              onChange={(event) => setExpertiseText(event.target.value)}
              placeholder="Mathematics, Physics, Exam prep"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Save details
            </button>
          </section>

          <aside className="glass-panel rounded-[28px] border border-white/5 p-6">
            <h2 className="mb-5 text-lg font-black text-white">Review checklist</h2>
            {[
              ['Bio', bio.trim().length >= 20],
              ['Aadhaar file', credentials.length > 0],
              ['Sample video', Boolean(sampleVideo.videoUrl)]
            ].map(([label, done]) => (
              <div key={label} className="mb-4 flex items-center gap-3">
                <CheckCircle2 size={18} className={done ? 'text-emerald-400' : 'text-white/15'} />
                <span className={done ? 'text-sm font-bold text-white' : 'text-sm font-bold text-white/35'}>{label}</span>
              </div>
            ))}
            <button
              type="button"
              onClick={submitForReview}
              disabled={!isComplete || saving || uploading}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit for review
            </button>
            <Link to="/pending-approval" className="mt-4 block text-center text-xs font-black uppercase tracking-widest text-blue-300/40 hover:text-blue-300">
              Back to status
            </Link>
          </aside>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="glass-panel rounded-[28px] border border-white/5 p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-lg font-black text-white">Aadhaar</h2>
              <label className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest ${credentials.length >= 1 ? 'bg-white/5 text-white/20' : 'bg-white/10 text-white hover:bg-white/15'}`}>
                {uploading === 'credential' ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                Upload
                <input type="file" accept={aadharAccept} onChange={uploadCredential} disabled={credentials.length >= 1 || uploading === 'credential'} className="hidden" />
              </label>
            </div>
            <div className="space-y-3">
              {credentials.length > 0 ? credentials.map((file) => (
                <div key={file._id} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                  <FileText size={20} className="shrink-0 text-emerald-300" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{file.title}</p>
                    <p className="text-[10px] font-bold text-white/30">{formatFileSize(file.size)}</p>
                  </div>
                  <a href={file.fileUrl} target="_blank" rel="noreferrer" className="p-2 text-white/40 hover:text-white">
                    <Download size={16} />
                  </a>
                  <button type="button" onClick={() => removeCredential(file._id)} disabled={uploading === `delete-${file._id}`} className="p-2 text-rose-300 hover:text-rose-200 disabled:opacity-40">
                    {uploading === `delete-${file._id}` ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm font-bold text-white/30">
                  Upload one Aadhaar file as PDF, JPG, PNG, or WEBP.
                </div>
              )}
            </div>
          </section>

          <section className="glass-panel rounded-[28px] border border-white/5 p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-lg font-black text-white">Sample video</h2>
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={uploading === 'video' || videoUploadState === 'processing'}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-white/15 disabled:opacity-40"
              >
                <UploadCloud size={14} />
                Select
              </button>
            </div>
            <input
              ref={videoInputRef}
              type="file"
              accept={videoAccept}
              onChange={handleSampleVideoInput}
              className="hidden"
            />

            {videoUploadState === 'uploading' || videoUploadState === 'processing' ? (
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">{sampleVideoFile?.name || sampleVideo.title || 'Sample video'}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-blue-200/50">
                      {videoUploadState === 'processing' ? 'Processing on Mux' : `${Math.round(videoProgress)}% uploaded - ${formatSpeed(videoSpeed)}`}
                    </p>
                  </div>
                  <button type="button" onClick={cancelSampleVideoUpload} className="p-2 text-white/40 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all" style={{ width: `${Math.max(4, videoProgress)}%` }} />
                </div>
                {videoUploadState === 'processing' && (
                  <div className="mt-4 flex items-center gap-2 text-xs font-bold text-blue-100/60">
                    <Loader2 size={14} className="animate-spin" />
                    Waiting for playback to become ready
                  </div>
                )}
              </div>
            ) : sampleVideoFile ? (
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                <div className="flex items-center gap-3">
                  <PlayCircle size={20} className="shrink-0 text-sky-300" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{sampleVideoFile.name}</p>
                    <p className="text-[10px] font-bold text-white/30">{formatFileSize(sampleVideoFile.size)}</p>
                  </div>
                  <button type="button" onClick={startSampleVideoUpload} className="inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-4 py-3 text-xs font-black uppercase tracking-widest text-white">
                    <UploadCloud size={14} />
                    Upload
                  </button>
                  <button type="button" onClick={cancelSampleVideoUpload} className="p-2 text-white/40 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
              </div>
            ) : sampleVideo.videoUrl ? (
              <div className="space-y-4">
                <video src={sampleVideo.videoUrl} controls className="max-h-80 w-full rounded-2xl border border-white/10 bg-black" />
                <div className="flex items-center gap-3 text-sm font-bold text-white">
                  <PlayCircle size={18} className="text-sky-300" />
                  <span className="min-w-0 flex-1 truncate">{sampleVideo.title || 'Sample video'}</span>
                  <span className="text-[10px] text-white/30">{formatFileSize(sampleVideo.size)}</span>
                </div>
              </div>
            ) : (
              <div
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsVideoDragging(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsVideoDragging(true);
                }}
                onDragLeave={() => setIsVideoDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsVideoDragging(false);
                  selectSampleVideo(event.dataTransfer.files?.[0]);
                }}
                onClick={() => videoInputRef.current?.click()}
                className={`rounded-2xl border border-dashed p-8 text-center text-sm font-bold transition-all cursor-pointer ${
                  isVideoDragging ? 'border-blue-400 bg-blue-500/10 text-blue-200' : 'border-white/10 text-white/30 hover:border-blue-400/50 hover:bg-white/[0.03]'
                }`}
              >
                <PlayCircle size={30} className="mx-auto mb-3 text-white/20" />
                <p>Drag & drop sample video</p>
                <p className="mt-1 text-xs text-white/25">or click to browse from your computer</p>
                <p className="mt-4 inline-flex rounded-full bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/35">
                  MP4, MOV, or WEBM
                </p>
              </div>
            )}
          </section>
        </div>
      </motion.main>
    </div>
  );
}
