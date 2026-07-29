import React, { useState, useRef } from 'react';
import { UploadCloud, FileVideo, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';

const UploadBox = ({ onFilesSelected, accept, title, description, maxFiles = 1 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files) => {
    if (files.length > maxFiles) {
      toast.error(`You can only upload up to ${maxFiles} file(s) at a time.`);
      files = files.slice(0, maxFiles);
    }
    
    // Basic validation based on accept string (e.g. ".mp4,.mov,.avi")
    const acceptedTypes = accept.split(',').map(type => type.trim().toLowerCase());
    const validFiles = files.filter(file => {
      const extension = '.' + file.name.split('.').pop().toLowerCase();
      return acceptedTypes.includes(extension) || acceptedTypes.includes(file.type);
    });

    if (validFiles.length !== files.length) {
      toast.error('Some files were rejected due to invalid format.');
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-colors duration-200 ease-in-out cursor-pointer
        ${isDragging ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={accept}
        multiple={maxFiles > 1}
      />
      
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-4 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-full">
          <UploadCloud size={32} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500">
          Supported formats: {accept.split(',').join(', ')}
        </div>
      </div>
    </div>
  );
};

export default UploadBox;
