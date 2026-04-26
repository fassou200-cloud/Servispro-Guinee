import { useState, useEffect } from 'react';

const IOSInstallBanner = () => {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ua = navigator.userAgent || '';
    const isiOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
      (/Macintosh/.test(ua) && 'ontouchend' in document);

    // Detect standalone (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (!isiOS || isStandalone) return;

    setIsIOS(true);

    // Check if dismissed
    const dismissed = localStorage.getItem('ios-install-dismissed');
    if (dismissed) return;

    // Show after 2.5 seconds
    const timer = setTimeout(() => setShow(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('ios-install-dismissed', 'true');
  };

  if (!isIOS || !show) return null;

  return (
    <div
      data-testid="ios-install-banner"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px',
        animation: 'iosSlideUp 0.4s ease-out',
      }}
    >
      <img
        src="/icons/icon-96x96.png"
        alt="ServisPro"
        style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Installer ServisPro</div>
        <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.4, marginTop: 2 }}>
          Appuyez sur{' '}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 2px' }}>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
          </svg>{' '}
          puis <strong>"Sur l'écran d'accueil"</strong>
        </div>
      </div>
      <button
        onClick={dismiss}
        data-testid="ios-install-close"
        style={{
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          color: '#fff',
          width: 28,
          height: 28,
          borderRadius: '50%',
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        ×
      </button>
      <style>{`
        @keyframes iosSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default IOSInstallBanner;
