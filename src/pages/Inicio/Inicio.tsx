import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Download, BookOpen, Flame } from 'lucide-react';
import './Inicio.css';

const GITHUB_REPO_API = 'https://api.github.com/repos/FabriB99/app-escritorio-bvvm/releases/latest';
const normalizeVersion = (version: string) => version.trim().replace(/^v/, '');
const MANUAL_VERSION = '0.2.7';

const Inicio: React.FC = () => {
  const navigate = useNavigate();
  const [currentVersion, setCurrentVersion] = useState('Cargando...');
  const [latestVersion, setLatestVersion] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const isTauri = typeof window.__TAURI_IPC__ !== 'undefined';
        let version = MANUAL_VERSION;
        if (isTauri) {
          const { getVersion } = await import('@tauri-apps/api/app');
          version = await getVersion();
        }
        setCurrentVersion(version);
        const res = await axios.get(GITHUB_REPO_API);
        const latestTag = res.data.tag_name || '';
        const asset = res.data.assets?.[0];
        if (asset) setDownloadUrl(asset.browser_download_url);
        setLatestVersion(latestTag);
        if (normalizeVersion(latestTag) !== normalizeVersion(version)) {
          setUpdateAvailable(true);
        }
      } catch (err) {
        console.error('Error verificando versión:', err);
        setCurrentVersion(MANUAL_VERSION);
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
          <div className="inicio-tarjeta biblioteca" onClick={() => navigate('/biblioteca-login')}>
            <BookOpen size={56} color="#7cb5ff" strokeWidth={1.5} />
            <h2>Biblioteca Virtual</h2>
          </div>
          <div className="inicio-tarjeta control" onClick={() => navigate('/login')}>
            <Flame size={56} color="#e63946" strokeWidth={1.5} />
            <h2>Control BVVM</h2>
          </div>
        </div>
      </div>

      <div className="version-info">v{currentVersion}</div>

      {updateAvailable && (
        <div
          className="update-banner"
          onClick={() => window.open(downloadUrl, '_blank')}
          title="Click para descargar la nueva versión"
        >
          <Download size={16} />
          Nueva versión disponible: {latestVersion}
        </div>
      )}
    </div>
  );
};

export default Inicio;