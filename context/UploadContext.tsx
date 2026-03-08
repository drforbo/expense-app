import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { apiUpload, apiPost } from '../lib/api';

interface UploadState {
  isUploading: boolean;
  filename: string | null;
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  result: {
    transaction_count: number;
  } | null;
  error: string | null;
}

interface UploadContextType {
  uploadState: UploadState;
  startUpload: (file: { uri: string; name: string; size?: number }) => Promise<void>;
  clearUpload: () => void;
}

const initialState: UploadState = {
  isUploading: false,
  filename: null,
  status: 'idle',
  result: null,
  error: null,
};

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [uploadState, setUploadState] = useState<UploadState>(initialState);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const pollStatementStatus = (statementId: string, filename: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const data = await apiPost('/api/statement_status', { statement_id: statementId });

        if (data.status === 'completed') {
          stopPolling();
          setUploadState({
            isUploading: false,
            filename,
            status: 'complete',
            result: { transaction_count: data.transaction_count || 0 },
            error: null,
          });
        } else if (data.status === 'error') {
          stopPolling();
          setUploadState({
            isUploading: false,
            filename,
            status: 'error',
            result: null,
            error: 'Processing failed. Please try again.',
          });
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000);
  };

  const startUpload = useCallback(async (file: { uri: string; name: string; size?: number }) => {
    try {
      setUploadState({
        isUploading: true,
        filename: file.name,
        status: 'uploading',
        result: null,
        error: null,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in');

      console.log('Uploading file:', file.name, 'Size:', file.size);

      const formData = new FormData();
      formData.append('pdf', {
        uri: file.uri,
        type: 'application/pdf',
        name: file.name,
      } as any);
      formData.append('user_id', user.id);

      const data = await apiUpload('/api/upload_statement', formData);

      if (data.success) {
        setUploadState(prev => ({ ...prev, status: 'processing' }));
        pollStatementStatus(data.statement_id, file.name);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Error uploading:', error);
      setUploadState({
        isUploading: false,
        filename: file.name,
        status: 'error',
        result: null,
        error: error.message || 'Failed to upload statement',
      });
    }
  }, []);

  const clearUpload = useCallback(() => {
    stopPolling();
    setUploadState(initialState);
  }, []);

  return (
    <UploadContext.Provider value={{ uploadState, startUpload, clearUpload }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
