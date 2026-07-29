import apiClient from './api';

const MOCK_STORAGE_KEY = 'educore_mock_discussions_v1';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const REDACTED_BY_MODERATOR = 'This post was removed by a moderator';
export const REDACTED_BY_AUTHOR = 'This post was deleted by the author';

try {
  window.localStorage.removeItem(MOCK_STORAGE_KEY);
} catch {
  // ignore storage access errors
}

const getPostId = (post) => post?.id || post?._id;

const isRedactedPost = (post) => {
  if (!post) return false;
  if (post.isRemoved || post.deletedAt) return true;
  const content = post.content || post.contentMarkdown || '';
  return content === REDACTED_BY_MODERATOR || content === REDACTED_BY_AUTHOR;
};

const normalizeViewerState = (viewerState = {}) => ({
  hasUpvoted: !!viewerState.hasUpvoted,
  isAuthor: !!viewerState.isAuthor,
  canEdit: !!viewerState.canEdit,
  canDelete: !!viewerState.canDelete,
  canPin: !!viewerState.canPin,
  canMarkOfficial: !!viewerState.canMarkOfficial,
  canUpvote: !!viewerState.canUpvote,
  canReport: !!viewerState.canReport
});

const normalizePost = (post) => {
  if (!post) return post;

  const id = getPostId(post);
  const normalized = {
    ...post,
    id,
    content: post.content ?? post.contentMarkdown ?? '',
    replies: (post.replies || []).map(normalizePost),
    viewerState: normalizeViewerState(post.viewerState)
  };

  return normalized;
};

const unwrap = (response) => {
  if (response?.data && response.data.data !== undefined) {
    return response.data.data;
  }
  return response?.data;
};

const getErrorMeta = (error) => ({
  message: error.response?.data?.message || error.message || 'Request failed',
  code: error.response?.data?.errorCode || error.response?.data?.code || null,
  status: error.response?.status || null
});

const validateImageFile = (file) => {
  if (!file) return;

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    const err = new Error('Unsupported image type. Allowed types are: JPEG, PNG, WEBP, GIF.');
    err.code = 'INVALID_IMAGE_TYPE';
    throw err;
  }

  if (file.size > MAX_IMAGE_BYTES) {
    const err = new Error('Image size exceeds the 5MB limit.');
    err.code = 'IMAGE_TOO_LARGE';
    throw err;
  }
};

const uploadDiscussionImage = async (imageFile) => {
  validateImageFile(imageFile);

  const formData = new FormData();
  formData.append('file', imageFile);

  const response = await apiClient.post('/submissions/upload', formData);
  const uploaded = unwrap(response);

  return {
    fileUrl: uploaded.fileUrl,
    publicId: uploaded.publicId,
    mimeType: uploaded.mimeType || imageFile.type,
    size: uploaded.bytes ?? uploaded.size ?? imageFile.size
  };
};

const mapSortToApi = (sort) => (sort === 'popular' || sort === 'top' ? 'popular' : 'recent');

