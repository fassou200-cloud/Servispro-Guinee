import { useState, useEffect } from 'react';

const IOSInstallBanner = () => {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || '';
    const platform = navigator.platform || '';
    const isiOS =
      /iPhone|iPad|iPod/.test(ua) ||
      ((/Macintosh|MacIntel|MacPPC|Mac68K/.test(ua) || /Mac/.test(platform)) && navigator.maxTouchPoints > 1) ||
      (/Macintosh/.test(ua) && 'ontouchend' in document);

    const isStandalone =
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    if (!isiOS || isStandalone) return;
    setIsIOS(true);

    const dismissedAt = localStorage.getItem('ios-install-dismissed-at');
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < 3) return;
    }

    const timer = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setShow(false);
    setShowGuide(false);
    localStorage.setItem('ios-install-dismissed-at', String(Date.now()));
  };

  if (!isIOS || !show) return null;

  // Full-screen step-by-step guide with arrow pointing to share button
  if (showGuide) {
    return (
      <div
        data-testid="ios-install-guide"
        style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)',
          display: 'flex', flexDirection: 'column',
          padding: '0', color: '#fff',
          animation: 'iosFadeIn 0.3s ease-out',
          overflow: 'auto',
        }}
      >
        {/* Top section with steps */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
          <img src="/icons/icon-96x96.png" alt="ServisPro" style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }} />
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, textAlign: 'center' }}>Installer ServisPro</h2>
          <p style={{ fontSize: 14, color: '#999', marginBottom: 32, textAlign: 'center' }}>Suivez ces 3 étapes</p>

          <div style={{ maxWidth: 320, width: '100%' }}>
            {/* Step 1 */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 24, alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>1</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  Appuyez sur{' '}
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </div>
                <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>
                  Le bouton en haut à droite de Safari
                </div>
              </div>
            </div>

            {/* Step 2 - IMPORTANT */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 24, alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>2</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Cherchez et appuyez sur</div>
                <div style={{ background: '#1e293b', borderRadius: 10, padding: '10px 14px', marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Sur l'écran d'accueil</span>
                </div>
                <div style={{ fontSize: 12, color: '#ef4444', marginTop: 6, fontWeight: 600 }}>
                  Attention : ne pas choisir "Liste de lecture" !
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>3</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Appuyez sur "Ajouter"</div>
                <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>ServisPro apparaîtra sur votre écran d'accueil comme une app</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom buttons */}
        <div style={{ padding: '0 20px 32px', maxWidth: 340, width: '100%', margin: '0 auto' }}>
          <button
            onClick={dismiss}
            style={{ width: '100%', padding: 15, borderRadius: 14, background: '#f97316', border: 'none', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
          >
            J'ai compris
          </button>
          <button
            onClick={dismiss}
            style={{ width: '100%', background: 'none', border: 'none', color: '#666', fontSize: 14, marginTop: 14, cursor: 'pointer', padding: 8 }}
          >
            Plus tard
          </button>
        </div>

        {/* Arrow pointing to share button (top-right of Safari) */}
        <div style={{
          position: 'fixed', top: 8, right: 40,
          animation: 'iosBounce 1.5s ease-in-out infinite',
        }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M20 30 L20 8" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
            <path d="M12 16 L20 8 L28 16" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <style>{`
          @keyframes iosFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes iosBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
      </div>
    );
  }

  // Bottom banner with "Installer" button
  return (
    <div
      data-testid="ios-install-banner"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99999,
        background: '#fff', color: '#1a1a1a',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
        paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
        boxShadow: '0 -2px 20px rgba(0,0,0,0.12)',
        borderTop: '1px solid #e5e7eb',
        animation: 'iosSlideUp 0.35s ease-out',
      }}
    >
      <img src="/icons/icon-96x96.png" alt="ServisPro" style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>Installer ServisPro</div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.4, marginTop: 2 }}>
          Ajoutez l'app à votre écran d'accueil
        </div>
      </div>
      <button
        onClick={() => setShowGuide(true)}
        data-testid="ios-install-btn"
        style={{
          background: '#f97316', border: 'none', color: '#fff',
          padding: '10px 18px', borderRadius: 10, fontWeight: 700,
          fontSize: 14, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
        }}
      >
        Installer
      </button>
      <button
        onClick={dismiss}
        data-testid="ios-install-close"
        style={{
          background: '#f3f4f6', border: 'none', color: '#999',
          width: 28, height: 28, borderRadius: '50%', fontSize: 16,
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}
      >
        ×
      </button>
      <style>{`
        @keyframes iosSlideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default IOSInstallBanner;
