import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { app } from '@tauri-apps/api';
import axios from 'axios';
import { FiDownload } from 'react-icons/fi';
import { GiFlame } from 'react-icons/gi';
import { FaBookReader } from 'react-icons/fa';

import './Inicio.css';

const GITHUB_REPO_API = 'https://api.github.com/repos/FabriB99/app-escritorio-bvvm/releases/latest';

const normalizeVersion = (version: string) => version.trim().replace(/^v/, '');

const Inicio: React.FC = () => {
  const navigate = useNavigate();

  const [currentVersion, setCurrentVersion] = useState('Cargando...');
  const [latestVersion, setLatestVersion] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        // Obtener versión actual desde Tauri
        const version = await app.getVersion();
        setCurrentVersion(version);

        // Obtener versión más reciente desde GitHub
        const res = await axios.get(GITHUB_REPO_API);
        const latestTag = res.data.tag_name || '';
        const normalizedCurrent = normalizeVersion(version);
        const normalizedLatest = normalizeVersion(latestTag);

        // Guardar link de descarga
        const asset = res.data.assets?.[0];
        if (asset) {
          setDownloadUrl(asset.browser_download_url);
        }

        setLatestVersion(latestTag);

        // Comparar versiones
        if (normalizedLatest && normalizedLatest !== normalizedCurrent) {
          setUpdateAvailable(true);
        }
      } catch (err) {
        console.error('Error verificando versión:', err);
        setCurrentVersion('No disponible');
      }
    };

    checkVersion();
  }, []);

  return (
    <div className="inicio-glass-page">
      <div className="inicio-glass-container">
        <img src="/logo-bomberos.png" alt="Logo BVVM" className="inicio-logo-grande" />
        <h1 className="inicio-nombre-cuartel">Bomberos Voluntarios Villa María</h1>
        <div className="inicio-tarjetas-container">
          <div className="inicio-tarjeta biblioteca" onClick={() => navigate('/biblioteca-login')} style={{ flexDirection: 'column' }}>
            <FaBookReader size={60} color="#7cb5ff" />
            <h2 style={{ marginTop: '12px' }}>Biblioteca Virtual</h2>
          </div>
          <div className="inicio-tarjeta control" onClick={() => navigate('/login')} style={{ flexDirection: 'column' }}>
            <GiFlame size={60} color="#7cb5ff" />
            <h2 style={{ marginTop: '12px' }}>Control BVVM</h2>
          </div>
        </div>
      </div>

      <div className="version-info">Versión actual: {currentVersion}</div>

      {updateAvailable && (
        <div
          className="update-banner"
          onClick={() => window.open(downloadUrl, '_blank')}
          title="Click para descargar la nueva versión"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
        >
          <FiDownload size={20} color="#1E90FF" />
          Nueva versión disponible: {latestVersion} — Click para descargar
        </div>
      )}
    </div>
  );
};

export default Inicio;
