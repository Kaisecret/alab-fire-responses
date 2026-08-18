type ResidentFireLoaderProps = {
  label: string;
};

const styles = `
  .resident-fire-loader-overlay{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;background:rgba(8,15,31,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);animation:residentFireLoaderFade .2s ease-out both}
  .resident-fire-loader-stage{position:relative;width:140px;height:140px;display:grid;place-items:center;animation:residentFireLoaderFloat 2.5s ease-in-out infinite alternate}
  .resident-fire-loader-ring{position:absolute;inset:0;border-radius:50%;padding:6.5px;background:conic-gradient(from 0deg,#E23632 0%,#FF6B35 30%,#FFAA00 65%,transparent 80%,#E23632 100%);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:residentFireLoaderSpin 1.6s linear infinite;filter:drop-shadow(0 0 16px rgba(226,54,50,.95)) drop-shadow(0 0 30px rgba(255,107,53,.7))}
  .resident-fire-loader-orbit{position:absolute;inset:-7px;border-radius:50%;padding:2px;background:conic-gradient(from 180deg,rgba(255,170,0,.85) 0%,transparent 40%,rgba(226,54,50,.7) 80%,transparent 100%);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:residentFireLoaderSpinReverse 2.4s linear infinite;filter:drop-shadow(0 0 10px rgba(255,120,40,.6))}
  .resident-fire-loader-glow{position:absolute;width:105px;height:105px;border-radius:50%;background:radial-gradient(circle,rgba(226,54,50,.35) 0%,rgba(255,107,53,.12) 65%,transparent 80%);animation:residentFireLoaderBreathe 1.5s ease-in-out infinite alternate}
  .resident-fire-loader-logo{position:relative;z-index:2;width:72px;height:72px;object-fit:contain;filter:drop-shadow(0 4px 16px rgba(226,54,50,.55));animation:residentFireLoaderBreathe 1.5s ease-in-out infinite alternate}
  .resident-fire-loader-ember{position:absolute;width:4px;height:4px;background:#FFAE00;border-radius:50%;box-shadow:0 0 8px #FF5100,0 0 16px #FF1A00;opacity:0}
  .resident-fire-loader-ember:nth-of-type(1){left:15%;bottom:20%;animation:residentFireLoaderEmber 1.6s ease-out infinite .1s}.resident-fire-loader-ember:nth-of-type(2){right:18%;bottom:25%;animation:residentFireLoaderEmber 1.9s ease-out infinite .3s}.resident-fire-loader-ember:nth-of-type(3){left:45%;bottom:10%;animation:residentFireLoaderEmber 1.4s ease-out infinite .6s}.resident-fire-loader-ember:nth-of-type(4){right:30%;bottom:15%;animation:residentFireLoaderEmber 1.8s ease-out infinite .9s}
  .resident-fire-loader-label{position:absolute;top:calc(100% + 1.2rem);left:50%;width:max-content;max-width:min(85vw,22rem);transform:translateX(-50%);margin:0;color:#fff;font:700 .92rem/1.4 "Plus Jakarta Sans",Arial,sans-serif;text-align:center;text-shadow:0 2px 10px rgba(0,0,0,.42)}
  @keyframes residentFireLoaderFade{from{opacity:0}to{opacity:1}}@keyframes residentFireLoaderFloat{from{transform:translateY(0) scale(1)}to{transform:translateY(-6px) scale(1.02)}}@keyframes residentFireLoaderSpin{to{transform:rotate(360deg)}}@keyframes residentFireLoaderSpinReverse{from{transform:rotate(360deg)}to{transform:rotate(0)}}@keyframes residentFireLoaderBreathe{from{transform:scale(.96);opacity:.85}to{transform:scale(1.05);opacity:1}}@keyframes residentFireLoaderEmber{0%{opacity:0;transform:translateY(0) scale(.4)}40%{opacity:1;transform:translateY(-20px) translateX(6px) scale(1)}100%{opacity:0;transform:translateY(-50px) translateX(-8px) scale(.2)}}
`;

export function ResidentFireLoader({ label }: ResidentFireLoaderProps) {
  return (
    <>
      <style>{styles}</style>
      <div className="resident-fire-loader-overlay" role="status" aria-live="polite" aria-label={label}>
        <div className="resident-fire-loader-stage">
          <div className="resident-fire-loader-ring" />
          <div className="resident-fire-loader-orbit" />
          <div className="resident-fire-loader-glow" />
          <span className="resident-fire-loader-ember" />
          <span className="resident-fire-loader-ember" />
          <span className="resident-fire-loader-ember" />
          <span className="resident-fire-loader-ember" />
          <img className="resident-fire-loader-logo" src="/images/fire%20logo.webp" alt="" />
          <p className="resident-fire-loader-label">{label}</p>
        </div>
      </div>
    </>
  );
}
