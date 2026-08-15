type BfpLoginLoaderProps = {
  theme: "municipal" | "provincial";
};

export function BfpLoginLoader({ theme }: BfpLoginLoaderProps) {
  return (
    <>
      <style>{`
        .bfp-fire-loader-overlay {
          --bfp-loader-primary: #E8331A;
          --bfp-loader-secondary: #FF6B35;
          --bfp-loader-accent: #FFAA00;
          --bfp-loader-backdrop: rgba(0, 0, 0, 0.45);
          --bfp-loader-glow: rgba(217, 27, 16, 0.45);
          position: fixed;
          inset: 0;
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bfp-loader-backdrop);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: bfpLoaderFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .bfp-fire-loader-overlay--provincial {
          --bfp-loader-primary: #0B132B;
          --bfp-loader-secondary: #1C2A4A;
          --bfp-loader-accent: #93A4C7;
          --bfp-loader-glow: rgba(11, 19, 43, 0.7);
        }

        .bfp-fire-loader-stage {
          position: relative;
          display: flex;
          width: 140px;
          height: 140px;
          align-items: center;
          justify-content: center;
          animation: bfpLoaderFloat 2.5s ease-in-out infinite alternate;
        }

        .bfp-fire-loader-ring,
        .bfp-fire-loader-orbit {
          position: absolute;
          border-radius: 50%;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }

        .bfp-fire-loader-ring {
          inset: 0;
          padding: 6.5px;
          background: conic-gradient(from 0deg, var(--bfp-loader-primary) 0%, var(--bfp-loader-secondary) 30%, var(--bfp-loader-accent) 65%, transparent 80%, var(--bfp-loader-primary) 100%);
          filter: drop-shadow(0 0 16px var(--bfp-loader-glow)) drop-shadow(0 0 30px var(--bfp-loader-glow));
          animation: bfpLoaderSpin 1.6s linear infinite;
        }

        .bfp-fire-loader-orbit {
          inset: -7px;
          padding: 2px;
          background: conic-gradient(from 180deg, var(--bfp-loader-accent) 0%, transparent 40%, var(--bfp-loader-primary) 80%, transparent 100%);
          filter: drop-shadow(0 0 10px var(--bfp-loader-glow));
          animation: bfpLoaderSpinReverse 2.4s linear infinite;
        }

        .bfp-fire-loader-glow {
          position: absolute;
          width: 105px;
          height: 105px;
          border-radius: 50%;
          background: radial-gradient(circle, var(--bfp-loader-glow) 0%, transparent 75%);
          animation: bfpLoaderBreathe 1.5s ease-in-out infinite alternate;
        }

        .bfp-fire-loader-flame {
          position: relative;
          z-index: 2;
          display: block;
          width: 64px;
          height: 64px;
          background: var(--bfp-loader-accent);
          -webkit-mask: url("/images/fire%20logo.webp") center / contain no-repeat;
          mask: url("/images/fire%20logo.webp") center / contain no-repeat;
          filter: drop-shadow(0 4px 16px var(--bfp-loader-glow));
          animation: bfpLoaderBreathe 1.5s ease-in-out infinite alternate;
        }

        .bfp-fire-loader-ember {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--bfp-loader-accent);
          box-shadow: 0 0 8px var(--bfp-loader-secondary), 0 0 16px var(--bfp-loader-primary);
          opacity: 0;
        }
        .bfp-fire-loader-ember:nth-of-type(4) { left: 15%; bottom: 20%; animation: bfpLoaderEmber 1.6s ease-out infinite 0.1s; }
        .bfp-fire-loader-ember:nth-of-type(5) { right: 18%; bottom: 25%; animation: bfpLoaderEmber 1.9s ease-out infinite 0.3s; }
        .bfp-fire-loader-ember:nth-of-type(6) { left: 45%; bottom: 10%; animation: bfpLoaderEmber 1.4s ease-out infinite 0.6s; }
        .bfp-fire-loader-ember:nth-of-type(7) { right: 30%; bottom: 15%; animation: bfpLoaderEmber 1.8s ease-out infinite 0.9s; }

        @keyframes bfpLoaderFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bfpLoaderFloat { from { transform: translateY(0) scale(1); } to { transform: translateY(-6px) scale(1.02); } }
        @keyframes bfpLoaderSpin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        @keyframes bfpLoaderSpinReverse { from { transform: rotate(360deg); } to { transform: rotate(0); } }
        @keyframes bfpLoaderBreathe { from { transform: scale(0.96); opacity: 0.85; } to { transform: scale(1.05); opacity: 1; } }
        @keyframes bfpLoaderEmber { 0% { opacity: 0; transform: translateY(0) scale(0.4); } 40% { opacity: 1; transform: translateY(-20px) translateX(6px) scale(1); } 100% { opacity: 0; transform: translateY(-50px) translateX(-8px) scale(0.2); } }

        @media (prefers-reduced-motion: reduce) {
          .bfp-fire-loader-stage, .bfp-fire-loader-ring, .bfp-fire-loader-orbit, .bfp-fire-loader-glow, .bfp-fire-loader-flame, .bfp-fire-loader-ember { animation: none; }
        }
      `}</style>
      <div className={`bfp-fire-loader-overlay bfp-fire-loader-overlay--${theme}`} role="status" aria-live="polite" aria-label="Signing in">
        <div className="bfp-fire-loader-stage" aria-hidden="true">
          <div className="bfp-fire-loader-ring" />
          <div className="bfp-fire-loader-orbit" />
          <div className="bfp-fire-loader-glow" />
          <div className="bfp-fire-loader-ember" />
          <div className="bfp-fire-loader-ember" />
          <div className="bfp-fire-loader-ember" />
          <div className="bfp-fire-loader-ember" />
          <span className="bfp-fire-loader-flame" />
        </div>
      </div>
    </>
  );
}
