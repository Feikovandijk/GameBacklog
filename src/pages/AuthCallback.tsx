import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { handleSteamCallback, user, error } = useAuth();
  const effectRan = useRef(false);

  useEffect(() => {
    // This effect should only run once on component mount.
    // The ref prevents it from running twice in development with StrictMode.
    if (effectRan.current === false) {
      const processAuth = async () => {
        await handleSteamCallback();
      };
      processAuth();
      effectRan.current = true;
    }
  }, [handleSteamCallback]);

  useEffect(() => {
    // This effect navigates after the callback has been processed.
    if (!effectRan.current) {
      // Don't navigate until the auth process has started.
      return;
    }

    if (user) {
      navigate('/');
    } else if (error) {
      // Adding a small delay so the user can see the error if they are watching closely.
      setTimeout(() => navigate('/login'), 1500);
    }
  }, [user, error, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Finalizing login...</p>
        {error && <p className="mt-2 text-red-600">Error: {error}</p>}
      </div>
    </div>
  );
};

export default AuthCallback; 