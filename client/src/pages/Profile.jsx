import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <Layout>
      <h1 className="text-lg font-medium text-gray-900 mb-5">Profile</h1>
      <div className="bg-white border border-gray-100 rounded p-5 max-w-sm">
        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Name</p>
            <p className="text-sm text-gray-800">{user?.name}</p>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Email</p>
            <p className="text-sm text-gray-800">{user?.email}</p>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded hover:bg-gray-50 transition-colors"
            >
              <i className="ti ti-logout" style={{ fontSize: 14 }} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;