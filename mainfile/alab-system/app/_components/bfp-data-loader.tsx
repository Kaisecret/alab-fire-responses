'use client';

type BfpDataLoaderProps = {
  theme?: 'municipal' | 'provincial';
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  subtitle?: string;
  minHeight?: string | number;
  className?: string;
};

export function BfpDataLoader({
  theme = 'municipal',
  size = 'md',
  title = 'Connecting to Live Telemetry…',
  subtitle,
  minHeight = '280px',
  className = '',
}: BfpDataLoaderProps) {
  const stageSize = size === 'sm' ? 76 : size === 'lg' ? 130 : 100;
  const flameSize = size === 'sm' ? 36 : size === 'lg' ? 62 : 48;
  const ringPadding = size === 'sm' ? '3.5px' : size === 'lg' ? '5.5px' : '4.5px';

  return (
    <>
      <style>{`
        .bfp-data-loader-container {
          --bfp-dloader-primary: #E8331A;
          --bfp-dloader-secondary: #FF6B35;
          --bfp-dloader-accent: #FFAA00;
          --bfp-dloader-glow: rgba(220, 38, 38, 0.3);
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2.25rem 1.25rem;
          box-sizing: border-box;
          text-align: center;
          position: relative;
        }

        .bfp-data-loader-container--provincial {
          --bfp-dloader-primary: #0B132B;
          --bfp-dloader-secondary: #1C2A4A;
          --bfp-dloader-accent: #93A4C7;
          --bfp-dloader-glow: rgba(11, 19, 43, 0.35);
        }

        .bfp-data-loader-stage {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: bfpDataFloat 2.4s ease-in-out infinite alternate;
          margin-bottom: 1rem;
        }

        .bfp-data-loader-ring,
        .bfp-data-loader-orbit {
          position: absolute;
          border-radius: 50%;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }

        .bfp-data-loader-ring {
          inset: 0;
          background: conic-gradient(from 0deg, var(--bfp-dloader-primary) 0%, var(--bfp-dloader-secondary) 30%, var(--bfp-dloader-accent) 65%, transparent 80%, var(--bfp-dloader-primary) 100%);
          filter: drop-shadow(0 0 12px var(--bfp-dloader-glow)) drop-shadow(0 0 24px var(--bfp-dloader-glow));
          animation: bfpDataSpin 1.6s linear infinite;
        }

        .bfp-data-loader-orbit {
          inset: -5px;
          padding: 2px;
          background: conic-gradient(from 180deg, var(--bfp-dloader-accent) 0%, transparent 40%, var(--bfp-dloader-primary) 80%, transparent 100%);
          filter: drop-shadow(0 0 8px var(--bfp-dloader-glow));
          animation: bfpDataSpinReverse 2.4s linear infinite;
        }

        .bfp-data-loader-glow {
          position: absolute;
          width: 75%;
          height: 75%;
          border-radius: 50%;
          background: radial-gradient(circle, var(--bfp-dloader-glow) 0%, transparent 75%);
          animation: bfpDataBreathe 1.5s ease-in-out infinite alternate;
        }

        .bfp-data-loader-flame {
          position: relative;
          z-index: 2;
          display: block;
          background: var(--bfp-dloader-accent);
          -webkit-mask: url("/images/fire%20logo.webp") center / contain no-repeat;
          mask: url("/images/fire%20logo.webp") center / contain no-repeat;
          filter: drop-shadow(0 3px 12px var(--bfp-dloader-glow));
          animation: bfpDataBreathe 1.5s ease-in-out infinite alternate;
        }

        .bfp-data-loader-ember {
          position: absolute;
          width: 3.5px;
          height: 3.5px;
          border-radius: 50%;
          background: var(--bfp-dloader-accent);
          box-shadow: 0 0 6px var(--bfp-dloader-secondary), 0 0 12px var(--bfp-dloader-primary);
          opacity: 0;
        }
        .bfp-data-loader-ember:nth-of-type(4) { left: 15%; bottom: 20%; animation: bfpDataEmber 1.6s ease-out infinite 0.1s; }
        .bfp-data-loader-ember:nth-of-type(5) { right: 18%; bottom: 25%; animation: bfpDataEmber 1.9s ease-out infinite 0.3s; }
        .bfp-data-loader-ember:nth-of-type(6) { left: 45%; bottom: 10%; animation: bfpDataEmber 1.4s ease-out infinite 0.6s; }
        .bfp-data-loader-ember:nth-of-type(7) { right: 30%; bottom: 15%; animation: bfpDataEmber 1.8s ease-out infinite 0.9s; }

        .bfp-data-loader-title {
          font-size: 0.92rem;
          font-weight: 800;
          color: #0F172A;
          letter-spacing: -0.01em;
          margin: 0;
          line-height: 1.3;
        }

        .bfp-data-loader-subtitle {
          font-size: 0.78rem;
          font-weight: 500;
          color: #64748B;
          margin: 0.3rem 0 0;
          max-width: 380px;
          line-height: 1.45;
        }

        @keyframes bfpDataFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bfpDataFloat { from { transform: translateY(0) scale(1); } to { transform: translateY(-4px) scale(1.02); } }
        @keyframes bfpDataSpin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        @keyframes bfpDataSpinReverse { from { transform: rotate(360deg); } to { transform: rotate(0); } }
        @keyframes bfpDataBreathe { from { transform: scale(0.96); opacity: 0.85; } to { transform: scale(1.05); opacity: 1; } }
        @keyframes bfpDataEmber { 0% { opacity: 0; transform: translateY(0) scale(0.4); } 40% { opacity: 1; transform: translateY(-16px) translateX(5px) scale(1); } 100% { opacity: 0; transform: translateY(-38px) translateX(-6px) scale(0.2); } }

        @media (prefers-reduced-motion: reduce) {
          .bfp-data-loader-stage, .bfp-data-loader-ring, .bfp-data-loader-orbit, .bfp-data-loader-glow, .bfp-data-loader-flame, .bfp-data-loader-ember { animation: none; }
        }
      `}</style>

      <div
        className={`bfp-data-loader-container bfp-data-loader-container--${theme} ${className}`}
        style={{ minHeight }}
        role="status"
        aria-live="polite"
        aria-label={title}
      >
        <div
          className="bfp-data-loader-stage"
          style={{ width: `${stageSize}px`, height: `${stageSize}px` }}
          aria-hidden="true"
        >
          <div className="bfp-data-loader-ring" style={{ padding: ringPadding }} />
          <div className="bfp-data-loader-orbit" />
          <div className="bfp-data-loader-glow" />
          <div className="bfp-data-loader-ember" />
          <div className="bfp-data-loader-ember" />
          <div className="bfp-data-loader-ember" />
          <div className="bfp-data-loader-ember" />
          <span
            className="bfp-data-loader-flame"
            style={{ width: `${flameSize}px`, height: `${flameSize}px` }}
          />
        </div>

        {title && <h4 className="bfp-data-loader-title">{title}</h4>}
        {subtitle && <p className="bfp-data-loader-subtitle">{subtitle}</p>}
      </div>
    </>
  );
}
