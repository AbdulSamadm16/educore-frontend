import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Link as LinkIcon, Loader2, Pencil, XCircle } from 'lucide-react';
import * as UpChunk from '@mux/upchunk';
import toast from 'react-hot-toast';
import { liveSessionService } from '../../services/liveSession.service';
import VideoPlayer from '../../components/learner/VideoPlayer';

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not scheduled';

const RECOMMENDED_MAX_BYTES = 2 * 1024 * 1024 * 1024;
const getSessionId = (session) => session?.id || session?._id;
const getCourseId = (session) => {
  if (session?.course?.id || session?.course?._id) {
    return session.course.id || session.course._id;
  }

  if (session?.courseId && typeof session.courseId === 'object') {
    return session.courseId.id || session.courseId._id;
  }

  return session?.courseId;
};
const getStartTime = (session) => session?.startTime || session?.startAt;
const getEndTime = (session) => session?.endTime || session?.endAt;
const isJoinAvailable = (session) => {
  const start = new Date(getStartTime(session)).getTime();
  const end = new Date(getEndTime(session) || start).getTime();
  const now = Date.now();

  return Number.isFinite(start) && now >= start - 10 * 60 * 1000 && now <= end;
};

const getFileDuration = (file) => new Promise((resolve) => {
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.onloadedmetadata = () => {
    URL.revokeObjectURL(video.src);
    resolve(Math.round(video.duration || 0));
  };
  video.onerror = () => resolve(0);
  video.src = URL.createObjectURL(file);
});

const getProcessingStatus = (recording) =>
  (recording?.processingStatus || recording?.videoStatus || '').toLowerCase();

const statusClass = (status = 'scheduled') => {
  const normalized = String(status).toLowerCase();
  if (normalized === 'live') return 'bg-green-500/10 text-green-300';
  if (normalized === 'completed') return 'bg-white/5 text-white/50';
  if (normalized === 'cancelled') return 'bg-red-500/10 text-red-300';
  if (normalized === 'rescheduled') return 'bg-orange-500/10 text-orange-300';
  return 'bg-blue-500/10 text-blue-300';
};

