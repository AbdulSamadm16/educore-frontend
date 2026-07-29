import { useState } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  Edit3,
  Flag,
  MessageCircle,
  Pin,
  PinOff,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import DiscussionComposer from './DiscussionComposer';
import DiscussionReplyList from './DiscussionReplyList';
import discussionService, {
  REDACTED_BY_AUTHOR,
  REDACTED_BY_MODERATOR
} from '../../services/discussion.service';

const formatRelativeTime = (dateString) => {
  if (!dateString) return '';

  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
};

const getAuthor = (post) => post.author || post.authorSnapshot || {};

const getContent = (post) => post.content || post.contentMarkdown || '';

const isOfficialReply = (post) => !!(post.isOfficial || post.isOfficialAnswer);

const isTutorAuthor = (post) => getAuthor(post).role === 'tutor';

const RemovedPost = ({ message }) => (
  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center text-sm font-semibold italic text-gray-400 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/40">
    {message}
  </div>
);

const UpvoteControl = ({ count, active, disabled, onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`group inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 transition disabled:cursor-not-allowed disabled:opacity-40 ${
      active
        ? 'border-orange-400/70 bg-orange-50 dark:border-orange-500/50 dark:bg-orange-500/15'
        : 'border-gray-300 bg-gray-100 hover:border-orange-400 hover:bg-orange-50 dark:border-white/15 dark:bg-white/[0.06] dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10'
    }`}
  >
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 transition ${
        active
          ? 'fill-orange-500 dark:fill-orange-400'
          : 'fill-gray-600 group-hover:fill-orange-500 dark:fill-gray-300 dark:group-hover:fill-orange-400'
      }`}
    >
      <path d="M12 4l8 8h-5v8H9v-8H4l8-8z" />
    </svg>
    <span
      className={`min-w-[1ch] text-sm font-bold tabular-nums ${
        active
          ? 'text-orange-700 dark:text-orange-300'
          : 'text-gray-800 dark:text-white/85'
      }`}
    >
      {count || 0}
    </span>
  </button>
);

const ActionButton = ({ children, active, danger, disabled, onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-black uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-45 ${
      danger
        ? 'border-red-200 text-red-500 hover:bg-red-50 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10'
        : active
          ? 'border-violet-400 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300'
          : 'border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 dark:border-white/10 dark:text-white/45 dark:hover:border-violet-500/50 dark:hover:text-violet-300'
    }`}
  >
    {children}
  </button>
);

