import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './shared/store/AuthContext';
import { ToastProvider } from './shared/components/Toast';
import { router } from './router';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </ToastProvider>
    </AuthProvider>
  );
}