export const discussionService = {
  getLessonDiscussion: async ({ lessonId, sort = 'recent', page = 1, limit = 20 }) => {
    const response = await apiClient.get('/discussions', {
      params: {
        lessonId,
        sortBy: mapSortToApi(sort),
        page,
        limit
      }
    });

    const data = unwrap(response);
    return {
      data: {
        posts: (data.posts || []).map(normalizePost),
        isDiscussionBanned: !!data.isDiscussionBanned,
        pagination: data.pagination || { page: 1, limit, total: 0, pages: 1 }
      }
    };
  },

  createPost: async ({ courseId, lessonId, contentMarkdown, imageFile }) => {
    const payload = {
      courseId,
      lessonId,
      parentId: null,
      content: contentMarkdown.trim()
    };

    if (imageFile) {
      payload.image = await uploadDiscussionImage(imageFile);
    }

    const response = await apiClient.post('/discussions', payload);
    return { data: normalizePost(unwrap(response)) };
  },

  replyToPost: async ({ postId, courseId, lessonId, contentMarkdown, imageFile }) => {
    const payload = {
      courseId,
      lessonId,
      parentId: postId,
      content: contentMarkdown.trim()
    };

    if (imageFile) {
      payload.image = await uploadDiscussionImage(imageFile);
    }

    const response = await apiClient.post('/discussions', payload);
    return { data: normalizePost(unwrap(response)) };
  },

  updatePost: async ({ postId, contentMarkdown }) => {
    const response = await apiClient.patch(`/discussions/${postId}`, {
      content: contentMarkdown.trim()
    });
    return { data: normalizePost(unwrap(response)) };
  },

  deletePost: async ({ postId }) => {
    await apiClient.delete(`/discussions/${postId}`);
    return { data: null };
  },

  toggleUpvote: async ({ postId, hasUpvoted }) => {
    if (hasUpvoted) {
      await apiClient.delete(`/discussions/${postId}/upvote`);
    } else {
      await apiClient.post(`/discussions/${postId}/upvote`);
    }
    return { data: null };
  },

  pinPost: async ({ postId, isPinned }) => {
    const response = await apiClient.patch(`/discussions/${postId}/pin`, {
      isPinned: !isPinned
    });
    return { data: normalizePost(unwrap(response)) };
  },

  markOfficialAnswer: async ({ parentPostId, replyId }) => {
    const response = await apiClient.patch(`/discussions/${parentPostId}/official`, {
      officialAnswerId: replyId
    });
    return { data: normalizePost(unwrap(response)) };
  },

  reportPost: async ({ postId, reason }) => {
    const response = await apiClient.post(`/discussions/${postId}/report`, { reason });
    return { data: normalizePost(unwrap(response)) };
  },

  getModerationQueue: async ({ page = 1, limit = 20 } = {}) => {
    const response = await apiClient.get('/discussions/admin/reports', {
      params: { page, limit }
    });
    const data = unwrap(response);

    return {
      data: {
        posts: (data.posts || []).map((post) => ({
          ...normalizePost(post),
          reports: post.reports || []
        })),
        pagination: data.pagination || { page: 1, limit, total: 0, pages: 1 }
      }
    };
  },

  removePost: async ({ postId, reason }) => {
    const response = await apiClient.delete(`/discussions/admin/${postId}`, {
      data: { reason }
    });
    return { data: normalizePost(unwrap(response)) };
  },

  dismissReports: async ({ postId }) => {
    const response = await apiClient.patch(`/discussions/admin/${postId}/dismiss-reports`);
    return { data: normalizePost(unwrap(response)) };
  },

  warnUser: async ({ userId, reason, postContent }) => {
    const response = await apiClient.post(`/discussions/admin/users/${userId}/warn`, { reason, postContent });
    return { data: unwrap(response) };
  },

  banUserFromDiscussions: async ({ userId, isBanned = true }) => {
    const response = await apiClient.post(`/discussions/admin/users/${userId}/discussion-ban`, {
      isBanned
    });
    return { data: unwrap(response) };
  },

  submitUnbanRequest: async ({ apology }) => {
    const response = await apiClient.post('/discussions/unban-requests', { apology });
    return { data: unwrap(response) };
  },

  getMyUnbanRequestStatus: async () => {
    const response = await apiClient.get('/discussions/unban-requests/my-status');
    return { data: unwrap(response) };
  },

  getPendingUnbanRequests: async ({ page = 1, limit = 20 } = {}) => {
    const response = await apiClient.get('/discussions/admin/unban-requests', {
      params: { page, limit }
    });
    return { data: unwrap(response) };
  },

  resolveUnbanRequest: async ({ requestId, status, adminNotes }) => {
    const response = await apiClient.patch(`/discussions/admin/unban-requests/${requestId}/resolve`, {
      status,
      adminNotes
    });
    return { data: unwrap(response) };
  },

  getErrorMeta,
  isRedactedPost
};

export default discussionService;
