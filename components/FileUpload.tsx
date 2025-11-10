import React, { useCallback, useState } from 'react';
import { getVideoDuration } from '../utils/helpers.ts';
import type { VideoFile } from '../types.ts';
import UploadIcon from './icons/UploadIcon.tsx';

interface FileUploadProps {
  onFilesUploaded: (files: VideoFile[]) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesUploaded, isLoading: isAppLoading }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileProcessing = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setError(null);

    const videoFiles = Array.from(files).filter(file => file.type.startsWith('video/'));
    
    if(videoFiles.length === 0) {
      setError("Tidak ada file video yang valid dipilih.");
      setIsProcessing(false);
      return;
    }

    try {
      const processedFiles = await Promise.all(
        videoFiles.map(async (file) => {
          const duration = await getVideoDuration(file);
          const url = URL.createObjectURL(file);
          return { file, duration, url };
        })
      );
      onFilesUploaded(processedFiles);
    } catch (err) {
      console.error(err);
      setError("Gagal memproses durasi video. Silakan coba file lain.");
    } finally {
      setIsProcessing(false);
    }
  }, [onFilesUploaded]);

  const onDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    handleFileProcessing(event.dataTransfer.files);
  }, [handleFileProcessing]);

  const onDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileProcessing(event.target.files);
  };

  const isLoading = isAppLoading || isProcessing;

  return (
    <div className="flex items-center justify-center w-full">
      <label
        htmlFor="dropzone-file"
        className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-900/50 hover:bg-gray-800/60 transition"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadIcon />
          {isLoading ? (
            <p className="mb-2 text-sm text-gray-400">Memproses video...</p>
          ) : (
            <>
              <p className="mb-2 text-sm text-gray-400">
                <span className="font-semibold">Klik untuk mengunggah</span> atau seret dan lepas
              </p>
              <p className="text-xs text-gray-500">File Video (MP4, MOV, dll.)</p>
            </>
          )}
        </div>
        <input id="dropzone-file" type="file" className="hidden" multiple accept="video/*" onChange={onFileChange} disabled={isLoading} />
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </label>
    </div>
  );
};

export default FileUpload;