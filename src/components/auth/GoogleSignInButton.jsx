import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

const GOOGLE_G_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export default function GoogleSignInButton({
  onSuccess,
  onError,
  isLoading = false,
  disabled = false,
  text = 'continue_with', // 'signin_with' | 'signup_with' | 'continue_with'
  showDivider = true,
  dividerText = 'or continue with email'
}) {
  const containerRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [isConfigured, setIsConfigured] = useState(true);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const isDummyClient = !clientId || clientId.includes('your-google-oauth-client-id');

  // Load official Google Identity Services script
  useEffect(() => {
    if (isDummyClient) {
      setIsConfigured(false);
      return;
    }
    setIsConfigured(true);

    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
      return;
    }

    const existingScript = document.getElementById('google-gsi-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => setScriptLoaded(true));
      existingScript.addEventListener('error', () =>
        setLoadError('Failed to load Google Identity Services. Check your connection or ad blocker.')
      );
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      setLoadError('Failed to load Google Identity Services. Check network connectivity or ad blocker.');
    };
    document.head.appendChild(script);
  }, [clientId, isDummyClient]);

  // Handle Google callback safely
  const handleCredentialResponse = useCallback(
    (response) => {
      if (!response || !response.credential) {
        if (onError) onError(new Error('No Google credential returned. Sign-in cancelled.'));
        return;
      }
      if (onSuccess) {
        onSuccess(response.credential);
      }
    },
    [onSuccess, onError]
  );

  // Initialize and render official Google button
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || isDummyClient) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // Render official Google button into container
      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: text,
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 360
      });
    } catch (err) {
      console.warn('Google Identity Services render error:', err);
      setLoadError('Unable to render Google Sign-In button: ' + err.message);
    }
  }, [scriptLoaded, clientId, handleCredentialResponse, text, isDummyClient]);

  return (
    <div className="w-full space-y-4">
      {/* 1. Unconfigured Environment Warning (Development/Setup Helper) */}
      {!isConfigured && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
            <div className="space-y-1">
              <p className="font-bold">Google Sign-In Configuration Required</p>
              <p className="text-[11px] leading-relaxed text-amber-800">
                To enable Google authentication, configure <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-amber-900 font-bold">VITE_GOOGLE_CLIENT_ID</code> in your frontend <code className="font-mono">.env</code> file.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Script Load Error Alert */}
      {loadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 animate-in fade-in flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-red-600 flex-shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-1 font-bold text-red-700 hover:text-red-900 text-[11px] underline"
          >
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 3. Official Google Button or Branded Loading Placeholder */}
      {isConfigured && !loadError && (
        <div className="relative w-full">
          {/* Official Google Button Render Target */}
          <div
            ref={containerRef}
            className={`w-full flex justify-center min-h-[44px] transition-opacity duration-200 ${
              isLoading || disabled || !scriptLoaded ? 'pointer-events-none opacity-50' : 'opacity-100'
            }`}
          />

          {/* Loading / Submission Overlay */}
          {(isLoading || !scriptLoaded) && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/95 border border-slate-200 py-2.5 px-4 shadow-sm text-xs font-bold text-[#082B61]">
              <div className="flex items-center gap-2.5">
                <Loader2 size={16} className="animate-spin text-[#2563EB]" />
                <span>
                  {isLoading ? 'Authenticating with Google...' : 'Loading Google Identity...'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Divider */}
      {showDivider && (
        <div className="relative my-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-slate-400 font-medium tracking-wide">
              {dividerText}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
