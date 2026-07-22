import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const ConfigContext = createContext(null);

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState({});
  const [loadingConfig, setLoadingConfig] = useState(true);

  const fetchConfig = async () => {
    try {
      const { data } = await api.get('/configuracion');
      setConfig(data);
    } catch (err) {
      console.error('Error cargando configuración global:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <ConfigContext.Provider value={{ config, refreshConfig: fetchConfig, loadingConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}
