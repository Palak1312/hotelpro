import React, { createContext, useContext, useState, useEffect } from 'react';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hp_admin_token');
    const stored = localStorage.getItem('hp_admin_info');
    if (token && stored) {
      try { setAdmin(JSON.parse(stored)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const login = (token, adminInfo) => {
    localStorage.setItem('hp_admin_token', token);
    localStorage.setItem('hp_admin_info', JSON.stringify(adminInfo));
    setAdmin(adminInfo);
  };

  const logout = () => {
    localStorage.removeItem('hp_admin_token');
    localStorage.removeItem('hp_admin_info');
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => useContext(AdminAuthContext);
