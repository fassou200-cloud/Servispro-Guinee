import { useState, useEffect } from 'react';

const IOSInstallBanner = () => {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Robust iOS detection
    const ua = navigator.userAgent || navigator.vendor || '';
    const platform = navigator.platform || '';

    const isiOS =
      // iPhone, iPad, iPod in user agent
      /iPhone|iPad|iPod/.test(ua) ||
      // iPadOS 13+ reports as Mac with touch
      ((/Macintosh|MacIntel|MacPPC|Mac68K/.test(ua) || /Mac/.test(platform)) && navigator.maxTouchPoints > 1) ||
      // Touch-capable Mac (iPadOS)
      (/Macintosh/.test(ua) && 'ontouchend' in document);

    // Already installed as standalone
    const isStandalone =
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    if (!isiOS || isStandalone) return;

    setIsIOS(true);

    // Check if user dismissed recently (re-show after 7 days)
    const dismissedAt = localStorage.getItem('ios-install-dismissed-at');
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    }

    // Show after short delay
    const timer = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('ios-install-dismissed-at', String(Date.now()));
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
        background: '#fff',
        color: '#1a1a1a',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
        boxShadow: '0 -2px 20px rgba(0,0,0,0.12)',
        borderTop: '1px solid #e5e7eb',
        animation: 'iosSlideUp 0.35s ease-out',
      }}
    >
      <img
        src="/icons/icon-96x96.png"
        alt="ServisPro"
        style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>Installer ServisPro</div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.4, marginTop: 2 }}>
          Appuyez sur{' '}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 1px' }}>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>{' '}
          puis <strong style={{ color: '#111' }}>"Sur l'écran d'accueil"</strong>
        </div>
      </div>
      <button
        onClick={dismiss}
        data-testid="ios-install-close"
        style={{
          background: '#f3f4f6',
          border: 'none',
          color: '#999',
          width: 30,
          height: 30,
          borderRadius: '50%',
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          lineHeight: 1,
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
