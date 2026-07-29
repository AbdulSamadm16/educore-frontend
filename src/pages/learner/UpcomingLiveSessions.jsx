import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CalendarPlus, Clock, Grid2X2, List, Loader2, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { liveSessionService } from '../../services/liveSession.service';

const filters = [
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'All', value: 'all' },
];

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not scheduled';

const getCourseTitle = (session) =>
  session.course?.title || session.courseId?.title || session.courseName || 'Course';

const getTutorName = (session) =>
  session.tutor?.name || session.tutorId?.name || session.tutorName || 'Tutor';

const isJoinVisible = (session) => {
  const start = new Date(session.startTime || session.startAt).getTime();
  const now = Date.now();
  return start - now <= 10 * 60 * 1000 && (new Date(session.endTime || session.endAt || start).getTime() >= now);
};

const googleCalendarUrl = (session) => {
  const startValue = session.startTime || session.startAt;
  const endValue = session.endTime || session.endAt;
  const start = new Date(startValue).toISOString().replace(/[-:]|\.\d{3}/g, '');
  const end = new Date(endValue || new Date(startValue).getTime() + (session.durationMinutes || 60) * 60000)
    .toISOString()
    .replace(/[-:]|\.\d{3}/g, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: session.title || 'Live class',
    dates: `${start}/${end}`,
    details: session.description || '',
    location: 'Google Meet',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const downloadIcs = (session) => {
  const startValue = session.startTime || session.startAt;
  const endValue = session.endTime || session.endAt;
  const start = new Date(startValue).toISOString().replace(/[-:]|\.\d{3}/g, '');
  const end = new Date(endValue || new Date(startValue).getTime() + (session.durationMinutes || 60) * 60000)
    .toISOString()
    .replace(/[-:]|\.\d{3}/g, '');
  const escapeIcs = (value = '') => String(value).replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EduCore//Live Session//EN',
    'BEGIN:VEVENT',
    `UID:${session.id || session._id}@educore-live-session`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, '')}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(session.title || 'Live class')}`,
    `DESCRIPTION:${escapeIcs(session.description || '')}`,
    'LOCATION:Google Meet',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${(session.title || 'live-session').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`;
  link.click();
  URL.revokeObjectURL(url);
};

export default function UpcomingLiveSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [filter, setFilter] = useState('this_week');
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const response = await liveSessionService.getLearnerUpcomingSessions({ filter });
        setSessions(response.data?.data?.sessions || response.data?.data || []);
      } catch (error) {
        console.error('Failed to load upcoming sessions:', error);
        toast.error('Could not load upcoming live sessions.');
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [filter]);

  const groupedByDay = useMemo(() => {
    return sessions.reduce((groups, session) => {
      const key = (session.startTime || session.startAt) ? new Date(session.startTime || session.startAt).toDateString() : 'Unscheduled';
      groups[key] = groups[key] || [];
      groups[key].push(session);
      return groups;
    }, {});
  }, [sessions]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
        <div>
          <p className="text-blue-400 text-xs font-black uppercase tracking-[0.3em]">Google Meet</p>
          <h1 className="text-4xl font-black text-white tracking-tight mt-2">Upcoming Live Sessions</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="inline-flex p-1 bg-white/5 border border-white/10 rounded-2xl">
            {filters.map((item) => (
              <button
                key={item.value}
                onClick={() => setFilter(item.value)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
                  filter === item.value ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setView(view === 'list' ? 'calendar' : 'list')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl text-white/60 hover:text-white"
          >
            {view === 'list' ? <Grid2X2 size={17} /> : <List size={17} />}
            {view === 'list' ? 'Calendar' : 'List'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-white/50">
          <Loader2 className="animate-spin" size={20} />
          Loading sessions...
        </div>
      ) : sessions.length === 0 ? (
        <div className="glass-panel border border-white/10 rounded-[28px] p-10 text-center text-white/40">
          No upcoming live sessions for this filter.
        </div>
      ) : view === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {Object.entries(groupedByDay).map(([day, items]) => (
            <section key={day} className="glass-panel border border-white/10 rounded-[28px] p-6">
              <h2 className="text-lg font-black text-white mb-4">{day}</h2>
              <div className="space-y-3">
                {items.map((session) => (
                  <SessionCard
                    key={session.id || session._id}
                    session={session}
                    onOpen={() => navigate(`/learner-dashboard/live-sessions/${session.id || session._id}`, { state: { session } })}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <SessionCard
              key={session.id || session._id}
              session={session}
              onOpen={() => navigate(`/learner-dashboard/live-sessions/${session.id || session._id}`, { state: { session } })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionCard({ session, onOpen }) {
  return (
    <article className="glass-panel border border-white/10 rounded-[24px] p-5 flex flex-col lg:flex-row lg:items-center gap-5">
      <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl w-fit">
        <CalendarDays size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-black text-white truncate">{session.title}</h2>
        <p className="text-sm text-white/40 mt-1">
          {getCourseTitle(session)} · {getTutorName(session)}
        </p>
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-white/40">
          <span className="inline-flex items-center gap-1"><Clock size={14} /> {formatDateTime(session.startTime || session.startAt)}</span>
          <span>{session.durationMinutes || 60} min</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <a
          href={googleCalendarUrl(session)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-xs font-bold"
        >
          <CalendarPlus size={15} />
          Add to Calendar
        </a>
        <button
          type="button"
          onClick={() => downloadIcs(session)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-xs font-bold"
        >
          <CalendarPlus size={15} />
          iCal
        </button>
        {isJoinVisible(session) && (
          <button onClick={onOpen} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black">
            <Video size={15} />
            Join Now
          </button>
        )}
        {!isJoinVisible(session) && (
          <button onClick={onOpen} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-xs font-bold">
            View
          </button>
        )}
      </div>
    </article>
  );
}
