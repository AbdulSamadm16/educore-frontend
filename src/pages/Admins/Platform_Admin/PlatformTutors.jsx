import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {AlertCircle,BookOpen,CheckCircle2,Clock,Download,Eye,FileText,GraduationCap,Loader2,Mail,PlayCircle,RefreshCw,Search,ShieldOff,UserCheck,X,XCircle} from 'lucide-react';
import apiClient from '../../../services/api';

const tabs = [
  { key: 'pending', label: 'Pending', status: 'pending_approval' },
  { key: 'approved', label: 'Approved', status: 'active' }
];

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getInitials = (name = 'Tutor') => name
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase() || 'T';

const normalizeTutor = (tutor) => ({
  ...tutor,
  id: tutor.id || tutor._id,
  name: tutor.name || `${tutor.firstName || ''} ${tutor.lastName || ''}`.trim() || 'Unnamed Tutor',
  bio: tutor.profile?.bio || '',
  tutorApproval: tutor.profile?.tutorApproval || {}
});

const formatFileSize = (bytes = 0) => {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function PlatformTutors() {
  const [activeTab, setActiveTab] = useState('pending');
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [sampleCourses, setSampleCourses] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rejectTutor, setRejectTutor] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const activeStatus = tabs.find((tab) => tab.key === activeTab)?.status || 'pending_approval';

  const fetchTutors = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admin/users', {
        params: {
          role: 'tutor',
          status: activeStatus,
          search: searchQuery || undefined,
          limit: 100
        }
      });
      const users = response.data?.data?.users || [];
      setTutors(users.map(normalizeTutor));
      setError('');
    } catch (err) {
      console.error('Error fetching tutors:', err);
      setError('Failed to load tutors.');
    } finally {
      setLoading(false);
    }
  }, [activeStatus, searchQuery]);

  useEffect(() => {
    const timer = window.setTimeout(fetchTutors, searchQuery ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [fetchTutors, searchQuery]);

  const stats = useMemo(() => ({
    pending: activeTab === 'pending' ? tutors.length : null,
    approved: activeTab === 'approved' ? tutors.length : null
  }), [activeTab, tutors.length]);

  const openTutorDetails = async (tutor) => {
    setSelectedTutor(tutor);
    setSampleCourses([]);
    setDetailLoading(true);
    try {
      const response = await apiClient.get('/courses/admin/all', {
        params: {
          tutorId: tutor.id,
          limit: 5
        }
      });
      setSampleCourses(response.data?.data?.courses || []);
    } catch (err) {
      console.error('Failed to load tutor courses:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const approveTutor = async (tutor) => {
    setActionLoading(`approve-${tutor.id}`);
    try {
      await apiClient.patch(`/admin/users/${tutor.id}/approve-tutor`);
      await fetchTutors();
      if (selectedTutor?.id === tutor.id) {
        setSelectedTutor(null);
      }
    } catch (err) {
      console.error('Failed to approve tutor:', err);
      setError(err.response?.data?.message || 'Failed to approve tutor.');
    } finally {
      setActionLoading('');
    }
  };

  const submitReject = async () => {
    if (!rejectTutor) return;
    setActionLoading(`reject-${rejectTutor.id}`);
    try {
      await apiClient.patch(`/admin/users/${rejectTutor.id}/reject-tutor`, {
        reason: rejectReason.trim()
      });
      setRejectTutor(null);
      setRejectReason('');
      setSelectedTutor(null);
      await fetchTutors();
    } catch (err) {
      console.error('Failed to reject tutor:', err);
      setError(err.response?.data?.message || 'Failed to reject tutor.');
    } finally {
      setActionLoading('');
    }
  };

  const revokeTutor = async (tutor) => {
    setActionLoading(`revoke-${tutor.id}`);
    try {
      await apiClient.patch(`/admin/users/${tutor.id}/suspend`, {
        suspended: true,
        reason: 'Tutor approval revoked by platform admin'
      });
      setSelectedTutor(null);
      await fetchTutors();
    } catch (err) {
      console.error('Failed to revoke tutor approval:', err);
      setError(err.response?.data?.message || 'Failed to revoke tutor approval.');
    } finally {
      setActionLoading('');
    }
  };

  const renderStatus = (status) => {
    const isApproved = status === 'active';
    const isPending = status === 'pending_approval';
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
        isApproved ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
        isPending ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
        'bg-rose-500/10 text-rose-400 border-rose-500/20'
      }`}>
        {isApproved ? <CheckCircle2 size={10} /> : isPending ? <Clock size={10} /> : <XCircle size={10} />}
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-5">

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex rounded-2xl bg-white/5 border border-white/10 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.key ? 'bg-amber-500 text-black' : 'text-white/40 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-amber-400 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search tutors..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all w-full sm:w-72"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-200 flex items-center justify-between gap-4">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="text-red-200/60 hover:text-red-100">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="glass-card rounded-[28px] p-6 border border-white/5">
          <div className="p-3 rounded-2xl w-fit border mb-5 text-amber-400 bg-amber-500/10 border-amber-500/20">
            <Clock size={24} />
          </div>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] mb-2">Pending Queue</p>
          <h3 className="text-2xl font-bold text-white tracking-tight">{stats.pending ?? 'View Tab'}</h3>
        </div>
        <div className="glass-card rounded-[28px] p-6 border border-white/5">
          <div className="p-3 rounded-2xl w-fit border mb-5 text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
            <UserCheck size={24} />
          </div>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] mb-2">Approved Tutors</p>
          <h3 className="text-2xl font-bold text-white tracking-tight">{stats.approved ?? 'View Tab'}</h3>
        </div>
        <div className="glass-card rounded-[28px] p-6 border border-white/5">
          <div className="p-3 rounded-2xl w-fit border mb-5 text-blue-400 bg-blue-500/10 border-blue-500/20">
            <BookOpen size={24} />
          </div>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] mb-2">Review Flow</p>
          <h3 className="text-2xl font-bold text-white tracking-tight">Profile + Courses</h3>
        </div>
      </div>

      <div className="glass-card rounded-[32px] border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-5 text-[10px] font-bold text-white/30 uppercase tracking-widest">Tutor Details</th>
                <th className="px-6 py-5 text-[10px] font-bold text-white/30 uppercase tracking-widest">Aadhaar</th>
                <th className="px-6 py-5 text-[10px] font-bold text-white/30 uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-[10px] font-bold text-white/30 uppercase tracking-widest">Joined</th>
                <th className="px-6 py-5 text-[10px] font-bold text-white/30 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [...Array(5)].map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-10 w-52 bg-white/5 rounded-lg" /></td>
                    <td className="px-6 py-5"><div className="h-6 w-36 bg-white/5 rounded-lg" /></td>
                    <td className="px-6 py-5"><div className="h-6 w-24 bg-white/5 rounded-lg" /></td>
                    <td className="px-6 py-5"><div className="h-6 w-24 bg-white/5 rounded-lg" /></td>
                    <td className="px-6 py-5"><div className="h-8 w-28 bg-white/5 rounded-lg ml-auto" /></td>
                  </tr>
                ))
              ) : tutors.length > 0 ? (
                tutors.map((tutor) => (
                  <tr key={tutor.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black">
                          {getInitials(tutor.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{tutor.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-white/40">
                            <Mail size={10} />
                            <span className="truncate">{tutor.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs text-white/70 font-medium">
                        {(tutor.tutorApproval?.credentials?.length || 0) > 0 ? 'Aadhaar submitted' : 'No Aadhaar submitted'}
                      </p>
                      <p className="text-[10px] text-white/30">{tutor.accountType?.replace('_', ' ') || 'Tutor account'}</p>
                    </td>
                    <td className="px-6 py-5">{renderStatus(tutor.status)}</td>
                    <td className="px-6 py-5">
                      <p className="text-xs text-white/40">{formatDate(tutor.createdAt)}</p>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openTutorDetails(tutor)}
                          className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          title="View profile"
                        >
                          <Eye size={18} />
                        </button>
                        {activeTab === 'pending' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => approveTutor(tutor)}
                              disabled={actionLoading === `approve-${tutor.id}`}
                              className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-50"
                              title="Approve"
                            >
                              {actionLoading === `approve-${tutor.id}` ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectTutor(tutor)}
                              className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <XCircle size={18} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => revokeTutor(tutor)}
                            disabled={actionLoading === `revoke-${tutor.id}`}
                            className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Revoke approval"
                          >
                            {actionLoading === `revoke-${tutor.id}` ? <Loader2 size={18} className="animate-spin" /> : <ShieldOff size={18} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 rounded-full bg-white/5 text-white/10">
                        <UserCheck size={40} />
                      </div>
                      <p className="text-sm text-white/20 font-medium">
                        {activeTab === 'pending' ? 'No pending tutor applications found' : 'No approved tutors found'}
                      </p>
                      <button
                        type="button"
                        onClick={fetchTutors}
                        className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300"
                      >
                        <RefreshCw size={14} />
                        Refresh
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedTutor && (
          <div className="fixed inset-0 z-[240] bg-black/70 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card rounded-[36px] p-8 w-full max-w-5xl max-h-[88vh] overflow-y-auto custom-scrollbar border border-white/10 relative"
            >
              <button
                type="button"
                onClick={() => setSelectedTutor(null)}
                className="absolute top-7 right-7 p-2 text-white/30 hover:text-white transition-colors"
              >
                <X size={26} />
              </button>

              <div className="pr-12 mb-8">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-400 mb-2">Tutor Profile</p>
                <h3 className="text-3xl font-bold text-white tracking-tight">{selectedTutor.name}</h3>
                <p className="text-sm text-white/40 font-semibold mt-1">{selectedTutor.email}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[
                  ['Status', selectedTutor.status?.replace('_', ' ')],
                  ['Account Type', selectedTutor.accountType?.replace('_', ' ') || 'Tutor'],
                  ['Joined', formatDate(selectedTutor.createdAt)],
                  ['Last Login', formatDate(selectedTutor.lastLoginAt)]
                ].map(([label, value]) => (
                  <div key={label} className="glass-panel rounded-2xl border border-white/5 p-4">
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-white text-sm font-bold capitalize">{value || 'N/A'}</p>
                  </div>
                ))}
              </div>

              {selectedTutor.tutorApproval?.rejectionReason && (
                <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-300 mb-1">Previous Rejection Reason</p>
                  <p className="text-sm text-rose-100/80">{selectedTutor.tutorApproval.rejectionReason}</p>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <section className="glass-panel rounded-[28px] border border-white/5 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <GraduationCap size={20} className="text-amber-400" />
                    <h4 className="text-white font-black">Tutor Profile</h4>
                  </div>
                  {selectedTutor.bio ? (
                    <div className="space-y-4">
                      <p className="text-sm text-white/60 leading-6">{selectedTutor.bio}</p>
                      {selectedTutor.tutorApproval?.expertise?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedTutor.tutorApproval.expertise.map((item) => (
                            <span key={item} className="rounded-full bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-300">
                              {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <AlertCircle size={30} className="text-white/10 mx-auto mb-3" />
                      <p className="text-sm text-white/30 font-bold">No tutor bio has been submitted yet.</p>
                    </div>
                  )}
                </section>

                <section className="xl:col-span-2 glass-panel rounded-[28px] border border-white/5 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText size={20} className="text-emerald-400" />
                    <h4 className="text-white font-black">Submitted Aadhaar</h4>
                  </div>
                  {selectedTutor.tutorApproval?.credentials?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedTutor.tutorApproval.credentials.map((file) => (
                        <a
                          key={file._id || file.fileUrl}
                          href={file.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex items-center gap-3 hover:bg-white/[0.06] transition-colors"
                        >
                          <FileText size={20} className="text-emerald-300 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-white truncate">{file.title || 'Aadhaar file'}</span>
                            <span className="block text-[10px] text-white/35">{formatFileSize(file.size)}</span>
                          </span>
                          <Download size={16} className="text-white/35 shrink-0" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <AlertCircle size={30} className="text-white/10 mx-auto mb-3" />
                      <p className="text-sm text-white/30 font-bold">No Aadhaar submitted.</p>
                    </div>
                  )}
                </section>
              </div>

              <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
                <section className="xl:col-span-2 glass-panel rounded-[28px] border border-white/5 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <PlayCircle size={20} className="text-sky-400" />
                    <h4 className="text-white font-black">Sample Video</h4>
                  </div>
                  {selectedTutor.tutorApproval?.sampleVideo?.videoUrl ? (
                    <div className="space-y-4">
                      <video
                        src={selectedTutor.tutorApproval.sampleVideo.videoUrl}
                        controls
                        className="w-full max-h-80 rounded-2xl bg-black border border-white/10"
                      />
                      <a
                        href={selectedTutor.tutorApproval.sampleVideo.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-sky-300 hover:text-sky-200"
                      >
                        <PlayCircle size={14} />
                        Open sample video
                      </a>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <PlayCircle size={30} className="text-white/10 mx-auto mb-3" />
                      <p className="text-sm text-white/30 font-bold">No sample video submitted.</p>
                    </div>
                  )}
                </section>

                <section className="glass-panel rounded-[28px] border border-white/5 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <BookOpen size={20} className="text-amber-400" />
                    <h4 className="text-white font-black">Authored Courses</h4>
                  </div>
                  {detailLoading ? (
                    <div className="py-16 flex items-center justify-center text-white/30">
                      <Loader2 size={24} className="animate-spin" />
                    </div>
                  ) : sampleCourses.length > 0 ? (
                    <div className="space-y-3">
                      {sampleCourses.map((course) => (
                        <div key={course._id || course.id} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-white text-sm font-bold truncate">{course.title || 'Untitled course'}</p>
                            <p className="text-xs text-white/35 truncate">{course.shortDescription || 'No description'}</p>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 shrink-0">
                            {course.status?.replace('_', ' ') || 'draft'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <BookOpen size={30} className="text-white/10 mx-auto mb-3" />
                      <p className="text-sm text-white/30 font-bold">No authored courses found.</p>
                    </div>
                  )}
                </section>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3">
                {selectedTutor.status === 'pending_approval' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setRejectTutor(selectedTutor)}
                      className="px-6 py-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-all text-xs font-black uppercase tracking-widest"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => approveTutor(selectedTutor)}
                      className="px-6 py-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-all text-xs font-black uppercase tracking-widest"
                    >
                      Approve
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => revokeTutor(selectedTutor)}
                    className="px-6 py-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-all text-xs font-black uppercase tracking-widest"
                  >
                    Revoke Approval
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rejectTutor && (
          <div className="fixed inset-0 z-[260] bg-black/70 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card rounded-[32px] p-7 w-full max-w-lg border border-white/10"
            >
              <h3 className="text-2xl font-bold text-white tracking-tight mb-2">Reject Tutor</h3>
              <p className="text-sm text-white/40 mb-5">
                The tutor will be notified by email with this reason.
              </p>
              <textarea
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Reason for rejection..."
                rows={5}
                className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-rose-500/30 resize-none"
              />
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRejectTutor(null);
                    setRejectReason('');
                  }}
                  className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all text-xs font-black uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitReject}
                  disabled={actionLoading === `reject-${rejectTutor.id}`}
                  className="px-5 py-3 rounded-2xl bg-rose-500 text-white hover:bg-rose-400 transition-all text-xs font-black uppercase tracking-widest disabled:opacity-50"
                >
                  {actionLoading === `reject-${rejectTutor.id}` ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
