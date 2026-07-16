'use client';
import { useState, useRef } from 'react';
import api from '@/lib/api';

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadResult(null);
      setError('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setUploadResult(null);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/client/orders/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadResult(res.data);
      setFile(null);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="animate-slide-up max-w-4xl">
      <h2 className="text-3xl font-bold text-white">Bulk Order Upload</h2>
      <p className="text-gray-400 mt-1">Upload your Excel file (max 5000 rows) to create multiple orders.</p>

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <div
        className="mt-8 glass-panel p-12 rounded-2xl border-dashed border-2 border-primary/50 text-center hover:bg-primary/5 transition-colors cursor-pointer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white">Drag & Drop Excel File</h3>
        <p className="text-gray-400 mt-2">or click to browse from your computer (.xlsx, .csv)</p>
        {file && (
          <div className="mt-4 p-3 bg-white/10 rounded-lg">
            <p className="text-white text-sm">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
          </div>
        )}
      </div>

      {file && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      )}

      {uploadResult && (
        <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <p className="text-emerald-400 font-medium">Upload completed!</p>
          <p className="text-sm text-gray-400 mt-1">
            {uploadResult.success || 0} orders created successfully.
            {uploadResult.failed > 0 && ` ${uploadResult.failed} orders failed.`}
          </p>
        </div>
      )}

      <div className="mt-8">
        <h3 className="font-bold text-white mb-4">Upload History</h3>
        <div className="glass-panel rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="p-4 text-sm text-gray-400">Filename</th>
                <th className="p-4 text-sm text-gray-400">Status</th>
                <th className="p-4 text-sm text-gray-400">Success</th>
                <th className="p-4 text-sm text-gray-400">Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  No upload history yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
