import { useState, useEffect } from 'react';

const IOSInstallBanner = () => {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [step, setStep] = useState(0); // 0 = banner, 1 = full guide

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
      if (daysSince < 7) return;
    }

    const timer = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setShow(false);
    setStep(0);
    localStorage.setItem('ios-install-dismissed-at', String(Date.now()));
  };

  if (!isIOS || !show) return null;

  // Full-screen step-by-step guide
  if (step === 1) {
    return (
      <div
        data-testid="ios-install-guide"
        style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '24px 20px', color: '#fff',
          animation: 'iosFadeIn 0.3s ease-out',
        }}
        onClick={dismiss}
      >
        <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 340, width: '100%', textAlign: 'center' }}>
          <img src="/icons/icon-96x96.png" alt="ServisPro" style={{ width: 64, height: 64, borderRadius: 16, margin: '0 auto 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Installer ServisPro</h2>
          <p style={{ fontSize: 14, color: '#aaa', marginBottom: 28 }}>3 étapes simples pour ajouter l'app</p>

          {/* Step 1 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, textAlign: 'left', marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>1</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Appuyez sur le bouton Partager</div>
              <div style={{ fontSize: 13, color: '#aaa', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                Le carré avec la flèche{' '}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                {' '}en bas de Safari
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, textAlign: 'left', marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>2</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Faites défiler et appuyez sur</div>
              <div style={{ fontSize: 13, color: '#aaa', marginTop: 2 }}>
                <strong style={{ color: '#fff' }}>"Sur l'écran d'accueil"</strong>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, textAlign: 'left', marginBottom: 28 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>3</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Appuyez sur "Ajouter"</div>
              <div style={{ fontSize: 13, color: '#aaa', marginTop: 2 }}>L'app ServisPro apparaîtra sur votre écran d'accueil</div>
            </div>
          </div>

          <button
            onClick={dismiss}
            style={{
              width: '100%', padding: '14px', borderRadius: 12,
              background: '#f97316', border: 'none', color: '#fff',
              fontWeight: 700, fontSize: 15, cursor: 'pointer',
            }}
          >
            J'ai compris
          </button>
          <button
            onClick={dismiss}
            style={{ background: 'none', border: 'none', color: '#888', fontSize: 13, marginTop: 12, cursor: 'pointer' }}
          >
            Plus tard
          </button>
        </div>
        <style>{`
          @keyframes iosFadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </div>
    );
  }

  // Bottom banner
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
        onClick={() => setStep(1)}
        data-testid="ios-install-btn"
        style={{
          background: '#f97316', border: 'none', color: '#fff',
          padding: '8px 16px', borderRadius: 8, fontWeight: 700,
          fontSize: 13, cursor: 'pointer', flexShrink: 0,
          whiteSpace: 'nowrap',
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
