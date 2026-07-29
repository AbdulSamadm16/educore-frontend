import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Flag,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import MarkdownRenderer from '../../../components/discussion/MarkdownRenderer';
import discussionService, { REDACTED_BY_MODERATOR } from '../../../services/discussion.service';

const reasonLabels = {
  spam: 'Spam',
  abuse: 'Abuse',
  harassment: 'Harassment',
  inappropriate: 'Inappropriate',
  other: 'Other'
};

const formatDate = (dateString) => {
  if (!dateString) return '';

  return new Date(dateString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const StatusPill = ({ children, tone = 'amber' }) => {
  const tones = {
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    red: 'bg-red-500/10 text-red-300 border-red-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    violet: 'bg-violet-500/10 text-violet-300 border-violet-500/20'
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${tones[tone]}`}>
      {children}
    </span>
  );
};

const DiscussionModeration = () => {
  const [activeTab, setActiveTab] = useState('flagged');
  const [queuePosts, setQueuePosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [notes, setNotes] = useState({});

  // Appeals state
  const [appeals, setAppeals] = useState([]);
  const [appealsLoading, setAppealsLoading] = useState(false);
  const [appealsPage, setAppealsPage] = useState(1);
  const [appealsPages, setAppealsPages] = useState(1);
  const [appealsWorkingId, setAppealsWorkingId] = useState('');
  const [appealNotes, setAppealNotes] = useState({});

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await discussionService.getModerationQueue();
      setQueuePosts(response.data.posts || []);
    } catch (err) {
      console.error('Failed to load discussion reports:', err);
      toast.error('Could not load moderation queue.');
    } finally {
      setLoading(false);
    }
  };

  const loadAppeals = async (page = 1) => {
    try {
      setAppealsLoading(true);
      const response = await discussionService.getPendingUnbanRequests({ page, limit: 10 });
      setAppeals(response.data.requests || []);
      setAppealsPage(response.data.pagination?.page || 1);
      setAppealsPages(response.data.pagination?.pages || 1);
    } catch (err) {
      console.error('Failed to load unban appeals:', err);
      toast.error('Could not load unban appeals.');
    } finally {
      setAppealsLoading(false);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'appeals') {
      loadAppeals(appealsPage);
    } else {
      loadReports();
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      if (activeTab === 'appeals') {
        loadAppeals(1);
      } else {
        loadReports();
      }
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [activeTab]);

  const updateNote = (postId, value) => {
    setNotes((current) => ({
      ...current,
      [postId]: value
    }));
  };

  const updateAppealNote = (requestId, value) => {
    setAppealNotes((current) => ({
      ...current,
      [requestId]: value
    }));
  };

  const getNote = (postId, fallback) => notes[postId]?.trim() || fallback;

  const runAction = async (post, action) => {
    const postId = post.id;
    const authorId = post.author?.id;

    try {
      setWorkingId(`${postId}-${action}`);

      if (action === 'remove') {
        await discussionService.removePost({
          postId,
          reason: getNote(postId, 'Removed after moderation review')
        });
        toast.success('Post removed.');
      }

      if (action === 'dismiss') {
        await discussionService.dismissReports({ postId });
        toast.success('Reports dismissed.');
      }

      if (action === 'warn') {
        if (!authorId) throw new Error('Author not found');
        await discussionService.warnUser({
          userId: authorId,
          reason: getNote(postId, 'Discussion warning issued'),
          postContent: post.content
        });
        toast.success('Warning recorded.');
      }

      if (action === 'ban') {
        if (!authorId) throw new Error('Author not found');
        await discussionService.banUserFromDiscussions({
          userId: authorId,
          isBanned: true
        });
        toast.success('User banned from discussions.');
      }

      await loadReports();
    } catch (err) {
      console.error(`Moderation action failed: ${action}`, err);
      toast.error(err.response?.data?.message || 'Action failed.');
    } finally {
      setWorkingId('');
    }
  };

  const runResolveAction = async (appeal, status) => {
    const requestId = appeal._id || appeal.id;
    const adminNotes = appealNotes[requestId]?.trim() || '';

    try {
      setAppealsWorkingId(`${requestId}-${status}`);
      await discussionService.resolveUnbanRequest({
        requestId,
        status,
        adminNotes
      });
      toast.success(
        status === 'approved'
          ? 'User has been unbanned successfully.'
          : 'Appeal has been rejected.'
      );
      await loadAppeals(appealsPage);
    } catch (err) {
      console.error(`Failed to resolve unban appeal ${requestId} as ${status}:`, err);
      toast.error(err.response?.data?.message || 'Resolution failed.');
    } finally {
      setAppealsWorkingId('');
    }
  };

  const pendingCount = queuePosts.length;
  const pendingAppealsCount = appeals.length;

  return (
    <div className="h-full overflow-y-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Tabs & Refresh Action */}
      <div className="mb-8 flex flex-wrap items-center justify-between border-b border-white/5 pb-px gap-4">
        <div className="flex gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('flagged')}
            className={`relative pb-4 text-sm font-black uppercase tracking-wider transition-colors ${
              activeTab === 'flagged' ? 'text-emerald-400' : 'text-white/40 hover:text-white/70'
            }`}
          >
            Flagged Content
            {activeTab === 'flagged' && (
              <motion.div
                layoutId="moderationActiveTabLine"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400"
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('appeals')}
            className={`relative pb-4 text-sm font-black uppercase tracking-wider transition-colors ${
              activeTab === 'appeals' ? 'text-emerald-400' : 'text-white/40 hover:text-white/70'
            }`}
          >
            Unban Appeals
            {activeTab === 'appeals' && (
              <motion.div
                layoutId="moderationActiveTabLine"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400"
              />
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="mb-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-wider text-white/60 transition hover:border-emerald-500/40 hover:text-emerald-300"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {activeTab === 'flagged' ? (
        loading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-white/5 bg-white/[0.03]">
            <Loader2 size={34} className="animate-spin text-emerald-400" />
          </div>
        ) : queuePosts.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[28px] border border-white/5 bg-white/[0.03] p-10 text-center">
            <ShieldAlert size={44} className="mb-4 text-emerald-300" />
            <h3 className="text-xl font-black text-white">Queue Clear</h3>
            <p className="mt-2 max-w-md text-sm font-medium text-white/35">
              Reported discussion posts will appear here when learners or tutors flag them.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
            {queuePosts.map((post) => {
              const authorName = post.author?.name || 'Unknown author';
              const isRemoved = post.isRemoved || post.content === REDACTED_BY_MODERATOR;
              const reports = post.reports || [];

              return (
                <article
                  key={post.id}
                  className="rounded-[28px] border border-white/5 bg-white/[0.03] p-6 shadow-2xl shadow-black/10"
                >
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <StatusPill tone="amber">
                          <Flag size={12} />
                          {reports.length} {reports.length === 1 ? 'Report' : 'Reports'}
                        </StatusPill>
                        {post.author?.role === 'tutor' && (
                          <StatusPill tone="violet">
                            <MessageSquare size={12} />
                            Tutor Post
                          </StatusPill>
                        )}
                        {isRemoved && (
                          <StatusPill tone="red">
                            <Trash2 size={12} />
                            Removed
                          </StatusPill>
                        )}
                      </div>
                      <h3 className="truncate text-lg font-black text-white">{authorName}</h3>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/30">
                        Posted {formatDate(post.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
                    {isRemoved ? (
                      <p className="text-sm font-bold italic text-white/40">{REDACTED_BY_MODERATOR}</p>
                    ) : (
                      <>
                        <MarkdownRenderer content={post.content} />
                        {post.image?.fileUrl && (
                          <img
                            src={post.image.fileUrl}
                            alt="Discussion attachment"
                            className="mt-4 max-h-80 w-full rounded-xl border border-white/10 object-cover"
                          />
                        )}
                      </>
                    )}
                  </div>

                  {reports.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {reports.map((report, index) => (
                        <div
                          key={`${post.id}-report-${index}`}
                          className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-4"
                        >
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-300">
                              <AlertTriangle size={14} />
                              {reasonLabels[report.reason] || report.reason}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/25">
                              {formatDate(report.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-white/70">
                            Reporter: {report.reporter?.name || 'Unknown'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 space-y-3">
                    <textarea
                      value={notes[post.id] || ''}
                      onChange={(event) => updateNote(post.id, event.target.value)}
                      rows={2}
                      placeholder="Resolution reason"
                      className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-emerald-500/40"
                    />

                    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                      <button
                        type="button"
                        onClick={() => runAction(post, 'remove')}
                        disabled={!!workingId || isRemoved}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 text-xs font-black uppercase tracking-wider text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {workingId === `${post.id}-remove` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => runAction(post, 'dismiss')}
                        disabled={!!workingId || isRemoved}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 text-xs font-black uppercase tracking-wider text-emerald-300 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {workingId === `${post.id}-dismiss` ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => runAction(post, 'warn')}
                        disabled={!!workingId}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 text-xs font-black uppercase tracking-wider text-amber-300 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {workingId === `${post.id}-warn` ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                        Warn
                      </button>
                      <button
                        type="button"
                        onClick={() => runAction(post, 'ban')}
                        disabled={!!workingId}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 text-xs font-black uppercase tracking-wider text-violet-300 transition hover:bg-violet-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {workingId === `${post.id}-ban` ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                        Ban
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : appealsLoading ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-white/5 bg-white/[0.03]">
          <Loader2 size={34} className="animate-spin text-emerald-400" />
        </div>
      ) : appeals.length === 0 ? (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[28px] border border-white/5 bg-white/[0.03] p-10 text-center">
          <ShieldAlert size={44} className="mb-4 text-emerald-300" />
          <h3 className="text-xl font-black text-white">No Pending Appeals</h3>
          <p className="mt-2 max-w-md text-sm font-medium text-white/35">
            There are currently no pending unban appeals from suspended discussion users.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
            {appeals.map((appeal) => {
              const user = appeal.user || {};
              const userName = user.name || 'Unknown User';
              const userEmail = user.email || '';
              const userRole = user.role || 'learner';
              const appealId = appeal._id || appeal.id;

              return (
                <article
                  key={appealId}
                  className="rounded-[28px] border border-white/5 bg-white/[0.03] p-6 shadow-2xl shadow-black/10 animate-in fade-in duration-300"
                >
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <StatusPill tone="emerald">
                          Pending Appeal
                        </StatusPill>
                        <StatusPill tone={userRole === 'tutor' ? 'violet' : 'emerald'}>
                          {userRole}
                        </StatusPill>
                      </div>
                      <h3 className="truncate text-lg font-black text-white">{userName}</h3>
                      <p className="text-xs font-medium text-white/40">{userEmail}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/30">
                        Requested {formatDate(appeal.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
                    <p className="text-xs font-bold text-emerald-300/60 uppercase tracking-widest mb-2">Apology Message:</p>
                    <p className="text-sm text-white/95 whitespace-pre-wrap italic">
                      "{appeal.apology}"
                    </p>
                  </div>

                  <div className="mt-5 space-y-3">
                    <textarea
                      value={appealNotes[appealId] || ''}
                      onChange={(event) => updateAppealNote(appealId, event.target.value)}
                      rows={2}
                      placeholder="Moderator resolution feedback (visible to user)"
                      className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-emerald-500/40"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => runResolveAction(appeal, 'approved')}
                        disabled={!!appealsWorkingId}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 text-xs font-black uppercase tracking-wider text-emerald-300 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {appealsWorkingId === `${appealId}-approved` ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        Approve Unban
                      </button>
                      <button
                        type="button"
                        onClick={() => runResolveAction(appeal, 'rejected')}
                        disabled={!!appealsWorkingId}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 text-xs font-black uppercase tracking-wider text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {appealsWorkingId === `${appealId}-rejected` ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Ban size={14} />
                        )}
                        Reject Appeal
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {appealsPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                onClick={() => loadAppeals(appealsPage - 1)}
                disabled={appealsPage === 1}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-wider text-white/60 transition hover:border-emerald-500/40 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-white/50">
                Page {appealsPage} of {appealsPages}
              </span>
              <button
                onClick={() => loadAppeals(appealsPage + 1)}
                disabled={appealsPage === appealsPages}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-wider text-white/60 transition hover:border-emerald-500/40 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DiscussionModeration;
