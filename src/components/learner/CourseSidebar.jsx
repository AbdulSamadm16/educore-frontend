import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, ChevronUp, PlayCircle, 
  CheckCircle2, Lock, FileText, CalendarDays, Clock, MessageSquare, Award
} from 'lucide-react';

const CourseSidebar = ({ courseData, activeLessonId, onLessonSelect, isPreviewMode = false, activeTab = 'lessons', setActiveTab }) => {
  const [expandedModules, setExpandedModules] = useState([]);

  // Auto-expand all modules when course outline finishes loading
  useEffect(() => {
    if (courseData?.modules?.length > 0) {
      const timerId = window.setTimeout(() => {
        setExpandedModules(prev => {
          const allModuleIds = courseData.modules.map(m => m.moduleId || m.id || m._id);
          const uniqueIds = Array.from(new Set([...prev, ...allModuleIds]));
          return uniqueIds;
        });
      }, 0);

      return () => window.clearTimeout(timerId);
    }

    return undefined;
  }, [courseData]);

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  if (!courseData || !courseData.modules) return null;

  // Calculate dynamic lesson completion percentage and estimated remaining watch time
  let totalLessons = 0;
  let completedLessons = 0;
  let totalRemainingSeconds = 0;
  
  courseData.modules.forEach(mod => {
    if (mod.lessons) {
      totalLessons += mod.lessons.length;
      completedLessons += mod.lessons.filter(l => l.isCompleted).length;
      mod.lessons.forEach(l => {
        if (!l.isCompleted) {
          let dur = 0;
          if (l.durationSeconds > 0) {
            dur = l.durationSeconds;
          } else if (l.durationInMinutes > 0) {
            dur = l.durationInMinutes * 60;
          } else if (typeof l.duration === 'string') {
            const mMatch = l.duration.match(/(\d+)\s*min/);
            if (mMatch) dur = parseInt(mMatch[1]) * 60;
          }
          
          const watched = l.secondsWatched || 0;
          const remaining = Math.max(0, dur - watched);
          totalRemainingSeconds += remaining;
        }
      });
    }
  });

  const completionPercentage = totalLessons > 0 
    ? Math.round((completedLessons / totalLessons) * 100) 
    : 0;

  const remainingHrs = Math.floor(totalRemainingSeconds / 3600);
  const remainingMins = Math.ceil((totalRemainingSeconds % 3600) / 60);

  const timeRemainingStr = remainingHrs > 0
    ? `Time remaining: ${remainingHrs} hrs ${remainingMins} mins`
    : `Time remaining: ${remainingMins} mins`;

  return (
    <div className="w-full h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col animate-fade-in">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 shrink-0">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2">
          {courseData.title}
        </h2>
        {isPreviewMode ? (
          <div className="mt-2.5 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
            Guest Preview Mode
          </div>
        ) : (
          <>
            <div className="mt-2.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              {/* Dynamic dynamic animatable progress bar */}
              <div 
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-500 ease-out shadow-sm shadow-blue-500/30" 
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
            <p className="mt-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 flex justify-between items-center">
              <span>{completionPercentage}% Complete</span>
              <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px]">{completedLessons} / {totalLessons} Lessons</span>
            </p>
            {totalRemainingSeconds > 0 && (
              <div className="mt-2 text-xs font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1.5 bg-violet-500/5 dark:bg-violet-500/10 py-1.5 px-3 rounded-lg border border-violet-500/10">
                <Clock size={12} className="animate-pulse text-violet-500 shrink-0" />
                <span>{timeRemainingStr}</span>
              </div>
            )}
            {activeTab && setActiveTab && (
              <div className="mt-3 grid grid-cols-3 gap-1 p-0.5 bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/50 rounded-xl w-full">
                <button
                  onClick={() => setActiveTab('lessons')}
                  className={`text-center py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                    activeTab === 'lessons'
                      ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/25'
                      : 'text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Lessons
                </button>
                <button
                  onClick={() => setActiveTab('recordings')}
                  className={`text-center py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    activeTab === 'recordings'
                      ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/25'
                      : 'text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <CalendarDays size={12} />
                  Live Recs
                </button>
                <button
                  onClick={() => setActiveTab('discussion')}
                  className={`text-center py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center justify-center gap-1 cursor-pointer transition-all ${
                    activeTab === 'discussion'
                      ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/25'
                      : 'text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <MessageSquare size={12} />
                  Q&A
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {courseData.modules.map((module, mIdx) => {
          const mId = module.moduleId || module.id || module._id;
          const isExpanded = expandedModules.includes(mId);
          const totalModuleLessons = module.lessons?.length || 0;
          const completedModuleLessons = module.lessons?.filter(l => l.isCompleted)?.length || 0;
          return (
            <div key={mId} className="border-b border-gray-100 dark:border-gray-800">
              <button 
                onClick={() => toggleModule(mId)}
                className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex flex-col items-start text-left">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Section {mIdx + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex flex-wrap items-center">
                    <span>{module.title}</span>
                    {totalModuleLessons > 0 && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold ml-2">
                        ({completedModuleLessons}/{totalModuleLessons} Completed)
                      </span>
                    )}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp size={16} className="text-gray-400 shrink-0 ml-4" />
                ) : (
                  <ChevronDown size={16} className="text-gray-400 shrink-0 ml-4" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden bg-gray-50 dark:bg-gray-800/30"
                  >
                    <ul className="flex flex-col py-2">
                      {module.lessons.map((lesson, lIdx) => {
                        const isActive = String(lesson.lessonId) === String(activeLessonId);
                        const isLocked = isPreviewMode ? !lesson.isPreview : lesson.isLocked;
                        const isCompleted = isPreviewMode ? false : lesson.isCompleted;
                        return (
                          <li key={lesson.lessonId}>
                            <button
                              onClick={() => !isLocked && onLessonSelect(lesson)}
                              disabled={isLocked}
                              className={`w-full flex flex-col p-3 pl-4 border-l-2 transition-all ${
                                isActive 
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                  : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                              } ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <div className="flex items-start justify-between w-full space-x-3">
                                <div className="mt-0.5 shrink-0">
                                  {isCompleted ? (
                                    <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                                  ) : isLocked ? (
                                    <Lock size={16} className="text-gray-400 shrink-0" />
                                  ) : (!isCompleted && lesson.secondsWatched > 0) ? (
                                    <svg className="w-4 h-4 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" title="In Progress">
                                      <circle cx="12" cy="12" r="10" />
                                      <path d="M12 2a10 10 0 0 1 0 20Z" fill="currentColor" />
                                    </svg>
                                  ) : (
                                    <PlayCircle size={16} className={isActive ? 'text-blue-500 shrink-0' : 'text-gray-400 shrink-0'} />
                                  )}
                                </div>
                                
                                <div className="flex-1 text-left">
                                  <span className={`text-sm block leading-snug ${
                                    isActive ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {lIdx + 1}. {lesson.title}
                                  </span>
                                  <div className="flex items-center space-x-3 mt-1.5">
                                    <span className="text-xs text-gray-500">{lesson.duration || lesson.durationFormatted || '0s'}</span>
                                    {lesson.attachments?.length > 0 && (
                                      <span className="flex items-center text-xs text-gray-500">
                                        <FileText size={12} className="mr-1" />
                                        {lesson.attachments.length} resources
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        {courseData.certificateEnabled && (
          <div className="border-t-4 border-gray-100 dark:border-gray-800/80">
            <div className={`p-5 transition-colors ${completionPercentage >= 90 ? 'bg-amber-500/10 dark:bg-amber-500/5' : 'bg-gray-50 dark:bg-gray-900/80'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${completionPercentage >= 90 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-gray-200 dark:bg-gray-800 text-gray-400'}`}>
                  {completionPercentage >= 90 ? <Award size={22} /> : <Lock size={18} />}
                </div>
                <div className="flex-1">
                  <h3 className={`text-[13px] font-bold ${completionPercentage >= 90 ? 'text-amber-600 dark:text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>Course Certificate</h3>
                  <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-500 mt-0.5 leading-tight">
                    {completionPercentage >= 90 ? 'You have successfully unlocked your certificate!' : 'Complete 90% of the course to unlock.'}
                  </p>
                </div>
              </div>
              {completionPercentage >= 90 && (
                <a 
                  href="/learner-dashboard/certificates"
                  className="mt-4 block w-full py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-600/30 text-center transition-all flex items-center justify-center gap-2"
                >
                  View Certificate
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseSidebar;
