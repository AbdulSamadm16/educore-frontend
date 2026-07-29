import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Save, ArrowLeft, Plus, Trash2, GripVertical, 
  Settings, BookOpen, Layers, Zap, Image as ImageIcon,
  CheckCircle, AlertCircle, Play, ChevronRight, Edit3,
  Eye, FileText, XCircle, PlayCircle, TrendingUp, X
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import toast from 'react-hot-toast';
import apiClient from '../../services/api';
import UniversalModal from '../../components/shared/UniversalModal';
import ModuleEditor from '../../components/tutor/ModuleEditor';
import LessonEditorModal from '../../components/tutor/LessonEditorModal';

// Module-level variable to prevent double-execution of persistent draft creation on StrictMode mount
let creationInProgress = null;

export default function CourseEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id && id !== 'undefined';

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  
  // Course State
  const [courseData, setCourseData] = useState({
    title: '',
    shortDescription: '',
    description: '',
    category: 'Development',
    level: 'Beginner',
    price: 0,
    isFree: true,
    isSequential: false,
    thumbnailUrl: '',
    tags: [],
    certificateEnabled: false,
    certificateTemplateId: ''
  });

  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [tagsInput, setTagsInput] = useState('');
  const [originalData, setOriginalData] = useState(null);
  const [certificateTemplates, setCertificateTemplates] = useState([]);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm', // confirm, prompt, select
    onConfirm: () => {},
    inputValue: '',
    inputPlaceholder: '',
    options: []
  });

  // Curriculum State
  const [modules, setModules] = useState([]);
  const [lessonModal, setLessonModal] = useState({
    isOpen: false,
    moduleId: null,
    lesson: null,
    type: 'video'
  });

  useEffect(() => {
    if (isEditMode) {
      fetchCourseData();
      creationInProgress = null; // Reset lock when transitioning to valid edit page
    } else {
      autoCreateDraftCourse();
    }
  }, [id]);

  const handleCertificatePreview = async (e) => {
    if (e) e.preventDefault();
    if (!courseData.certificateTemplateId) return;
    
    let previewWindow = null;
    try {
      previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write('<div style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: white;">Generating PDF Preview...</div>');
      }

      setPreviewLoading(true);
      const response = await apiClient.get(`/certificates/templates/${courseData.certificateTemplateId}/preview`, {
        responseType: 'blob'
      });
      
      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);
      
      if (previewWindow) {
        previewWindow.location.href = url;
      } else {
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('Failed to load certificate preview', err);
      toast.error('Failed to generate preview.');
      if (previewWindow) {
        previewWindow.close();
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const autoCreateDraftCourse = async () => {
    // Strict sessionStorage-based time-lock to prevent React StrictMode and route remount duplicate POST calls
    const now = Date.now();
    const lastCreatedTime = sessionStorage.getItem('educore_draft_creating_timestamp');
    if (lastCreatedTime && now - parseInt(lastCreatedTime, 10) < 3000) {
      console.log('Skipping auto-creation of draft due to active debounce lock.');
      if (creationInProgress) {
        try {
          const newCourseId = await creationInProgress;
          navigate(`/tutor-dashboard/courses/edit/${newCourseId}`, { replace: true });
        } catch (err) {
          // Ignored
        }
      }
      return;
    }
    
    // Set the lock timestamp immediately
    sessionStorage.setItem('educore_draft_creating_timestamp', String(now));

    if (creationInProgress) {
      try {
        const newCourseId = await creationInProgress;
        navigate(`/tutor-dashboard/courses/edit/${newCourseId}`, { replace: true });
      } catch (err) {
        // Ignored, primary call handles error
      }
      return;
    }

    setLoading(true);
    let resolveInProgress;
    creationInProgress = new Promise((resolve) => {
      resolveInProgress = resolve;
    });

    try {
      const response = await apiClient.post('/courses', {
        title: 'Untitled Course Draft',
        description: 'Draft course under construction.',
        category: 'Development',
        level: 'Beginner',
        isFree: true,
        price: 0
      });
      const newCourseId = response.data.data.id || response.data.data._id;
      resolveInProgress(newCourseId);
      
      // Navigate to the edit page of the newly created course draft
      navigate(`/tutor-dashboard/courses/edit/${newCourseId}`, { replace: true });
      toast.success('Initial persistent course draft created.');
    } catch (err) {
      console.error('Failed to auto-create course draft:', err);
      toast.error('Failed to initialize course draft.');
      navigate('/tutor-dashboard/courses');
      creationInProgress = null; // Reset on failure to allow retry
      sessionStorage.removeItem('educore_draft_creating_timestamp');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseData = async () => {
    setLoading(true);
    try {
      const [courseRes, auditRes, templatesRes] = await Promise.all([
        apiClient.get(`/courses/${id}`),
        apiClient.get(`/courses/${id}/audit-logs`),
        apiClient.get('/certificates/templates').catch(() => ({ data: { data: [] } }))
      ]);
      
      const { course, modules } = courseRes.data.data;
      const mergedCourse = course.pendingChanges ? { ...course, ...course.pendingChanges } : course;
      
      setCourseData(mergedCourse);
      setOriginalData(mergedCourse);
      setTagsInput(mergedCourse.tags?.join(', ') || '');
      setModules(modules || []);
      setAuditLogs(auditRes.data.data || []);
      setCertificateTemplates(templatesRes.data?.data || []);
    } catch (err) {
      console.error('Error loading course data:', err);
      toast.error('Failed to load course details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    
    if (!courseData.title.trim() || !courseData.description.trim()) {
      toast.error('Course update failed: Title and technical description are required.');
      return;
    }

    setSaving(true);
    try {
      let currentId = id;

      if (isEditMode) {
        await apiClient.patch(`/courses/${id}`, courseData);
        if (courseData.status === 'published') {
          // Immediately publish changes to merge pendingChanges on the server
          await apiClient.patch(`/courses/${id}/publish`);
        }
      } else {
        const response = await apiClient.post('/courses', courseData);
        currentId = response.data.data._id;
        
        // SYNC CURRICULUM IF CREATED LOCALLY
        if (modules.length > 0) {
           for (const module of modules) {
              const modRes = await apiClient.post(`/modules/${currentId}`, { title: module.title });
              const newModId = modRes.data.data.id || modRes.data.data._id;
              
              if (module.lessons?.length > 0) {
                 for (const lesson of module.lessons) {
                    await apiClient.post(`/lessons/module/${newModId}`, { 
                       courseId: currentId,
                       ...lesson
                    });
                 }
              }
           }
        }
      }

      // SYNC THUMBNAIL IF SELECTED LOCALLY
      if (thumbnailFile) {
        const formData = new FormData();
        formData.append('thumbnail', thumbnailFile);
        await apiClient.patch(`/courses/${currentId}/thumbnail`, formData);
      }

      toast.success(
        isEditMode 
          ? (courseData.status === 'published' ? 'Course changes successfully republished.' : 'Course details updated.') 
          : 'Course created successfully.'
      );
      navigate(`/tutor-dashboard/courses`);
    } catch (err) {
      console.error('Error saving course:', err);
      toast.error(err.response?.data?.message || 'Failed to save course.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (isEditMode && courseData.status === 'published') {
      setModalConfig({
        isOpen: true,
        title: 'Discard Draft Changes',
        message: 'Are you sure you want to permanently discard all pending modifications and revert this course to its last published state?',
        type: 'confirm',
        onConfirm: async () => {
          try {
            setSaving(true);
            await apiClient.patch(`/courses/${id}/discard`);
            toast.success('Draft changes discarded and reverted to last published version.');
            navigate('/tutor-dashboard/courses');
          } catch (err) {
            console.error('Failed to discard changes:', err);
            toast.error('Failed to discard draft changes on the server.');
          } finally {
            setSaving(false);
          }
        }
      });
      return;
    }

    if (originalData) {
      setCourseData(originalData);
      setTagsInput(originalData.tags?.join(', ') || '');
      toast.success('Reverted to last saved state.');
    } else {
      navigate(-1);
    }
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!isEditMode) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
      return;
    }

    const formData = new FormData();
    formData.append('thumbnail', file);

    try {
      setSaving(true);
      const response = await apiClient.patch(`/courses/${id}/thumbnail`, formData);
      setCourseData({ ...courseData, thumbnailUrl: response.data.data.thumbnailUrl });
      toast.success('Visual asset updated successfully.');
    } catch (err) {
      console.error('Error uploading thumbnail:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to update visual asset.');
    } finally {
      setSaving(false);
    }
  };

  const addModule = () => {
    setModalConfig({
      isOpen: true,
      title: 'Create Module',
      message: 'Name your new module to organize lessons.',
      type: 'prompt',
      inputPlaceholder: 'e.g., Fundamentals of Design',
      onConfirm: async (title) => {
        if (!title.trim()) return;

        if (!isEditMode) {
          const tempId = Math.random().toString(36).substr(2, 9);
          setModules([...modules, { _id: tempId, title, lessons: [] }]);
          toast.success('Module draft added.');
          return;
        }

        try {
          const response = await apiClient.post(`/modules/${id}`, { title });
          const newModule = response.data.data;
          setModules([...modules, { ...newModule, _id: newModule.id || newModule._id, lessons: [] }]);
          toast.success('Module created successfully.');
        } catch (err) {
          toast.error('Failed to create module.');
        }
      }
    });
  };

  const deleteModule = (moduleId) => {
    setModalConfig({
      isOpen: true,
      title: 'Delete Module',
      message: 'Are you sure you want to permanently delete this module and all its lessons?',
      type: 'confirm',
      onConfirm: async () => {
        if (!isEditMode) {
          setModules(modules.filter(m => (m._id || m.id) !== moduleId));
          toast.success('Module removed.');
          return;
        }

        try {
          await apiClient.delete(`/modules/${moduleId}`);
          setModules(modules.filter(m => (m._id || m.id) !== moduleId));
          toast.success('Module deleted.');
        } catch (err) {
          toast.error('Failed to delete module.');
        }
      }
    });
  };

  const updateModule = (moduleId) => {
    const currentModule = modules.find(m => (m._id || m.id) === moduleId);
    const currentTitle = currentModule?.title;
    setModalConfig({
      isOpen: true,
      title: 'Edit Module',
      message: 'Update the title of this module.',
      type: 'prompt',
      inputValue: currentTitle,
      onConfirm: async (newTitle) => {
        if (!newTitle.trim() || newTitle === currentTitle) return;

        if (!isEditMode) {
          setModules(modules.map(m => (m._id || m.id) === moduleId ? { ...m, title: newTitle } : m));
          return;
        }

        try {
          await apiClient.patch(`/modules/${moduleId}`, { title: newTitle });
          setModules(modules.map(m => (m._id || m.id) === moduleId ? { ...m, title: newTitle } : m));
          toast.success('Module updated.');
        } catch (err) {
          toast.error('Failed to update module.');
        }
      }
    });
  };

  const handleReorderModules = async (newOrder) => {
    setModules(newOrder);
    try {
      await apiClient.patch('/modules/reorder', {
        courseId: id,
        orderedModuleIds: newOrder.map(m => m._id || m.id)
      });
    } catch (err) {
      console.error('Error reordering modules:', err);
    }
  };

  const addLesson = (moduleId) => {
    setModalConfig({
      isOpen: true,
      title: 'Add Lesson',
      message: 'Select the content format for this lesson.',
      type: 'select',
      options: ['Video', 'Text', 'Quiz', 'Assignment'],
      onConfirm: async (type) => {
        try {
          setSaving(true);
          const response = await apiClient.post(`/lessons/module/${moduleId}`, {
            title: `New ${type}`,
            type: type.toLowerCase()
          });
          const newLesson = { ...response.data.data, _id: response.data.data.id || response.data.data._id };
          
          setModules(prevModules => prevModules.map(m => {
            if ((m._id || m.id) === moduleId) {
              return { ...m, lessons: [...(m.lessons || []), newLesson] };
            }
            return m;
          }));

          setLessonModal({
            isOpen: true,
            moduleId,
            lesson: newLesson,
            type: type.toLowerCase(),
            isNew: true
          });
        } catch (err) {
          console.error('Failed to pre-create lesson draft:', err);
          toast.error('Failed to initialize lesson draft on server.');
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const handleSaveLesson = async (lessonData) => {
    try {
      if (lessonModal.lesson) {
        // Update
        const lessonId = lessonModal.lesson._id || lessonModal.lesson.id;
        const response = await apiClient.patch(`/lessons/${lessonId}`, lessonData);
        const updatedLesson = { ...response.data.data, _id: response.data.data.id || response.data.data._id };
        
        setModules(modules.map(m => {
          if ((m._id || m.id) === lessonModal.moduleId) {
            return { ...m, lessons: m.lessons.map(l => (l._id || l.id) === lessonId ? updatedLesson : l) };
          }
          return m;
        }));
        toast.success('Lesson updated successfully.');
      } else {
        // Fallback Create (if somehow no lesson modal reference)
        const response = await apiClient.post(`/lessons/module/${lessonModal.moduleId}`, { 
          courseId: id,
          ...lessonData,
          type: lessonModal.type
        });
        const newLesson = { ...response.data.data, _id: response.data.data.id || response.data.data._id };
        
        setModules(modules.map(m => 
          (m._id || m.id) === lessonModal.moduleId ? { ...m, lessons: [...(m.lessons || []), newLesson] } : m
        ));
        toast.success('Lesson created successfully.');
      }
      setLessonModal({ isOpen: false, moduleId: null, lesson: null, type: 'video', isNew: false });
    } catch (err) {
      console.error('Error saving lesson:', err);
      toast.error('Failed to save lesson details.');
    }
  };

  const updateLesson = (moduleId, lessonId) => {
    const currentModule = modules.find(m => (m._id || m.id) === moduleId);
    const currentLesson = currentModule?.lessons.find(l => (l._id || l.id) === lessonId);
    if (!currentLesson) return;

    setLessonModal({
      isOpen: true,
      moduleId,
      lesson: currentLesson,
      type: currentLesson.type,
      isNew: false
    });
  };

  const deleteLesson = (moduleId, lessonId) => {
    setModalConfig({
      isOpen: true,
      title: 'Delete Lesson',
      message: 'Are you sure you want to permanently delete this lesson?',
      type: 'confirm',
      onConfirm: async () => {
        if (!isEditMode) {
           setModules(modules.map(m => {
             if ((m._id || m.id) === moduleId) {
               return { ...m, lessons: (m.lessons || []).filter(l => (l._id || l.id) !== lessonId) };
             }
             return m;
           }));
           return;
        }

        try {
          await apiClient.delete(`/lessons/${lessonId}`);
          setModules(modules.map(m => {
            if ((m._id || m.id) === moduleId) {
              return { ...m, lessons: (m.lessons || []).filter(l => (l._id || l.id) !== lessonId) };
            }
            return m;
          }));
          toast.success('Lesson deleted.');
        } catch (err) {
          toast.error('Failed to delete lesson.');
        }
      }
    });
  };

  const handlePublishToggle = async () => {
    const isPublishing = courseData.status !== 'published';
    setModalConfig({
      isOpen: true,
      title: isPublishing ? 'Publish Course' : 'Unpublish Course',
      message: isPublishing 
        ? 'This will make the course visible and accessible to all learners.' 
        : 'This will take the course offline. Enrolled learners will still have access.',
      type: 'confirm',
      showNotificationCheckbox: isPublishing, // only show checkbox when publishing
      onConfirm: async (sendNotification) => {
        const endpoint = `/courses/${id}/${isPublishing ? 'publish' : 'unpublish'}`;
        try {
          await apiClient.patch(endpoint, isPublishing ? { sendNotification } : {});
          setCourseData({ ...courseData, status: isPublishing ? 'published' : 'unpublished' });
          toast.success(`Course successfully ${isPublishing ? 'published' : 'unpublished'}.`);
          if (isPublishing) {
            navigate('/tutor-dashboard/courses');
          }
        } catch (err) {
          toast.error('Failed to update course status.');
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px]">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-violet-500/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-violet-400 font-bold tracking-[0.3em] uppercase animate-pulse text-sm">Loading Course Editor</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8 mb-12">
        <div>
          <button 
            onClick={() => navigate('/tutor-dashboard/courses')}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Return to Hub</span>
          </button>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/5 rounded-2xl w-fit mb-2 text-white/10">
              <BookOpen className="text-violet-400" size={32} />
            </div>
            <div>
              <h2 className="text-5xl font-black text-white mb-4 tracking-tighter leading-tight">
                {isEditMode ? 'Edit' : 'Create'} <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">Course</span>
              </h2>
            </div>
          </div>
          <p className="text-violet-200/40 text-lg font-medium">Design and organize your learning path.</p>
        </div>

        {isEditMode && (
          <div className="flex gap-4">
             <button 
               onClick={() => navigate(`/learner-dashboard/catalogue/${courseData._id}`)}
               className="flex items-center gap-2 px-6 py-4 bg-white/5 text-white/60 light-preview-btn hover:text-white border border-white/10 rounded-2xl font-bold transition-all"
             >
               <Eye size={20} />
               Preview
             </button>
          </div>
        )}
      </div>

      <div className="h-px bg-white/5 mb-12" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8">
            <div className="space-y-16">
              {/* General Info Section */}
              <section id="general" className="space-y-8">
                <form onSubmit={handleCourseSubmit} className="space-y-8">
                  <div className="glass-card p-10 rounded-[40px] border border-white/5 space-y-8">
                     <div className="grid grid-cols-1 gap-6">
                       <InputGroup label="Course Title" value={courseData.title} onChange={(val) => setCourseData({...courseData, title: val})} placeholder="e.g. Introduction to Product Design" />
                       <InputGroup label="Short Description" value={courseData.shortDescription} onChange={(val) => setCourseData({...courseData, shortDescription: val})} placeholder="A brief summary for the catalogue cards..." />
                       <div>
                         <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">Course Description</label>
                         <textarea 
                           value={courseData.description}
                           onChange={(e) => setCourseData({...courseData, description: e.target.value})}
                           className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white placeholder:text-white/10 h-48 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all font-medium"
                           placeholder="Deep dive into the course objectives and requirements..."
                         />
                       </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div>
                          <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">Category</label>
                          <select 
                            value={courseData.category}
                            onChange={(e) => setCourseData({...courseData, category: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all cursor-pointer"
                          >
                            <option value="Development" className="bg-[#0b0f1a]">Development</option>
                            <option value="Design" className="bg-[#0b0f1a]">Design</option>
                            <option value="Business" className="bg-[#0b0f1a]">Business</option>
                            <option value="Marketing" className="bg-[#0b0f1a]">Marketing</option>
                            <option value="Photography" className="bg-[#0b0f1a]">Photography</option>
                            <option value="Music" className="bg-[#0b0f1a]">Music</option>
                            <option value="Finance" className="bg-[#0b0f1a]">Finance</option>
                            <option value="Data Science" className="bg-[#0b0f1a]">Data Science</option>
                            <option value="Artificial Intelligence" className="bg-[#0b0f1a]">Artificial Intelligence</option>
                            <option value="Cybersecurity" className="bg-[#0b0f1a]">Cybersecurity</option>
                            <option value="Health & Fitness" className="bg-[#0b0f1a]">Health & Fitness</option>
                            <option value="Language Learning" className="bg-[#0b0f1a]">Language Learning</option>
                          </select>
                       </div>
                       <div>
                         <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">Complexity Level</label>
                         <select 
                           value={courseData.level}
                           onChange={(e) => setCourseData({...courseData, level: e.target.value})}
                           className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all"
                         >
                           <option value="Beginner" className="bg-[#0b0f1a]">Beginner</option>
                           <option value="Intermediate" className="bg-[#0b0f1a]">Intermediate</option>
                           <option value="Advanced" className="bg-[#0b0f1a]">Advanced</option>
                         </select>
                       </div>
                     </div>

                      <div className="flex flex-wrap items-center gap-8 py-6 border-t border-white/5">
                        <div className="flex items-center gap-4">
                          <input 
                            type="checkbox" 
                            id="isFree"
                            checked={courseData.isFree}
                            onChange={(e) => setCourseData({...courseData, isFree: e.target.checked, price: e.target.checked ? 0 : courseData.price})}
                            className="w-6 h-6 rounded-lg bg-white/5 border-white/10 text-violet-600 focus:ring-0"
                          />
                          <label htmlFor="isFree" className="text-sm font-bold text-white">Open Source (Free Access)</label>
                        </div>
                        <div className="flex items-center gap-4">
                          <input 
                            type="checkbox" 
                            id="isSequential"
                            checked={courseData.isSequential || false}
                            onChange={(e) => setCourseData({...courseData, isSequential: e.target.checked})}
                            className="w-6 h-6 rounded-lg bg-white/5 border-white/10 text-violet-600 focus:ring-0"
                          />
                          <label htmlFor="isSequential" className="text-sm font-bold text-white">Sequential Module Locks</label>
                        </div>
                        {!courseData.isFree && (
                          <div className="flex-1 max-w-xs">
                            <InputGroup label="Access Price (USD)" value={courseData.price} type="number" onChange={(val) => setCourseData({...courseData, price: val})} placeholder="0.00" />
                          </div>
                        )}
                      </div>

                     <div className="pt-6 border-t border-white/5">
                       <InputGroup 
                         label="Search Tags (Comma separated)" 
                         value={tagsInput} 
                         onChange={(val) => {
                           setTagsInput(val);
                           setCourseData({
                             ...courseData, 
                             tags: val.split(',').map(t => t.trim()).filter(Boolean)
                           });
                         }} 
                         placeholder="e.g. design, research, prototyping" 
                       />
                     </div>
                  </div>

                  <div className="flex justify-end gap-6">
                      <button 
                        type="button"
                        onClick={handleCancel}
                        className="px-10 py-5 text-white/40 font-bold uppercase tracking-widest hover:text-white transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={saving}
                        className="px-12 py-5 bg-violet-600 hover:bg-violet-500 text-white rounded-[20px] font-black uppercase tracking-widest transition-all shadow-2xl shadow-violet-600/20 flex items-center gap-3 cursor-pointer"
                      >
                        {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={20} />}
                        {isEditMode 
                          ? (courseData.status === 'published' ? 'Republish Course' : 'Update Course') 
                          : 'Create Course'
                        }
                      </button>
                   </div>
                </form>
              </section>

              {/* Course Content Section */}
              <section id="curriculum" className="space-y-8 pt-16 border-t border-white/5">
                    <div className="flex items-center justify-between mb-8">
                       <div className="flex items-center gap-3">
                         <div className="p-2 bg-violet-500/10 rounded-lg">
                           <Layers className="text-violet-400" size={18} />
                         </div>
                         <h3 className="text-xl font-bold text-white uppercase tracking-widest">Course Content</h3>
                       </div>
                       <button 
                         onClick={addModule}
                         className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold transition-all border border-violet-500/20"
                       >
                         <Plus size={18} />
                         Add Module
                       </button>
                    </div>

                 <div className="space-y-6">
                    <Reorder.Group axis="y" values={modules} onReorder={handleReorderModules} className="space-y-6">
                      {modules.map((module, mIdx) => {
                        const moduleId = module._id || module.id;
                        return (
                          <ModuleEditor 
                            key={moduleId} 
                            module={module} 
                            index={mIdx}
                            courseId={isEditMode ? id : null}
                            onDelete={() => deleteModule(moduleId)}
                            onRename={() => updateModule(moduleId)}
                            onAddLesson={() => addLesson(moduleId)}
                            onDeleteLesson={(lessonId) => deleteLesson(moduleId, lessonId)}
                            onRenameLesson={(lessonId) => updateLesson(moduleId, lessonId)}
                          />
                        );
                      })}
                    </Reorder.Group>

                    {modules.length === 0 && (
                      <div className="py-20 text-center bg-white/2 rounded-[40px] border border-white/5 border-dashed">
                        <div className="p-4 bg-white/5 rounded-2xl w-fit mx-auto mb-6 text-white/10">
                          <Plus size={32} />
                        </div>
                        <p className="text-white/20 font-bold uppercase tracking-widest text-xs mb-6">No modules created yet</p>
                        <button 
                          onClick={addModule}
                          className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                        >
                          Create First Module
                        </button>
                      </div>
                    )}
                  </div>
                </section>

                {/* Visual Assets Section */}
                <section id="media" className="space-y-8 pt-16 border-t border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-violet-500/10 rounded-lg">
                        <ImageIcon className="text-violet-400" size={18} />
                      </div>
                      <h3 className="text-xl font-bold text-white uppercase tracking-widest">Visual Assets</h3>
                    </div>

                    <div className="glass-card p-10 rounded-[40px] border border-white/5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div>
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Course Thumbnail</p>
                          <div className="aspect-video rounded-3xl overflow-hidden border border-white/10 bg-white/5 relative group">
                            {(courseData.thumbnailUrl || thumbnailPreview) ? (
                              <img src={thumbnailPreview || courseData.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/10">
                                <ImageIcon size={48} className="mb-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">No Asset Found</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                              <label className="cursor-pointer px-6 py-3 bg-violet-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-violet-500 transition-all">
                                {(courseData.thumbnailUrl || thumbnailPreview) ? 'Replace Asset' : 'Upload Asset'}
                                <input type="file" className="hidden" accept="image/*" onChange={handleThumbnailUpload} />
                              </label>
                            </div>
                          </div>
                          <p className="mt-4 text-[10px] text-white/20 leading-relaxed italic">
                            Recommended: 1280x720px. Max size: 2MB. Support: JPG, PNG.
                          </p>
                        </div>

                        <div className="flex flex-col justify-center">
                           <div className="p-6 rounded-3xl bg-violet-600/5 border border-violet-500/10">
                              <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                 <AlertCircle size={16} className="text-violet-400" />
                                 Quality Guidelines
                              </h4>
                              <ul className="space-y-3">
                                 <li className="text-[10px] font-bold text-white/40 uppercase tracking-widest list-disc ml-4">Avoid text-heavy thumbnails</li>
                                 <li className="text-[10px] font-bold text-white/40 uppercase tracking-widest list-disc ml-4">Use high-contrast visuals</li>
                                 <li className="text-[10px] font-bold text-white/40 uppercase tracking-widest list-disc ml-4">Consistency across course series</li>
                              </ul>
                           </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Certifications Section */}
                  <section id="certifications" className="space-y-8 pt-16 border-t border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-violet-500/10 rounded-lg">
                        <Zap className="text-violet-400" size={18} />
                      </div>
                      <h3 className="text-xl font-bold text-white uppercase tracking-widest">Certifications</h3>
                    </div>

                    <div className="glass-card p-10 rounded-[40px] border border-white/5 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-bold mb-1">Enable Certificates</h4>
                          <p className="text-white/40 text-xs">Automatically award a certificate to learners upon 100% course completion.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={courseData.certificateEnabled}
                            onChange={(e) => {
                              const isEnabled = e.target.checked;
                              setCourseData({...courseData, certificateEnabled: isEnabled});
                              if (isEnabled) {
                                toast.success('Course certification enabled!');
                              } else {
                                toast.success('Course certification disabled.');
                              }
                            }}
                          />
                          <div className="w-14 h-7 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-violet-600"></div>
                        </label>
                      </div>

                      {courseData.certificateEnabled && (
                        <div className="pt-6 border-t border-white/5 animate-in fade-in slide-in-from-top-4 duration-300">
                          <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">Select Template</label>
                          {certificateTemplates.length > 0 ? (
                            <div className="space-y-6">
                              <select 
                                value={courseData.certificateTemplateId || ''}
                                onChange={(e) => setCourseData({...courseData, certificateTemplateId: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all cursor-pointer"
                              >
                                <option value="" disabled className="bg-[#0b0f1a]">Choose a certificate template...</option>
                                {certificateTemplates.map(template => (
                                  <option key={template.id} value={template.id} className="bg-[#0b0f1a]">
                                    {template.name} {template.scope === 'institution' ? '(Institution)' : '(Platform)'}
                                  </option>
                                ))}
                              </select>

                              {courseData.certificateTemplateId && (
                                <div className="mt-6 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={handleCertificatePreview}
                                    disabled={previewLoading}
                                    className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                                  >
                                    {previewLoading ? (
                                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                      <Eye size={16} />
                                    )}
                                    Preview Certificate
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
                              No active certificate templates available. Please contact an administrator.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </section>

                  {isEditMode && (
                    <>
                      {/* Audit Trail Section */}
                      <section id="audit" className="space-y-8 pt-16 border-t border-white/5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-violet-500/10 rounded-lg">
                            <FileText className="text-violet-400" size={18} />
                          </div>
                          <h3 className="text-xl font-bold text-white uppercase tracking-widest">Audit Trail</h3>
                        </div>

                        <div className="glass-card p-10 rounded-[40px] border border-white/5">
                          <div className="space-y-4">
                            {auditLogs.length === 0 ? (
                              <p className="text-white/20 text-center py-10 font-bold uppercase tracking-widest text-xs">No activity recorded yet</p>
                            ) : (
                              auditLogs.map((log, i) => (
                                <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in fade-in duration-300">
                                  <div>
                                    <p className="text-sm font-bold text-white">{formatAuditLogMessage(log)}</p>
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                                  </div>
                                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shrink-0 ${getBadgeStyles(log.action)}`}>
                                    {getBadgeLabel(log.action)}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </section>
                    </>
                  )}
            </div>
        </div>

        <div className="lg:col-span-4">
           <div className="sticky top-10 space-y-6">
              <div className="glass-card p-8 rounded-[40px] border border-white/5">
                  <div className="flex items-center gap-3 mb-8">
                     <div className="p-2 bg-violet-500/10 rounded-lg">
                        <TrendingUp className="text-violet-400" size={18} />
                     </div>
                     <span className="text-violet-400 font-black text-[10px] uppercase tracking-[0.3em]">Course Status</span>
                  </div>
                 
                 <div className="space-y-6">
                    <div className="flex justify-between items-end">
                       <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Readiness Score</span>
                       <span className="text-2xl font-black text-white">
                         {Math.round(
                           ((courseData.title && courseData.description ? 1 : 0) +
                           (modules.length > 0 && modules.some(m => m.lessons?.length > 0) ? 1 : 0) +
                           (courseData.isFree || courseData.price > 0 ? 1 : 0) +
                           (courseData.thumbnailUrl || thumbnailPreview ? 1 : 0)) / 4 * 100
                         )}%
                       </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-1000" 
                         style={{ 
                           width: `${((courseData.title && courseData.description ? 1 : 0) +
                           (modules.length > 0 && modules.some(m => m.lessons?.length > 0) ? 1 : 0) +
                           (courseData.isFree || courseData.price > 0 ? 1 : 0) +
                           (courseData.thumbnailUrl || thumbnailPreview ? 1 : 0)) / 4 * 100}%` 
                         }} 
                       />
                    </div>
                 </div>

                 <button 
                  disabled={modules.length === 0}
                  onClick={handlePublishToggle}
                  className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all mt-8 flex items-center justify-center gap-3 ${
                    courseData.status === 'published'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-white shadow-xl shadow-amber-500/20'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 disabled:opacity-50'
                  }`}
                >
                  {courseData.status === 'published' ? <XCircle size={18} /> : <PlayCircle size={18} />}
                  {courseData.status === 'published' ? 'Unpublish Course' : 'Publish Course'}
                </button>
              </div>
           </div>
        </div>
      </div>

      <UniversalModal 
        isOpen={modalConfig.isOpen}
        config={modalConfig}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
      />

      <LessonEditorModal 
        isOpen={lessonModal.isOpen}
        lesson={lessonModal.lesson}
        type={lessonModal.type}
        onClose={async () => {
          if (lessonModal.isNew && lessonModal.lesson) {
            const lessonId = lessonModal.lesson._id || lessonModal.lesson.id;
            try {
              await apiClient.delete(`/lessons/${lessonId}`);
              setModules(modules.map(m => {
                if ((m._id || m.id) === lessonModal.moduleId) {
                  return { ...m, lessons: (m.lessons || []).filter(l => (l._id || l.id) !== lessonId) };
                }
                return m;
              }));
            } catch (err) {
              console.error('Failed to cleanup cancelled new lesson', err);
            }
          }
          setLessonModal({ ...lessonModal, isOpen: false, isNew: false });
        }}
        onSave={handleSaveLesson}
      />
    </div>
  );
}



function InputGroup({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-3">{label}</label>
      <input 
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all font-medium"
        placeholder={placeholder}
      />
    </div>
  );
}

function StatusItem({ label, status }) {
  return (
    <div className="flex justify-between items-center">
       <span className="text-xs font-bold text-white/60">{label}</span>
       {status ? <CheckCircle className="text-emerald-400" size={16} /> : <AlertCircle className="text-amber-400" size={16} />}
    </div>
  );
}

const formatAuditLogMessage = (log) => {
  const userName = log.userId?.name || 'Instructor';
  
  if (log.action === 'create') {
    return `${userName} initialized this course draft.`;
  }
  
  if (log.action === 'discard_changes') {
    return `${userName} discarded all pending draft modifications and reverted course to its last published state.`;
  }
  
  if (log.action === 'thumbnail_update') {
    return `${userName} updated the course thumbnail image.`;
  }
  
  if (log.action === 'status_change') {
    const toStatus = log.changes?.to?.status || log.metadata?.status || 'updated';
    return `${userName} changed course status to "${toStatus}".`;
  }
  
  if (log.action === 'curriculum_update') {
    const context = log.metadata?.context;
    const lessonTitle = log.changes?.to?.lesson?.title || log.changes?.from?.lesson?.title;
    const moduleTitle = log.changes?.to?.module?.title || log.changes?.from?.module?.title;

    if (context === 'module_create') {
      return `${userName} added a new module: "${moduleTitle || 'Untitled Module'}".`;
    }
    if (context === 'module_update') {
      return `${userName} updated module: "${moduleTitle || 'Untitled Module'}".`;
    }
    if (context === 'module_delete') {
      return `${userName} deleted module: "${moduleTitle || 'Untitled Module'}".`;
    }
    if (context === 'module_reorder') {
      return `${userName} reordered course modules.`;
    }
    if (context === 'lesson_create') {
      return `${userName} added a new lesson: "${lessonTitle || 'Untitled Lesson'}".`;
    }
    if (context === 'lesson_update') {
      return `${userName} updated lesson: "${lessonTitle || 'Untitled Lesson'}".`;
    }
    if (context === 'lesson_delete') {
      return `${userName} deleted lesson: "${lessonTitle || 'Untitled Lesson'}".`;
    }
    if (context === 'lesson_reorder') {
      return `${userName} reordered curriculum lessons.`;
    }
    
    return `${userName} modified course curriculum.`;
  }
  
  if (log.action === 'update') {
    const changesTo = log.changes?.to || {};
    const updatedKeys = Object.keys(changesTo).filter(k => k !== 'updatedAt');
    if (updatedKeys.length > 0) {
      const formattedKeys = updatedKeys.map(k => k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, ' $1')).join(', ');
      return `${userName} modified course details: updated ${formattedKeys}.`;
    }
    return `${userName} updated course specifications.`;
  }
  
  return `${userName} performed action: ${log.action}.`;
};

const getBadgeStyles = (action) => {
  switch (action) {
    case 'create':
      return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
    case 'discard_changes':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'thumbnail_update':
      return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    case 'status_change':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'curriculum_update':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'update':
      return 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20';
    default:
      return 'text-white/40 bg-white/5 border-white/10';
  }
};

const getBadgeLabel = (action) => {
  switch (action) {
    case 'create': return 'Initialization';
    case 'discard_changes': return 'Reversion';
    case 'thumbnail_update': return 'Visual Asset';
    case 'status_change': return 'Publication';
    case 'curriculum_update': return 'Curriculum';
    case 'update': return 'Metadata';
    default: return 'Action';
  }
};
