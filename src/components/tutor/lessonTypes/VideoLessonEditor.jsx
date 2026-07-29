import React from 'react';
import VideoUploadZone from '../VideoUploadZone';
import AttachmentUploadZone from '../AttachmentUploadZone';
import SubtitleUploadZone from '../SubtitleUploadZone';

export default function VideoLessonEditor({
  lessonId,
  videoUrl,
  onVideoUrlChange,
  attachments,
  onAttachmentsChange,
  subtitleUrl,
  onSubtitleChange,
  onVideoUploadingChange,
  onAttachmentsUploadingChange,
  onSubtitleUploadingChange
}) {
  return (
    <>
      {/* Column 2: Main Video Upload Box */}
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
        <VideoUploadZone
          lessonId={lessonId}
          videoUrl={videoUrl}
          onUploadComplete={onVideoUrlChange}
          onUploadingStateChange={onVideoUploadingChange}
        />
      </div>

      {/* Column 3: Supplemental Documents + Subtitles */}
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-400">
        <AttachmentUploadZone
          lessonId={lessonId}
          attachments={attachments}
          onAttachmentsChange={onAttachmentsChange}
          onUploadingStateChange={onAttachmentsUploadingChange}
        />
        <SubtitleUploadZone
          lessonId={lessonId}
          subtitleUrl={subtitleUrl}
          onSubtitleChange={onSubtitleChange}
          onUploadingStateChange={onSubtitleUploadingChange}
        />
      </div>
    </>
  );
}
