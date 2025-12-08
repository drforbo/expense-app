import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface UploadState {
  isUploading: boolean;
  filename: string | null;
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  result: {
    transactions_found: number;
    transactions_saved: number;
    duplicates_skipped: number;
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

  const startUpload = useCallback(async (file: { uri: string; name: string; size?: number }) => {
    try {
      setUploadState({
        isUploading: true,
        filename: file.name,
        status: 'uploading',
        result: null,
        error: null,
      });

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in');
      }

      console.log('Uploading file:', file.name, 'Size:', file.size);

      setUploadState(prev => ({ ...prev, status: 'processing' }));

      // Create form data
      const formData = new FormData();
      formData.append('pdf', {
        uri: file.uri,
        type: 'application/pdf',
        name: file.name,
      } as any);
      formData.append('user_id', user.id);

      // Upload to server
      const response = await fetch(`${API_URL}/api/upload_statement`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();

      if (data.success) {
        setUploadState({
          isUploading: false,
          filename: file.name,
          status: 'complete',
          result: {
            transactions_found: data.transactions_found,
            transactions_saved: data.transactions_saved,
            duplicates_skipped: data.duplicates_skipped,
          },
          error: null,
        });
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
