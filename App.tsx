import React from 'react';
import AppNavigator from './AppNavigator';
import { UploadProvider } from './context/UploadContext';

export default function App() {
  return (
    <UploadProvider>
      <AppNavigator />
    </UploadProvider>
  );
}
