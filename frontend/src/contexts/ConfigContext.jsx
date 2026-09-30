import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const ConfigContext = createContext(null);

export function ConfigProvider({ children }) {
  const { usuario, loading: authLoading } = useAuth();
  const [config, setConfig] = useState({});
  const [loadingConfig, setLoadingConfig] = useState(true);

  const fetchConfig = async () => {
    try {
      const { data } = await api.get('/configuracion');
      setConfig(data);
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error('Error cargando configuración global:', err);
      }
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!usuario) {
      setLoadingConfig(false);
      return;
    }
    fetchConfig();
  }, [usuario, authLoading]);

  return (
    <ConfigContext.Provider value={{ config, refreshConfig: fetchConfig, loadingConfig }}>
      {children}
    </ConfigContext.Provider>
  ); 
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig debe usarse dentro de un <ConfigProvider>');
  }
  return context;
}