export default function ManageSessions() {
  const reschedulingRef = useRef(false);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');
  const [activeSession, setActiveSession] = useState(null);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [recordingDrafts, setRecordingDrafts] = useState({});
  const [uploadState, setUploadState] = useState({ file: null, progress: 0, uploading: false, warning: false });
  const [rescheduleSession, setRescheduleSession] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({ date: '', time: '', durationMinutes: 60 });
  const [rescheduling, setRescheduling] = useState(false);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await liveSessionService.getTutorSessions();
      setSessions(response.data?.data?.sessions || response.data?.data || []);
      setCurrentTime(Date.now());
    } catch (error) {
      console.error('Failed to load sessions:', error);
      toast.error('Could not load live sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchSessions, 0);
    return () => clearTimeout(timer);
  }, [tab]);

  useEffect(() => {
    if (!activeSession) return undefined;
    const sessionId = getSessionId(activeSession);
    const courseId = getCourseId(activeSession);
    const draft = recordingDrafts[sessionId];
    const status = getProcessingStatus(draft);

    if (!draft || !courseId || status === 'ready' || status === 'failed') {
      return undefined;
    }

    const poll = async () => {
      try {
        const response = await liveSessionService.getTutorCourseRecordings(courseId);
        const recordings = response.data?.data?.recordings || response.data?.data || [];
        const updated = recordings.find((recording) => String(recording.id || recording._id) === String(draft.id || draft._id));
        if (updated) {
          setRecordingDrafts((current) => ({ ...current, [sessionId]: updated }));
        }
      } catch (error) {
        console.error('Failed to poll recording processing state:', error);
      }
    };

    const interval = setInterval(poll, 20000);
    return () => clearInterval(interval);
  }, [activeSession, recordingDrafts]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const endAt = new Date(getEndTime(session) || getStartTime(session)).getTime();
      if (tab === 'cancelled') return session.status === 'cancelled';
      return tab === 'past' ? endAt < currentTime : endAt >= currentTime && session.status !== 'cancelled';
    });
  }, [currentTime, sessions, tab]);

  const handleCancel = async (sessionId) => {
    try {
      await liveSessionService.cancelSession(sessionId);
      toast.success('Session cancelled and learners will be notified.');
      fetchSessions();
    } catch (error) {
      console.error('Failed to cancel session:', error);
      toast.error(error.response?.data?.message || 'Could not cancel session.');
    }
  };

  const handleJoinSession = async (session) => {
    try {
      const response = await liveSessionService.joinSession(getSessionId(session));
      const joinUrl = response.data?.data?.meetingUrl;

      if (!joinUrl) {
        toast.error('Meet link is not available yet.');
        return;
      }

      window.open(joinUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to open tutor Meet link:', error);
      toast.error(error.response?.data?.message || 'You can join 10 minutes before the class starts.');
    }
  };

  const handleRecordingSave = async () => {
    if (!activeSession || !recordingUrl) return;

    try {
      new URL(recordingUrl);
      await liveSessionService.addRecording(getSessionId(activeSession), {
        sessionId: getSessionId(activeSession),
        courseId: getCourseId(activeSession),
        provider: 'external',
        uploadType: 'external',
        streamUrl: recordingUrl,
      });
      toast.success('Recording draft saved from external URL.');
      setActiveSession(null);
      setRecordingUrl('');
      fetchSessions();
    } catch (error) {
      console.error('Failed to save recording:', error);
      toast.error(error.response?.data?.message || 'Enter a valid playable recording URL.');
    }
  };

  const openReschedule = (session) => {
    const start = getStartTime(session) ? new Date(getStartTime(session)) : new Date();
    setRescheduleSession(session);
    setRescheduleForm({
      date: start.toISOString().slice(0, 10),
      time: start.toTimeString().slice(0, 5),
      durationMinutes: session.durationMinutes || 60,
    });
  };

  const handleReschedule = async () => {
    if (reschedulingRef.current) return;
    if (!rescheduleSession || !rescheduleForm.date || !rescheduleForm.time) return;

    reschedulingRef.current = true;
    setRescheduling(true);
    try {
      await liveSessionService.rescheduleSession(rescheduleSession.id || rescheduleSession._id, {
        startTime: new Date(`${rescheduleForm.date}T${rescheduleForm.time}:00`).toISOString(),
        endTime: new Date(
          new Date(`${rescheduleForm.date}T${rescheduleForm.time}:00`).getTime()
          + Number(rescheduleForm.durationMinutes) * 60 * 1000
        ).toISOString(),
      });
      toast.success('Session rescheduled and learners will be notified.');
      setRescheduleSession(null);
      fetchSessions();
    } catch (error) {
      console.error('Failed to reschedule session:', error);
      toast.error(error.response?.data?.message || 'Could not reschedule session.');
    } finally {
      reschedulingRef.current = false;
      setRescheduling(false);
    }
  };

  const uploadRecordingDraft = async (session, file) => {
    if (!session || !file) return;

    const sessionId = session.id || session._id;
    const courseId = getCourseId(session);
    setUploadState((state) => ({ ...state, uploading: true, progress: 0 }));

    try {
      const credentialsResponse = await liveSessionService.requestMuxUploadUrl({
        sessionId,
        courseId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });

      const data = credentialsResponse.data?.data || {};
      const endpoint = data.uploadUrl || data.url;
      if (!endpoint) throw new Error('Mux upload URL was not returned.');
      const duration = await getFileDuration(file);

      await new Promise((resolve, reject) => {
        const upload = UpChunk.createUpload({ endpoint, file, chunkSize: 5120 });
        upload.on('progress', (event) => {
          setUploadState((state) => ({ ...state, progress: Math.round(event.detail) }));
        });
        upload.on('success', resolve);
        upload.on('error', reject);
      });

      const draftResponse = await liveSessionService.createRecordingDraft({
        sessionId,
        courseId,
        provider: 'mux',
        muxAssetId: data.assetId || data.muxAssetId,
        duration,
        title: file.name,
      });

      const draft = draftResponse.data?.data?.recording || draftResponse.data?.data;
      setRecordingDrafts((current) => ({ ...current, [sessionId]: draft }));
      toast.success('Recording uploaded as a draft.');
    } catch (error) {
      console.error('Failed to upload recording draft:', error);
      toast.error(error.response?.data?.message || error.message || 'Could not upload recording.');
    } finally {
      setUploadState({ file: null, progress: 0, uploading: false, warning: false });
    }
  };

  const handlePublishDraft = async (draft) => {
    if (getProcessingStatus(draft) !== 'ready') {
      toast.error('Recording is not ready to publish yet.');
      return;
    }

    try {
      await liveSessionService.publishRecording(draft.id || draft._id);
      toast.success('Recording published for learners.');
      setActiveSession(null);
      fetchSessions();
    } catch (error) {
      console.error('Failed to publish recording:', error);
      toast.error(error.response?.data?.message || 'Could not publish recording.');
    }
  };

  const handleDiscardDraft = async (draft) => {
    try {
      await liveSessionService.discardRecording(draft.id || draft._id);
      toast.success('Recording draft discarded.');
      setActiveSession(null);
      fetchSessions();
    } catch (error) {
      console.error('Failed to discard recording:', error);
      toast.error(error.response?.data?.message || 'Could not discard recording.');
    }
  };

  return (
    <div className="space-y-8">

      <div className="inline-flex p-1 bg-white/5 border border-white/10 rounded-2xl">
        {['upcoming', 'past', 'cancelled'].map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              tab === item ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-white/50">
          <Loader2 className="animate-spin" size={20} />
          Loading sessions...
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="glass-panel border border-white/10 rounded-[28px] p-10 text-center text-white/40">
          No {tab} sessions found.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filteredSessions.map((session) => (
            <article key={session.id || session._id} className="glass-panel border border-white/10 rounded-[28px] p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest">
                    {session.course?.title || session.courseName || 'Course'}
                  </p>
                  <h2 className="text-xl font-black text-white mt-1">{session.title}</h2>
                  <p className="text-sm text-white/40 mt-2">{formatDateTime(getStartTime(session))}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusClass(session.status)}`}>
                  {session.status || 'scheduled'}
                </span>
              </div>

              <p className="text-sm text-white/50 line-clamp-2">{session.description || 'No description provided.'}</p>

              <div className="flex flex-wrap gap-3">
                {tab === 'upcoming' && (
                  <>
                    <button
                      onClick={() => handleJoinSession(session)}
                      disabled={!isJoinAvailable(session)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:bg-white/5 disabled:text-white/25 text-emerald-300 rounded-xl text-xs font-bold"
                    >
                      <ExternalLink size={15} />
                      {session.status === 'live' ? 'Join Meet' : 'Start Class'}
                    </button>
                    <button
                      onClick={() => openReschedule(session)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-xs font-bold"
                    >
                      <Pencil size={15} />
                      Reschedule
                    </button>
                    <button
                      onClick={() => handleCancel(session.id || session._id)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-xl text-xs font-bold"
                    >
                      <XCircle size={15} />
                      Cancel
                    </button>
                  </>
                )}
                {tab === 'past' && (
                  <button
                    onClick={() => {
                      setActiveSession(session);
                      setRecordingUrl(session.recordingUrl || '');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-xl text-xs font-bold"
                  >
                    <LinkIcon size={15} />
                    Add Recording
                  </button>
                )}
              </div>
              {recordingDrafts[getSessionId(session)] && (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
                  Draft recording: {recordingDrafts[getSessionId(session)].title || recordingDrafts[getSessionId(session)].fileName || 'Untitled recording'}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {activeSession && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#0f172a] border border-white/10 rounded-[28px] p-7 space-y-5">
            <h2 className="text-2xl font-black text-white">Recording Management</h2>
            <p className="text-sm text-white/40">{activeSession.title}</p>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">Upload to Mux Draft</p>
              <input
                type="file"
                accept="video/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setUploadState({ file, progress: 0, uploading: false, warning: !!file && file.size > RECOMMENDED_MAX_BYTES });
                }}
                className="block w-full text-sm text-white/60 file:mr-4 file:rounded-xl file:border-0 file:bg-purple-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
              />
              {uploadState.warning && (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                  This recording exceeds the recommended size.
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="px-3 py-2 rounded-lg bg-white/10 text-white/80 text-xs font-bold" disabled>
                      Compress Before Upload
                    </button>
                    <button
                      onClick={() => setUploadState((state) => ({ ...state, warning: false }))}
                      className="px-3 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold"
                    >
                      Upload Anyway
                    </button>
                    <button
                      onClick={() => activeSession.recordingUrl && window.open(activeSession.recordingUrl, '_blank', 'noopener,noreferrer')}
                      className="px-3 py-2 rounded-lg bg-white/10 text-white/80 text-xs font-bold"
                    >
                      Download Instead
                    </button>
                  </div>
                </div>
              )}
              {uploadState.uploading && (
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500" style={{ width: `${uploadState.progress}%` }} />
                </div>
              )}
              <button
                onClick={() => uploadRecordingDraft(activeSession, uploadState.file)}
                disabled={!uploadState.file || uploadState.uploading}
                className="px-5 py-3 bg-purple-600 disabled:bg-white/10 disabled:text-white/30 text-white keep-white rounded-2xl font-black"
              >
                Upload Draft
              </button>
            </div>
            {recordingDrafts[getSessionId(activeSession)] && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">Draft Actions</p>
                {getProcessingStatus(recordingDrafts[getSessionId(activeSession)]) === 'failed' && (
                  <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
                    Recording processing failed. Please upload again.
                  </div>
                )}
                {(recordingDrafts[getSessionId(activeSession)].playbackUrl
                  || recordingDrafts[getSessionId(activeSession)].hlsUrl
                  || recordingDrafts[getSessionId(activeSession)].muxPlaybackUrl) ? (
                  <div className="overflow-hidden rounded-2xl bg-black">
                    <VideoPlayer
                      url={
                        recordingDrafts[getSessionId(activeSession)].playbackUrl
                        || recordingDrafts[getSessionId(activeSession)].hlsUrl
                        || recordingDrafts[getSessionId(activeSession)].muxPlaybackUrl
                      }
                      lessonId={recordingDrafts[getSessionId(activeSession)].id || recordingDrafts[getSessionId(activeSession)]._id}
                      videoStatus="Ready"
                      disableProgressTracking
                    />
                  </div>
                ) : (
                  <p className="text-sm text-white/40">
                    {getProcessingStatus(recordingDrafts[getSessionId(activeSession)]) === 'failed'
                      ? 'Upload another file to retry.'
                      : 'Preview will appear after Mux processing is ready.'}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handlePublishDraft(recordingDrafts[getSessionId(activeSession)])}
                    disabled={getProcessingStatus(recordingDrafts[getSessionId(activeSession)]) !== 'ready'}
                    className="px-4 py-2 bg-emerald-600 disabled:bg-white/10 disabled:text-white/30 text-white keep-white rounded-xl text-xs font-black"
                  >
                    Publish
                  </button>
                  <button
                    onClick={() => handleDiscardDraft(recordingDrafts[getSessionId(activeSession)])}
                    className="px-4 py-2 bg-red-500/20 text-red-200 rounded-xl text-xs font-black"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-3">
              <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">Paste Recording URL</p>
            <input
              value={recordingUrl}
              onChange={(event) => setRecordingUrl(event.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              placeholder="Paste Google Meet or Drive recording URL"
            />
            {recordingUrl.includes('drive.google.com') && (
              <p className="text-xs text-amber-200">
                Google Drive links can fail in embedded playback if sharing permissions block access.
              </p>
            )}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setActiveSession(null)} className="px-5 py-3 text-white/50 font-bold">
                Close
              </button>
              <button onClick={handleRecordingSave} className="px-6 py-3 bg-purple-600 text-white keep-white rounded-2xl font-black">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {rescheduleSession && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-[28px] p-7 space-y-5">
            <h2 className="text-2xl font-black text-white">Reschedule Session</h2>
            <p className="text-sm text-white/40">{rescheduleSession.title}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="date"
                value={rescheduleForm.date}
                onChange={(event) => setRescheduleForm((form) => ({ ...form, date: event.target.value }))}
                className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white"
              />
              <input
                type="time"
                value={rescheduleForm.time}
                onChange={(event) => setRescheduleForm((form) => ({ ...form, time: event.target.value }))}
                className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white"
              />
              <input
                type="number"
                min="10"
                step="5"
                value={rescheduleForm.durationMinutes}
                onChange={(event) => setRescheduleForm((form) => ({ ...form, durationMinutes: event.target.value }))}
                className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRescheduleSession(null)}
                disabled={rescheduling}
                className="px-5 py-3 text-white/50 font-bold disabled:opacity-40"
              >
                Close
              </button>
              <button
                onClick={handleReschedule}
                disabled={rescheduling}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 disabled:bg-white/10 disabled:text-white/30 text-white keep-white rounded-2xl font-black"
              >
                {rescheduling && <Loader2 size={16} className="animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}
