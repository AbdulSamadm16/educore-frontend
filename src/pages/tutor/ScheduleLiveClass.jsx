import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarPlus, Clock, GraduationCap, Loader2, Users, Video, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { liveSessionService } from '../../services/liveSession.service';
import { useAuth } from '../../context/useAuth';

const getSessionTimes = (date, time, durationMinutes) => {
  if (!date || !time) return { startTime: '', endTime: '' };
  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + Number(durationMinutes) * 60 * 1000);
  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
};

export default function ScheduleLiveClass() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const submittingRef = useRef(false);
  
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    durationMinutes: 60,
    courseId: '',
    batchId: '',
  });

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const response = await liveSessionService.getTutorCourses();
        setCourses(response.data?.data?.courses || response.data?.data || []);
      } catch (error) {
        console.error('Failed to load tutor courses:', error);
        toast.error('Could not load your courses.');
      } finally {
        setLoadingCourses(false);
      }
    };

    const loadBatches = async () => {
      if (user?.institutionId) {
        setLoadingBatches(true);
        try {
          const response = await liveSessionService.getTutorBatches();
          setBatches(response.data?.data || []);
        } catch (error) {
          console.error('Failed to load tutor batches:', error);
        } finally {
          setLoadingBatches(false);
        }
      }
    };

    loadCourses();
    loadBatches();
  }, [user?.institutionId]);

  const selectedCourse = useMemo(
    () => courses.find((course) => String(course.id || course._id) === String(form.courseId)),
    [courses, form.courseId]
  );

  const selectedBatch = useMemo(
    () => batches.find((batch) => String(batch.id || batch._id) === String(form.batchId)),
    [batches, form.batchId]
  );

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submittingRef.current) {
      return;
    }

    if (!form.title || !form.date || !form.time || !form.durationMinutes || !form.courseId) {
      toast.error('Fill all required fields before scheduling.');
      return;
    }

    if (user?.institutionId && !form.batchId) {
      toast.error('Please select a Batch Cohort.');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const { startTime, endTime } = getSessionTimes(form.date, form.time, form.durationMinutes);
      await liveSessionService.scheduleSession({
        title: form.title,
        description: form.description,
        courseId: form.courseId,
        batchId: form.batchId || undefined,
        startTime,
        endTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        durationMinutes: Number(form.durationMinutes),
      });

      toast.success('Live class scheduled. Google Meet link will be shared with learners.');
      setForm({
        title: '',
        description: '',
        date: '',
        time: '',
        durationMinutes: 60,
        courseId: '',
        batchId: '',
      });
    } catch (error) {
      console.error('Failed to schedule live class:', error);
      const errorCode = error.response?.data?.error?.code;

      if (errorCode === 'GOOGLE_AUTH_MISSING') {
        toast.error('Connect your Google account in Settings before scheduling a Meet class.');
        navigate('/tutor-dashboard/settings');
        return;
      }

      toast.error(error.response?.data?.message || 'Could not schedule live class.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // Google Calendar Integration Check (Point 6)
  if (user && !user.googleConnected) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-6 text-center border border-white/10 rounded-[32px] bg-slate-900/50 backdrop-blur-md space-y-6 animate-in fade-in duration-500">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <AlertCircle size={32} />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-black uppercase tracking-wider text-white">
            Google Calendar Integration Required
          </h3>
          <p className="text-xs text-white/50 max-w-md mx-auto leading-relaxed">
            You must link your Google account to authorize Google Meet link creation. Connect Google Calendar in Settings.
          </p>
        </div>
        <button
          onClick={() => navigate('/tutor-dashboard/settings')}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-purple-600/20 inline-flex items-center gap-2"
        >
          <span>Connect Google Calendar</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8">
        <section className="glass-panel border border-white/10 rounded-[28px] p-8 space-y-6">
          <div>
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-3">Title *</label>
            <input
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              placeholder="e.g. Doubt clearing session"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-3">Description</label>
            <textarea
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white h-32 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              placeholder="Add agenda, preparation notes, or expected outcomes."
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-3">Course *</label>
            <select
              value={form.courseId}
              onChange={(event) => updateField('courseId', event.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              disabled={loadingCourses}
              required
            >
              <option value="">{loadingCourses ? 'Loading courses...' : 'Select course'}</option>
              {courses.map((course) => (
                <option key={course.id || course._id} value={course.id || course._id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          {/* Conditional Batch Cohort Selector (Point 5) */}
          {user?.institutionId && (
            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-3">Batch Cohort *</label>
              <select
                value={form.batchId}
                onChange={(event) => updateField('batchId', event.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                disabled={loadingBatches}
                required
              >
                <option value="">{loadingBatches ? 'Loading batches...' : 'Select Batch Cohort'}</option>
                {batches.map((batch) => (
                  <option key={batch.id || batch._id} value={batch.id || batch._id}>
                    {batch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-3">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(event) => updateField('date', event.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 color-scheme-dark"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-3">Time *</label>
              <input
                type="time"
                value={form.time}
                onChange={(event) => updateField('time', event.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 color-scheme-dark"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-3">Duration (Minutes) *</label>
              <input
                type="number"
                min="10"
                step="5"
                value={form.durationMinutes}
                onChange={(event) => updateField('durationMinutes', event.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-3 px-7 py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white rounded-2xl font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-purple-600/10"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <CalendarPlus size={18} />}
            Schedule Meet
          </button>
        </section>

        <aside className="glass-panel border border-white/10 rounded-[28px] p-6 space-y-4 h-fit">
          <InfoRow icon={GraduationCap} label="Course" value={selectedCourse?.title || 'Not selected'} />
          {user?.institutionId && (
            <InfoRow icon={Users} label="Batch Cohort" value={selectedBatch?.name || 'Not selected'} />
          )}
          <InfoRow icon={Users} label="Enrolled learners" value={selectedCourse?.enrollmentCount ?? 0} />
          <InfoRow icon={Clock} label="Duration" value={`${form.durationMinutes || 0} minutes`} />
          <InfoRow icon={Clock} label="Timezone" value={Intl.DateTimeFormat().resolvedOptions().timeZone} />
          <InfoRow icon={Video} label="Provider" value="Google Meet" />
        </aside>
      </form>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl">
      <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">{label}</p>
        <p className="text-sm text-white font-bold truncate">{value}</p>
      </div>
    </div>
  );
}