const DiscussionPostCard = ({ post, handlers, isReply = false }) => {
  const [showReply, setShowReply] = useState(false);
  const [editing, setEditing] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('inappropriate');

  const author = getAuthor(post);
  const content = getContent(post);
  const redacted = discussionService.isRedactedPost(post);
  const redactionMessage = content === REDACTED_BY_MODERATOR || post.isRemoved
    ? REDACTED_BY_MODERATOR
    : REDACTED_BY_AUTHOR;
  const canInteract = !redacted;
  const isAnswered = !isReply && !!post.officialAnswerId;

  if (redacted && isReply) {
    return <RemovedPost message={redactionMessage} />;
  }

  const handleReply = async (payload) => {
    setSubmittingReply(true);
    try {
      await handlers.onReply(post, payload);
      setShowReply(false);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleEdit = async (payload) => {
    setSubmittingEdit(true);
    try {
      await handlers.onUpdate(post, payload);
      setEditing(false);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleReport = async () => {
    await handlers.onReport(post, { reason: reportReason });
    setShowReport(false);
  };

  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:border-violet-200 dark:bg-white/[0.03] ${
        isOfficialReply(post)
          ? 'border-emerald-300 ring-1 ring-emerald-200 dark:border-emerald-500/30 dark:ring-emerald-500/15'
          : post.isPinned
            ? 'border-violet-300 ring-1 ring-violet-200 dark:border-violet-500/40 dark:ring-violet-500/15'
            : 'border-gray-200 dark:border-white/10'
      }`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-sm font-black uppercase text-white">
              {author.avatarUrl ? (
                <img src={author.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                (author.name || 'U').slice(0, 1)
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-black text-gray-950 dark:text-white">
                  {author.name || 'Unknown user'}
                </p>
                {isTutorAuthor(post) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
                    <BadgeCheck size={12} />
                    Tutor
                  </span>
                )}
                {post.isPinned && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-300">
                    <Pin size={12} />
                    Pinned
                  </span>
                )}
                {isOfficialReply(post) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
                    <ShieldCheck size={12} />
                    Official Answer
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs font-semibold text-gray-400 dark:text-white/30">
                {formatRelativeTime(post.createdAt)}
                {post.updatedAt && post.updatedAt !== post.createdAt ? ' · Edited' : ''}
              </p>
            </div>
          </div>

          {isAnswered && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-300">
              <CheckCircle2 size={12} />
              Answered
            </span>
          )}
        </div>

        {redacted ? (
          <RemovedPost message={redactionMessage} />
        ) : editing ? (
          <DiscussionComposer
            compact
            initialValue={content}
            submitLabel="Save"
            loading={submittingEdit}
            onSubmit={handleEdit}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <MarkdownRenderer content={content} />
            {post.image?.fileUrl && (
              <img
                src={post.image.fileUrl}
                alt="Discussion attachment"
                className="max-h-80 w-full rounded-xl border border-gray-200 object-cover dark:border-white/10"
              />
            )}
          </>
        )}

        {canInteract && (
          <div className="flex flex-wrap items-center gap-2">
            <UpvoteControl
              count={post.upvoteCount}
              active={post.viewerState?.hasUpvoted}
              disabled={!post.viewerState?.canUpvote && !post.viewerState?.hasUpvoted}
              onClick={() => handlers.onToggleUpvote(post)}
              title={
                post.viewerState?.canUpvote
                  ? 'Upvote'
                  : post.viewerState?.hasUpvoted
                    ? 'Remove upvote'
                    : 'Upvote unavailable'
              }
            />

            {!isReply && (
              <ActionButton onClick={() => setShowReply((current) => !current)}>
                <MessageCircle size={14} />
                Reply
              </ActionButton>
            )}

            {post.viewerState?.canEdit && (
              <ActionButton onClick={() => setEditing(true)}>
                <Edit3 size={14} />
                Edit
              </ActionButton>
            )}

            {post.viewerState?.canDelete && (
              <ActionButton danger onClick={() => handlers.onDelete(post)}>
                <Trash2 size={14} />
                Delete
              </ActionButton>
            )}

            {post.viewerState?.canPin && (
              <ActionButton active={post.isPinned} onClick={() => handlers.onPin(post)}>
                {post.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                {post.isPinned ? 'Unpin' : 'Pin'}
              </ActionButton>
            )}

            {post.viewerState?.canMarkOfficial && !isOfficialReply(post) && (
              <ActionButton onClick={() => handlers.onMarkOfficial(post)}>
                <ShieldCheck size={14} />
                Official
              </ActionButton>
            )}

            {post.viewerState?.canReport && (
              <ActionButton onClick={() => setShowReport((current) => !current)}>
                <Flag size={14} />
                Report
              </ActionButton>
            )}
          </div>
        )}

        {showReport && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <div className="grid gap-3 sm:grid-cols-[180px_auto]">
              <select
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 outline-none dark:border-amber-500/20 dark:bg-black/20 dark:text-white"
              >
                <option value="spam">Spam</option>
                <option value="abuse">Abuse</option>
                <option value="harassment">Harassment</option>
                <option value="inappropriate">Inappropriate</option>
                <option value="other">Other</option>
              </select>
              <button
                type="button"
                onClick={handleReport}
                className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-black transition hover:bg-amber-400"
              >
                Send Report
              </button>
            </div>
          </div>
        )}

        {showReply && (
          <DiscussionComposer
            compact
            submitLabel="Reply"
            loading={submittingReply}
            placeholder="Write a reply..."
            onSubmit={handleReply}
            onCancel={() => setShowReply(false)}
          />
        )}

        {!isReply && (
          <DiscussionReplyList
            replies={post.replies}
            renderReply={(reply) => (
              <DiscussionPostCard
                post={reply}
                handlers={handlers}
                isReply
              />
            )}
          />
        )}
      </div>
    </article>
  );
};

export default DiscussionPostCard;
