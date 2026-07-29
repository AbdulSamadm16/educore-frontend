import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Clock, ExternalLink, Loader2, PlayCircle, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { liveSessionService } from '../../services/liveSession.service';

const formatRemaining = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
};

export default function LiveSessionJoin() {
  const { sessionId } = useParams();
  const location = useLocation();
  const [session, setSession] = useState(location.state?.session || null);
  const [loading, setLoading] = useState(!location.state?.session);
  const [joining, setJoining] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchSession = async () => {
      if (location.state?.session) {
        setSession(location.state.session);
        setLoading(false);
        return;
      }

      try {
        const response = await liveSessionService.getSessionById(sessionId);
        setSession(response.data?.data?.session || response.data?.data);
      } catch (error) {
        console.error('Failed to load session:', error);
        if (error.response?.status === 404) {
          toast.error('Open this session from the live sessions list.');
        } else {
          toast.error('Could not load live session.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [location.state, sessionId]);

  const timing = useMemo(() => {
    if (!(session?.startTime || session?.startAt)) return { canJoin: false, ended: false, startsIn: 0 };
    const startValue = session.startTime || session.startAt;
    const endValue = session.endTime || session.endAt;
    const start = new Date(startValue).getTime();
    const end = new Date(endValue || start + (session.durationMinutes || 60) * 60000).getTime();
    return {
      startsIn: start - now,
      canJoin: now >= start - 10 * 60 * 1000 && now <= end,
      ended: now > end,
    };
  }, [session, now]);

  const handleJoin = async () => {
    if (!timing.canJoin) return;

    setJoining(true);
    try {
      const response = await liveSessionService.joinSession(sessionId);
      const joinUrl = response.data?.data?.meetingUrl;
      if (!joinUrl) {
        toast.error('Meet link is not available yet.');
        return;
      }
      window.open(joinUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to join session:', error);
      if (error.response?.status === 403) {
        toast.error('Session joining is not available yet.');
      } else {
        toast.error(error.response?.data?.message || 'Could not open Google Meet.');
      }
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-white/50">
        <Loader2 className="animate-spin" size={20} />
        Loading session...
      </div>
    );
  }

  if (!session) {
    return <div className="glass-panel border border-white/10 rounded-[28px] p-10 text-white/40">Session not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <section className="glass-panel border border-white/10 rounded-[32px] p-8 md:p-10 text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-[28px] bg-blue-500/10 text-blue-400 flex items-center justify-center">
          <Video size={36} />
        </div>
        <div>
          <p className="text-blue-400 text-xs font-black uppercase tracking-[0.3em]">Google Meet</p>
          <h1 className="text-4xl font-black text-white mt-3">{session.title}</h1>
          <p className="text-white/40 mt-3">
            {session.course?.title || session.courseId?.title || session.courseName || 'Course'}
          </p>
        </div>

        {!timing.ended ? (
          <div className="inline-flex items-center gap-3 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-white/70">
            <Clock size={18} />
            {timing.startsIn > 0 ? `Starts in ${formatRemaining(timing.startsIn)}` : 'Session is live'}
          </div>
        ) : (
          <div className="inline-flex items-center gap-3 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-white/70">
            <PlayCircle size={18} />
            Session has ended
          </div>
        )}

        {!timing.ended && (
          <button
            onClick={handleJoin}
            disabled={!timing.canJoin || joining}
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white keep-white rounded-2xl font-black uppercase tracking-widest transition-all"
          >
            {joining ? <Loader2 size={18} className="animate-spin" /> : <ExternalLink size={18} />}
            Join Google Meet
          </button>
        )}

        {timing.ended && session.recordingUrl && (
          <a
            href={session.recordingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white keep-white rounded-2xl font-black uppercase tracking-widest transition-all"
          >
            <PlayCircle size={18} />
            Watch Recording
          </a>
        )}

        {timing.ended && !session.recordingUrl && (
          <p className="text-white/40">Recording is not available yet.</p>
        )}
      </section>
    </div>
  );
}
