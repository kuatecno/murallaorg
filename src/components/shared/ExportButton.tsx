'use client';

import { useState } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import apiClient from '@/lib/api-client';

interface ExportButtonProps {
  endpoint: string;
  filename?: string;
  className?: string;
  variant?: 'primary' | 'secondary';
}

export default function ExportButton({ 
  endpoint, 
  filename = 'export', 
  className = '',
  variant = 'secondary'
}: ExportButtonProps) {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      setIsExporting(true);
      setShowDropdown(false);

      const response = await apiClient.get(`${endpoint}?format=${format}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the blob data
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename based on format
      const date = new Date().toISOString().split('T')[0];
      link.download = `${filename}-${date}.${format}`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export error:', error);
      alert(t('errors.exportFailed'));
    } finally {
      setIsExporting(false);
    }
  };

  const baseClasses = variant === 'primary' 
    ? 'bg-blue-600 hover:bg-blue-700 text-white'
    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300';

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isExporting}
        className={`
          px-4 py-2 rounded-lg text-sm font-medium transition-colors
          flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed
          ${baseClasses} ${className}
        `}
      >
        {isExporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
            <span>{t('common.exporting')}</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{t('common.export')}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {showDropdown && !isExporting && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            <button
              onClick={() => handleExport('json')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
            >
              <span className="text-blue-600">📄</span>
              <div>
                <div className="font-medium">{t('export.json')}</div>
                <div className="text-xs text-gray-500">{t('export.jsonDesc')}</div>
              </div>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
            >
              <span className="text-green-600">📊</span>
              <div>
                <div className="font-medium">{t('export.csv')}</div>
                <div className="text-xs text-gray-500">{t('export.csvDesc')}</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
