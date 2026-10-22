import { useI18n } from '@/i18n/I18nProvider';
import { useEffect, useRef, useState } from 'react';

/** Minimal typing for the browser BarcodeDetector API (Chrome/Edge on Android, ChromeOS, macOS). */
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike;
  }
}

export const cameraScanSupported = () => typeof window !== 'undefined' && !!window.BarcodeDetector && !!navigator.mediaDevices;

/**
 * Camera QR scanner using the native BarcodeDetector (no library). Falls back to manual input
 * where unsupported (Firefox, iOS Safari). Week 4 stretch: use a library for full browser coverage.
 */
export function QrScanner({ onResult }: { onResult: (value: string) => void }) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let stream: MediaStream | undefined;
    let stopped = false;
    let last = '';
    const detector = new window.BarcodeDetector!({ formats: ['qr_code'] });

    const loop = async () => {
      if (stopped || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        const value = codes[0]?.rawValue;
        if (value && value !== last) {
          last = value; // avoid firing 30 times/second for the same ticket
          onResult(value);
          setTimeout(() => (last = ''), 2500);
        }
      } catch {
        /* frame not ready */
      }
      requestAnimationFrame(loop);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          void videoRef.current.play();
          loop();
        }
      })
      .catch(() => setError(t('staff.cameraError')));

    return () => {
      stopped = true;
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [onResult, t]);

  if (error) return <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} muted playsInline className="aspect-square w-full object-cover" />
      <div className="pointer-events-none absolute inset-[18%] rounded-3xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
    </div>
  );
}
