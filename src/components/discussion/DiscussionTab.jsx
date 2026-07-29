import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, Clock, Loader2, MessageSquare, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import DiscussionComposer from './DiscussionComposer';
import DiscussionPostCard from './DiscussionPostCard';
import DiscussionSortControl from './DiscussionSortControl';
import discussionService from '../../services/discussion.service';
import { useAuth } from '../../context/useAuth';

const ERROR_MESSAGES = {
  DISCUSSION_BANNED: 'Your discussion privileges are suspended.',
  ENROLLMENT_REQUIRED: 'You must enroll in this course to view or post comments.',
  CANNOT_UPVOTE_OWN_POST: 'You cannot upvote your own posts.',
  CANNOT_REPORT_OWN_POST: 'You cannot report your own posts.',
  NESTED_REPLIES_NOT_ALLOWED: 'Replies are limited to a single level.',
  POST_REMOVED: 'This post has been removed by a moderator.',
  POST_ALREADY_REMOVED: 'This post has already been removed.',
  IMAGE_TOO_LARGE: 'Image size exceeds the 5MB limit.',
  INVALID_IMAGE_TYPE: 'Unsupported image type. Allowed types are: JPEG, PNG, WEBP, GIF.'
};

const getDiscussionErrorMessage = (error) => {
  const { code, message } = discussionService.getErrorMeta(error);
  return ERROR_MESSAGES[code] || message || 'Something went wrong.';
};

const DiscussionTab = ({ courseId, lessonId, activeLesson }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [sortMode, setSortMode] = useState('recent');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [banned, setBanned] = useState(false);
  const [unbanRequest, setUnbanRequest] = useState(null);
  const [unbanLoading, setUnbanLoading] = useState(false);

  const loadPosts = useCallback(async () => {
    if (!courseId || !lessonId) return;

    try {
      setLoading(true);
      setError('');
      const response = await discussionService.getLessonDiscussion({
        lessonId,
        sort: sortMode
      });
      setPosts(response.data.posts || []);
      const isBanned = !!response.data.isDiscussionBanned;
      setBanned(isBanned);

      if (isBanned) {
        try {
          const unbanRes = await discussionService.getMyUnbanRequestStatus();
          setUnbanRequest(unbanRes.data);
        } catch (unbanErr) {
          console.error('Failed to load unban request status:', unbanErr);
        }
      }
    } catch (err) {
      console.error('Failed to load discussion:', err);
      const { code } = discussionService.getErrorMeta(err);
      if (code === 'DISCUSSION_BANNED') {
        setBanned(true);
        try {
          const unbanRes = await discussionService.getMyUnbanRequestStatus();
          setUnbanRequest(unbanRes.data);
        } catch (unbanErr) {
          console.error('Failed to load unban request status:', unbanErr);
        }
      }
      setError(getDiscussionErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonId, sortMode]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      loadPosts();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadPosts]);

  const handleSubmitApology = async (apology) => {
    try {
      setUnbanLoading(true);
      const res = await discussionService.submitUnbanRequest({ apology });
      setUnbanRequest(res.data);
      toast.success('Your apology and unban request has been submitted.');
    } catch (err) {
      console.error('Failed to submit unban request:', err);
      toast.error(err.response?.data?.message || 'Failed to submit unban request.');
    } finally {
      setUnbanLoading(false);
    }
  };

  const handleMutationError = (err, fallback) => {
    console.error(fallback, err);
    toast.error(getDiscussionErrorMessage(err));
  };

  const handleCreatePost = async ({ contentMarkdown, imageFile }) => {
    try {
      setPosting(true);
      await discussionService.createPost({
        courseId,
        lessonId,
        contentMarkdown,
        imageFile
      });
      toast.success('Post added.');
      await loadPosts();
    } catch (err) {
      handleMutationError(err, 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const handlers = {
    onReply: async (post, payload) => {
      try {
        await discussionService.replyToPost({
          postId: post.id,
          courseId,
          lessonId,
          contentMarkdown: payload.contentMarkdown,
          imageFile: payload.imageFile
        });
        toast.success('Reply added.');
        await loadPosts();
      } catch (err) {
        handleMutationError(err, 'Failed to reply');
        throw err;
      }
    },
    onUpdate: async (post, payload) => {
      try {
        await discussionService.updatePost({
          postId: post.id,
          contentMarkdown: payload.contentMarkdown
        });
        toast.success('Post updated.');
        await loadPosts();
      } catch (err) {
        handleMutationError(err, 'Failed to update post');
        throw err;
      }
    },
    onDelete: async (post) => {
      try {
        await discussionService.deletePost({ postId: post.id });
        toast.success(post.viewerState?.isAuthor ? 'Post deleted.' : 'Post removed.');
        await loadPosts();
      } catch (err) {
        handleMutationError(err, 'Failed to delete post');
        throw err;
      }
    },
    onToggleUpvote: async (post) => {
      try {
        await discussionService.toggleUpvote({
          postId: post.id,
          hasUpvoted: post.viewerState?.hasUpvoted
        });
        await loadPosts();
      } catch (err) {
        handleMutationError(err, 'Failed to toggle upvote');
      }
    },
    onPin: async (post) => {
      try {
        await discussionService.pinPost({
          postId: post.id,
          isPinned: post.isPinned
        });
        toast.success(post.isPinned ? 'Post unpinned.' : 'Post pinned.');
        await loadPosts();
      } catch (err) {
        handleMutationError(err, 'Failed to pin post');
      }
    },
    onMarkOfficial: async (reply) => {
      try {
        await discussionService.markOfficialAnswer({
          parentPostId: reply.parentId,
          replyId: reply.id
        });
        toast.success('Official answer selected.');
        await loadPosts();
      } catch (err) {
        handleMutationError(err, 'Failed to mark official answer');
      }
    },
    onReport: async (post, payload) => {
      try {
        await discussionService.reportPost({
          postId: post.id,
          reason: payload.reason
        });
        toast.success('Report submitted.');
        await loadPosts();
      } catch (err) {
        handleMutationError(err, 'Failed to report post');
      }
    }
  };

  return (
    <section className="space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-violet-600 dark:text-violet-300">
            <MessageSquare size={14} />
            Discussion
          </div>
          <h2 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white">
            {activeLesson?.title || 'Lesson'} Q&A
          </h2>
          <p className="mt-1 text-sm font-medium text-gray-500 dark:text-white/40">
            {posts.length} {posts.length === 1 ? 'thread' : 'threads'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DiscussionSortControl value={sortMode} onChange={setSortMode} />
          <button
            type="button"
            onClick={loadPosts}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:border-violet-300 hover:text-violet-600 dark:border-white/10 dark:text-white/45 dark:hover:border-violet-500/50 dark:hover:text-violet-300"
            aria-label="Refresh discussion"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {banned && (
        <SuspensionCard
          unbanRequest={unbanRequest}
          loading={unbanLoading}
          onSubmit={handleSubmitApology}
        />
      )}

      {!banned && <DiscussionComposer loading={posting} onSubmit={handleCreatePost} />}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
          <Loader2 size={28} className="animate-spin text-violet-500" />
        </div>
      ) : error && posts.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-500/20 dark:bg-red-500/10">
          <AlertCircle size={28} className="mb-3 text-red-500" />
          <p className="text-sm font-bold text-red-600 dark:text-red-300">{error}</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
          <MessageSquare size={32} className="mb-3 text-gray-300 dark:text-white/20" />
          <p className="text-sm font-bold text-gray-500 dark:text-white/40">No posts yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <DiscussionPostCard
              key={post.id || post._id}
              post={post}
              handlers={handlers}
            />
          ))}
        </div>
      )}
    </section>
  );
};

