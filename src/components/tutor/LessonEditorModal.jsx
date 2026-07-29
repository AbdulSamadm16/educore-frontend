import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, BookOpen, FileText, X } from 'lucide-react';
import VideoLessonEditor from './lessonTypes/VideoLessonEditor';
import TextLessonEditor from './lessonTypes/TextLessonEditor';
import QuizLessonEditor from './lessonTypes/QuizLessonEditor';
import AssignmentLessonEditor from './lessonTypes/AssignmentLessonEditor';

export default function LessonEditorModal({ isOpen, lesson, type, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    videoUrl: '',
    quizMeta: { questions: [] },
    assignmentMeta: { instructions: '', submissionType: 'file', maxMarks: 100, allowMultipleSubmissions: false, dueDate: null, allowLateSubmissions: true },
    isPreview: false,
    attachments: [],
    subtitleUrl: null
  });

  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [isUploadingSubtitle, setIsUploadingSubtitle] = useState(false);

  // Guard status for saving
  const isUploadActive = isUploadingVideo || isUploadingAttachments || isUploadingSubtitle;

  useEffect(() => {
    if (lesson) {
      setFormData({
        title: lesson.title || '',
        description: lesson.description || '',
        content: lesson.content || '',
        videoUrl: lesson.videoUrl || '',
        quizMeta: lesson.quizMeta || { questions: [] },
        assignmentMeta: lesson.assignmentMeta || { instructions: '', submissionType: 'file', maxMarks: 100, allowMultipleSubmissions: false, dueDate: null, allowLateSubmissions: true },
        isPreview: lesson.isPreview || false,
        attachments: lesson.attachments || [],
        subtitleUrl: lesson.subtitleUrl || null
      });
    } else {
      setFormData({
        title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        description: '',
        content: '',
        videoUrl: '',
        quizMeta: { questions: [] },
        assignmentMeta: { instructions: '', submissionType: 'file', maxMarks: 100, allowMultipleSubmissions: false, dueDate: null, allowLateSubmissions: true },
        isPreview: false,
        attachments: [],
        subtitleUrl: null
      });
    }
    setIsUploadingVideo(false);
    setIsUploadingAttachments(false);
    setIsUploadingSubtitle(false);
  }, [lesson, type, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (isUploadActive) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#020617]/90 backdrop-blur-xl"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`relative w-full ${type === 'video' ? 'max-w-6xl' : 'max-w-4xl'} bg-[#0f172a] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
      >
        {/* Modal Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/2">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-violet-500/10 rounded-2xl text-violet-400">
              {type === 'video' ? <Play size={24} /> : type === 'quiz' ? <BookOpen size={24} /> : <FileText size={24} />}
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight uppercase tracking-widest">{lesson ? 'Edit' : 'Setup'} {type}</h3>
              <p className="text-white/20 text-xs font-bold uppercase tracking-widest">Configure lesson details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-white/20 hover:text-white transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
          <div className={`grid grid-cols-1 ${type === 'video' ? 'lg:grid-cols-3' : 'md:grid-cols-2'} gap-8`}>
            {/* Column 1: Always Present (Lesson Metadata) */}
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">Lesson Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all font-medium"
                  placeholder="e.g. Introduction to the Lesson"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">Lesson Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/10 h-32 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all text-sm"
                  placeholder="What will learners achieve in this lesson?"
                />
              </div>

              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                <input
                  type="checkbox"
                  id="isPreview"
                  checked={formData.isPreview}
                  onChange={(e) => setFormData({ ...formData, isPreview: e.target.checked })}
                  className="w-5 h-5 rounded bg-white/5 border-white/10 text-violet-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="isPreview" className="text-sm font-bold text-white/60 cursor-pointer select-none">Allow Free Preview</label>
              </div>
            </div>

            {/* Column 2 & 3: Render specific sub-editor dynamically */}
            {type === 'video' && (
              <VideoLessonEditor
                lessonId={lesson?._id || lesson?.id}
                videoUrl={formData.videoUrl}
                onVideoUrlChange={(val) => setFormData(prev => ({ ...prev, videoUrl: val }))}
                attachments={formData.attachments}
                onAttachmentsChange={(val) => setFormData(prev => ({ ...prev, attachments: val }))}
                subtitleUrl={formData.subtitleUrl}
                onSubtitleChange={(val) => setFormData(prev => ({ ...prev, subtitleUrl: val }))}
                onVideoUploadingChange={setIsUploadingVideo}
                onAttachmentsUploadingChange={setIsUploadingAttachments}
                onSubtitleUploadingChange={setIsUploadingSubtitle}
              />
            )}

            {type === 'text' && (
              <TextLessonEditor
                content={formData.content}
                onContentChange={(val) => setFormData(prev => ({ ...prev, content: val }))}
              />
            )}

            {type === 'quiz' && (
              <QuizLessonEditor
                quizMeta={formData.quizMeta}
                onMetaChange={(val) => setFormData(prev => ({ ...prev, quizMeta: val }))}
              />
            )}

            {type === 'assignment' && (
              <AssignmentLessonEditor
                assignmentMeta={formData.assignmentMeta}
                onMetaChange={(val) => setFormData(prev => ({ ...prev, assignmentMeta: val }))}
              />
            )}
          </div>
        </div>

        {/* Modal Footer with Save Guards */}
        <div className="p-8 border-t border-white/5 bg-white/2 flex justify-end gap-6">
          <button 
            type="button"
            onClick={onClose} 
            className="px-8 py-4 text-white/40 font-bold uppercase tracking-widest hover:text-white transition-all"
          >
            Cancel
          </button>
          
          <button
            type="button"
            disabled={isUploadActive}
            onClick={handleSave}
            className={`px-10 py-4 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-850 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-violet-600/20 flex items-center gap-3`}
          >
            {isUploadActive ? 'Uploading assets...' : 'Deploy Lesson'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
