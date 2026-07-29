import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageSquare,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../../services/api';

const getCourseId = (course) => String(course?._id || course?.id || '');

export default function TutorDiscussions() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCourseId, setExpandedCourseId] = useState(null);
  const [courseModules, setCourseModules] = useState({});
  const [loadingCourseId, setLoadingCourseId] = useState(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/courses/my-courses?limit=10000');
      setCourses(response.data.data.courses || []);
    } catch (err) {
      console.error('Failed to fetch courses:', err);
      toast.error('Failed to load your courses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return courses;

    return courses.filter((course) => {
      const title = (course.title || '').toLowerCase();
      const description = (course.description || '').toLowerCase();
      return title.includes(query) || description.includes(query);
    });
  }, [courses, searchQuery]);

  const toggleCourse = async (courseId) => {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
      return;
    }

    setExpandedCourseId(courseId);

    if (courseModules[courseId]) return;

    setLoadingCourseId(courseId);
    try {
      const response = await apiClient.get(`/courses/${courseId}`);
      const { modules = [] } = response.data.data || {};
      setCourseModules((prev) => ({ ...prev, [courseId]: modules }));
    } catch (err) {
      console.error('Failed to fetch course modules:', err);
      toast.error('Failed to load lessons for this course.');
      setExpandedCourseId(null);
    } finally {
      setLoadingCourseId(null);
    }
  };

  const getLessonCount = (courseId) => {
    const modules = courseModules[courseId] || [];
    return modules.reduce((count, module) => count + (module.lessons?.length || 0), 0);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center relative group w-full max-w-md">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-purple-400 transition-colors"
          size={18}
        />
        <input
          type="text"
          placeholder="Search courses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-purple-500/10 rounded-full animate-pulse" />
            <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="glass-card rounded-[32px] border border-white/5 bg-white/2 p-12 text-center">
          <BookOpen className="mx-auto mb-4 text-white/20" size={40} />
          <h3 className="text-lg font-bold text-white mb-2">No courses found</h3>
          <p className="text-sm text-white/40">
            {searchQuery ? 'Try a different search term.' : 'Create a course to start managing lesson discussions.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCourses.map((course) => {
            const courseId = getCourseId(course);
            const isExpanded = expandedCourseId === courseId;
            const modules = courseModules[courseId] || [];
            const isLoadingLessons = loadingCourseId === courseId;

            return (
              <div
                key={courseId}
                className="glass-card rounded-[28px] border border-white/5 bg-white/2 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleCourse(courseId)}
                  className="w-full flex items-center gap-4 p-6 text-left hover:bg-white/2 transition-colors"
                >
                  <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 flex-shrink-0">
                    <BookOpen size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white truncate">{course.title}</h3>
                    <p className="text-xs text-white/40 mt-1">
                      {isExpanded && modules.length > 0
                        ? `${getLessonCount(courseId)} lessons`
                        : (course.status || 'draft').replace('_', ' ')}
                    </p>
                  </div>
                  {isLoadingLessons ? (
                    <Loader2 className="text-purple-400 animate-spin flex-shrink-0" size={20} />
                  ) : isExpanded ? (
                    <ChevronDown className="text-white/40 flex-shrink-0" size={20} />
                  ) : (
                    <ChevronRight className="text-white/40 flex-shrink-0" size={20} />
                  )}
                </button>

                {isExpanded && !isLoadingLessons && (
                  <div className="border-t border-white/5 px-6 pb-6">
                    {modules.length === 0 ? (
                      <p className="pt-4 text-sm text-white/40">No modules or lessons in this course yet.</p>
                    ) : (
                      <div className="space-y-4 pt-4">
                        {modules.map((module) => {
                          const moduleId = String(module._id || module.id || module.title);
                          const lessons = module.lessons || [];

                          if (lessons.length === 0) return null;

                          return (
                            <div key={moduleId}>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
                                {module.title}
                              </p>
                              <div className="space-y-2">
                                {lessons.map((lesson) => {
                                  const lessonId = String(lesson._id || lesson.id || '');
                                  return (
                                    <Link
                                      key={lessonId}
                                      to={`/tutor-dashboard/discussions/${courseId}/${lessonId}`}
                                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/2 px-4 py-3 text-sm text-white/70 transition hover:border-purple-500/20 hover:bg-purple-500/5 hover:text-white"
                                    >
                                      <span className="font-medium truncate">{lesson.title}</span>
                                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 flex-shrink-0">
                                        <MessageSquare size={14} />
                                        Q&A
                                      </span>
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
