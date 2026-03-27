import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';

const DEFAULT_PUBLIC_URL = 'https://epsa.millionstrongmen.com/';

const ShareQrCode = ({
  url,
  title = 'Scan to open ePSA',
  subtitle = 'Use your phone camera to open the app.',
  className = '',
  size = 120,
  clickable = false,
}) => {
  const [qrSrc, setQrSrc] = useState('');

  const targetUrl = useMemo(() => {
    const explicitUrl = typeof url === 'string' ? url.trim() : '';
    if (explicitUrl) return explicitUrl;

    const envUrl =
      typeof import.meta !== 'undefined' &&
      import.meta?.env &&
      typeof import.meta.env.VITE_PUBLIC_APP_URL === 'string'
        ? import.meta.env.VITE_PUBLIC_APP_URL.trim()
        : '';
    if (envUrl) return envUrl;

    if (typeof window !== 'undefined' && window?.location?.origin) {
      const origin = window.location.origin;
      const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
      return isLocalhost ? DEFAULT_PUBLIC_URL : origin;
    }
    return DEFAULT_PUBLIC_URL;
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    if (!targetUrl) {
      setQrSrc('');
      return () => {
        cancelled = true;
      };
    }

    QRCode.toDataURL(targetUrl, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f4f7a',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrSrc(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrSrc('');
      });

    return () => {
      cancelled = true;
    };
  }, [targetUrl, size]);

  if (!targetUrl) return null;

  return (
    <div className={`share-qr ${className}`.trim()}>
      <div className="share-qr__content">
        <div className="share-qr__text">
          <div className="share-qr__title">{title}</div>
          {subtitle ? <div className="share-qr__subtitle">{subtitle}</div> : null}
        </div>
        <a
          href={targetUrl}
          className={`share-qr__code-wrap ${clickable ? 'share-qr__code-wrap--clickable' : ''}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${targetUrl}`}
          title="Open link"
        >
          {qrSrc ? (
            <img
              src={qrSrc}
              alt={`QR code for ${targetUrl}`}
              className="share-qr__code"
              width={size}
              height={size}
            />
          ) : (
            <div className="share-qr__fallback">QR unavailable</div>
          )}
        </a>
      </div>
      <a href={targetUrl} className="share-qr__url" target="_blank" rel="noopener noreferrer">
        {targetUrl}
      </a>
    </div>
  );
};

export default ShareQrCode;