const SuspensionCard = ({ unbanRequest, loading, onSubmit }) => {
  const [apology, setApology] = useState('');
  const remaining = 1000 - apology.length;
  const canSubmit = apology.trim().length > 0 && remaining >= 0 && !loading;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(apology);
    setApology('');
  };

  const isPending = unbanRequest?.status === 'pending';
  const isRejected = unbanRequest?.status === 'rejected';

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6 shadow-sm dark:border-red-500/20 dark:bg-red-500/5">
      <div className="flex gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
          <AlertTriangle size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-black text-gray-900 dark:text-white">Discussion Access Suspended</h3>
          <p className="mt-2 text-sm font-medium text-gray-600 dark:text-white/60">
            Your ability to post questions and replies has been suspended due to violations of our community guidelines.
          </p>

          {isPending && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <Clock size={14} className="animate-pulse" />
                Appeal Under Review
              </div>
              <p className="mt-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Your Apology Appeal:</p>
              <p className="mt-1 text-sm font-semibold text-gray-700 dark:text-white/80 italic">
                "{unbanRequest.apology}"
              </p>
              <p className="mt-3 text-xs font-medium text-gray-500 dark:text-white/40">
                Administrators are currently reviewing your appeal. You will receive a notification once resolved.
              </p>
            </div>
          )}

          {isRejected && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50/30 p-4 dark:border-red-500/10 dark:bg-red-500/5">
              <div className="text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                Appeal Rejected
              </div>
              {unbanRequest.adminNotes && (
                <>
                  <p className="mt-2 text-xs font-bold text-red-400 uppercase tracking-widest">Moderator Feedback:</p>
                  <p className="mt-1 text-sm font-bold text-red-700 dark:text-red-300">
                    "{unbanRequest.adminNotes}"
                  </p>
                </>
              )}
            </div>
          )}

          {(!unbanRequest || isRejected) && (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <p className="text-sm font-medium text-gray-600 dark:text-white/60">
                {isRejected 
                  ? "You can draft and submit a new appeal explaining why your privileges should be restored:"
                  : "If you believe this was an error or wish to appeal, please write a brief apology/explanation to request an unban:"}
              </p>
              <textarea
                value={apology}
                onChange={(e) => setApology(e.target.value.slice(0, 1001))}
                placeholder="Write your apology or appeal message..."
                rows={3}
                disabled={loading}
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-red-400 dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:border-red-500/50"
              />
              <div className="flex items-center justify-between gap-3">
                <span className={`text-xs font-bold ${remaining < 0 ? 'text-red-500' : 'text-gray-400 dark:text-white/35'}`}>
                  {apology.length}/1000
                </span>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-red-600/20 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : 'Submit Appeal'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscussionTab;
