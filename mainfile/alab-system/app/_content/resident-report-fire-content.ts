export const reportFireStyles = `
  .report-page-root {
    --report-red: #DB1B0D;
    --report-red-deep: #B8150C;
    --report-ink: #102231;
    --report-muted: #5C6B7A;
    --report-line: #E7E9EE;
    --report-pink: #FFF2F0;
    --report-warm: #FFF9F6;
    min-height: 100vh;
    padding: clamp(1rem, 3vw, 3.25rem) clamp(1rem, 4vw, 2.75rem) calc(6.8rem + env(safe-area-inset-bottom));
    background: radial-gradient(circle at 100% 0%, rgba(255, 219, 213, .72), transparent 30rem), #FFF9F6;
    color: var(--report-ink);
    font-family: var(--font-plus-jakarta, Inter, ui-sans-serif, system-ui, sans-serif);
  }

  .report-page-root *, .report-page-root *::before, .report-page-root *::after { box-sizing: border-box; }
  .report-page-root button, .report-page-root input, .report-page-root select, .report-page-root textarea { font: inherit; }

  .report-form-shell {
    width: min(100%, 1180px);
    margin: 0 auto;
    padding: clamp(1.15rem, 3vw, 2.65rem);
    overflow: hidden;
    border: 1px solid rgba(219, 27, 13, .10);
    border-radius: clamp(1.35rem, 3vw, 2rem);
    background: rgba(255, 255, 255, .96);
    box-shadow: 0 1.25rem 4rem rgba(49, 31, 23, .10);
    animation: report-rise .5s cubic-bezier(.16, 1, .3, 1) both;
  }

  .report-form-heading { max-width: 44rem; margin-bottom: clamp(1.35rem, 3vw, 2rem); }
  .report-eyebrow { display: inline-flex; align-items: center; gap: .45rem; color: var(--report-red); font-size: .72rem; font-weight: 850; letter-spacing: .13em; }
  .report-eyebrow::before { content: ''; width: 1.8rem; height: 2px; border-radius: 4px; background: currentColor; }
  .report-form-heading h1 { margin: .65rem 0 .45rem; color: var(--report-ink); font-size: clamp(1.7rem, 3vw, 2.55rem); line-height: 1.08; letter-spacing: -.045em; }
  .report-form-heading p { max-width: 34rem; margin: 0; color: var(--report-muted); font-size: .94rem; line-height: 1.55; }

  .warning-banner {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: clamp(1.5rem, 3vw, 2.25rem);
    padding: 1rem 1.1rem;
    border: 1px solid #FFD4CF;
    border-radius: 1rem;
    background: linear-gradient(105deg, #FFF2F0, #FFF9F8);
  }
  .warning-banner-icon { display: grid; width: 2.8rem; height: 2.8rem; flex: 0 0 2.8rem; place-items: center; border-radius: .9rem; color: #fff; background: var(--report-red); box-shadow: 0 .6rem 1.4rem rgba(219, 27, 13, .20); }
  .warning-banner-icon svg { width: 1.4rem; height: 1.4rem; }
  .warning-banner-icon img { width: 2rem; height: 2rem; object-fit: contain; filter: brightness(0) invert(1); }
  .warning-banner h2 { margin: 0 0 .15rem; color: var(--report-red-deep); font-size: 1rem; line-height: 1.2; }
  .warning-banner p { margin: 0; color: #4B3B3A; font-size: .85rem; line-height: 1.45; }

  .two-col-grid { display: grid; grid-template-columns: minmax(0, 1.18fr) minmax(18rem, .82fr); gap: clamp(1rem, 2vw, 1.5rem); }
  .step-section { min-width: 0; margin: 0 0 clamp(1.55rem, 3vw, 2.15rem); }
  .step-title { display: flex; align-items: center; gap: .55rem; margin-bottom: .75rem; color: var(--report-ink); font-size: .82rem; font-weight: 850; letter-spacing: .055em; }
  .step-number { display: grid; width: 1.55rem; height: 1.55rem; flex: 0 0 1.55rem; place-items: center; border-radius: 50%; background: var(--report-red); color: #fff; font-size: .72rem; box-shadow: 0 .28rem .75rem rgba(219, 27, 13, .22); }
  .step-title-spread { justify-content: space-between; }
  .step-title-leading { display: inline-flex; align-items: center; gap: .55rem; }
  .optional-label { color: var(--report-muted); font-size: .72rem; font-weight: 650; letter-spacing: 0; }

  .location-status { padding: .34rem .55rem; border: 1px solid #FFD2CD; border-radius: 99px; color: var(--report-red-deep); background: var(--report-pink); font-size: .62rem; font-weight: 850; letter-spacing: .04em; }
  .location-status.is-confirmed, .location-status.is-adjusted { border-color: #BCE8CB; color: #087E3E; background: #ECFBF1; }
  .location-status.is-improving, .location-status.is-locating { animation: report-pulse 1.4s ease-in-out infinite; }
  .location-status.is-approximate, .location-status.is-low-accuracy { border-color: #FFD2CD; color: var(--report-red-deep); background: #FFF5F3; }
  .location-status.is-outside, .location-status.is-error { background: #FFF0F0; }

  .location-box { overflow: hidden; border: 1px solid var(--report-line); border-radius: 1rem; background: #fff; box-shadow: 0 .45rem 1.25rem rgba(17, 34, 49, .045); }
  .location-box[data-location-card] { display: flex; min-height: 22.75rem; flex-direction: column; }
  .location-box[data-location-card] .location-details { display: flex; flex: 1 1 auto; flex-direction: column; padding: 1.05rem; }
  .location-details h4 { display: flex; align-items: center; gap: .45rem; margin: 0 0 .8rem; color: var(--report-ink); font-size: .98rem; }
  .location-heading-icon { width: 1.2rem; height: 1.2rem; color: var(--report-red); }
  .location-address { display: grid; gap: .42rem; margin-bottom: .72rem; padding: .7rem; border: 1px solid #FFD9D5; border-radius: .75rem; background: #FFF9F8; }
  .location-address-row { display: flex; align-items: flex-start; gap: .42rem; color: #4B5563; font-size: .76rem; line-height: 1.35; }
  .location-address-row svg { width: .92rem; height: .92rem; flex: 0 0 .92rem; color: var(--report-red); }
  .location-address-row strong { color: #334155; font-weight: 750; }
  .location-error { margin: 0 0 .8rem; padding-left: .7rem; border-left: 2px solid var(--report-red); color: var(--report-red-deep); font-size: .76rem; line-height: 1.45; }
  .accuracy { margin: 0 0 .8rem; color: #087E3E; font-size: .75rem; font-weight: 750; }

  .action-btn-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .55rem; margin-top: auto; }
  .action-btn-row-single { grid-template-columns: minmax(0, 1fr); }
  .btn-small-outline, .btn-outline-red, .btn-solid-red, .btn-cancel { display: inline-flex; min-height: 2.65rem; align-items: center; justify-content: center; gap: .45rem; border: 1px solid #DCE2EA; border-radius: .72rem; background: #fff; color: var(--report-ink); font-size: .76rem; font-weight: 800; cursor: pointer; transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease, color .18s ease, background .18s ease; }
  .btn-small-outline:hover:not(:disabled), .btn-cancel:hover { transform: translateY(-1px); border-color: var(--report-red); color: var(--report-red); box-shadow: 0 .45rem 1rem rgba(219, 27, 13, .09); }
  .btn-small-outline:focus-visible, .btn-cancel:focus-visible, .btn-primary:focus-visible, .type-btn:focus-visible { outline: 3px solid rgba(219, 27, 13, .22); outline-offset: 2px; }
  .btn-small-outline:disabled { cursor: not-allowed; color: #B7C0CC; background: #FBFCFD; border-color: #EDF0F4; box-shadow: none; }

  .map-preview[data-location-map-surface] { position: relative; z-index: 0; display: block; height: 11rem; overflow: hidden; border-top: 1px solid var(--report-line); background: #D9EEF1; }
  .location-map { width: 100%; height: 100%; }
  .location-map-overlay { position: absolute; inset: 0; z-index: 500; display: flex; align-items: center; justify-content: center; gap: .55rem; color: var(--report-ink); background: rgba(255, 255, 255, .78); font-size: .75rem; font-weight: 800; backdrop-filter: blur(2px); pointer-events: none; }
  .location-map-overlay.is-hidden { display: none; }
  .location-map-pulse { width: .75rem; height: .75rem; border-radius: 50%; background: var(--report-red); box-shadow: 0 0 0 .35rem rgba(219, 27, 13, .13); animation: report-pulse 1.2s ease-in-out infinite; }
  .location-map-marker-wrapper { background: transparent; border: 0; }
  .location-map-marker { display: grid; width: 2.4rem; height: 2.4rem; place-items: center; border: 2px solid #fff; border-radius: 50% 50% 50% 0; background: var(--report-red); box-shadow: 0 .5rem 1.1rem rgba(219, 27, 13, .35); transform: rotate(-45deg); }
  .location-map-marker img { width: 1.55rem; height: 1.55rem; object-fit: contain; transform: rotate(45deg); filter: brightness(0) invert(1); }

  .landmark-box { display: flex; min-height: 22.75rem; flex-direction: column; padding: 1.05rem; }
  .landmark-heading { display: flex; align-items: flex-start; gap: .75rem; }
  .landmark-icon { display: grid; width: 2.5rem; height: 2.5rem; flex: 0 0 2.5rem; place-items: center; border-radius: .82rem; color: #fff; background: var(--report-red); box-shadow: 0 .55rem 1.2rem rgba(219, 27, 13, .18); }
  .landmark-icon svg { width: 1.22rem; height: 1.22rem; }
  .landmark-status { display: block; margin-bottom: .22rem; color: var(--report-muted); font-size: .64rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
  .landmark-name { margin: 0; color: var(--report-ink); font-size: .95rem; line-height: 1.35; overflow-wrap: anywhere; }
  .landmark-helper { margin: .95rem 0 1rem; color: var(--report-muted); font-size: .78rem; line-height: 1.55; }
  .landmark-input { width: 100%; min-height: 3rem; margin-top: .9rem; padding: .7rem .8rem; border: 1px solid #E0E6ED; border-radius: .75rem; color: var(--report-ink); background: #FCFDFE; font-size: .78rem; outline: none; transition: border-color .18s ease, box-shadow .18s ease, background .18s ease; }
  .landmark-input::placeholder { color: #8794A5; }
  .landmark-input:focus { border-color: var(--report-red); background: #fff; box-shadow: 0 0 0 .22rem rgba(219, 27, 13, .10); }
  .landmark-box[data-landmark-state="confirmed"] .landmark-icon { background: #0C8B48; box-shadow: 0 .55rem 1.2rem rgba(12, 139, 72, .18); }
  .landmark-box[data-landmark-state="unavailable"] .landmark-icon { background: #7A8797; box-shadow: none; }

  .type-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .7rem; }
  .type-btn { display: flex; min-height: 7.3rem; flex-direction: column; align-items: center; justify-content: center; gap: .65rem; padding: .75rem .45rem; border: 1px solid #E1E6ED; border-radius: 1rem; background: #fff; color: #607084; font-size: .78rem; font-weight: 800; line-height: 1.25; text-align: center; cursor: pointer; transition: transform .18s ease, border-color .18s ease, color .18s ease, background .18s ease, box-shadow .18s ease; }
  .type-btn svg { width: 1.7rem; height: 1.7rem; }
  .type-btn:hover { transform: translateY(-2px); border-color: #F0AAA3; color: var(--report-red); box-shadow: 0 .75rem 1.5rem rgba(16, 34, 49, .07); }
  .type-btn.selected { border-color: var(--report-red); color: var(--report-red); background: linear-gradient(145deg, #FFF7F6, #FFFDFC); box-shadow: inset 0 0 0 1px rgba(219, 27, 13, .08), 0 .75rem 1.5rem rgba(219, 27, 13, .08); }

  .report-detail-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: clamp(.9rem, 2vw, 1.25rem); align-items: stretch; }
  .photo-field { display: flex; min-width: 0; flex-direction: column; }
  .field-label { display: flex; align-items: center; gap: .5rem; margin-bottom: .65rem; color: var(--report-ink); font-size: .79rem; font-weight: 850; }
  .field-label .step-number { width: 1.42rem; height: 1.42rem; flex-basis: 1.42rem; font-size: .68rem; }
  .field-helper { min-height: 2.25rem; margin: 0 0 .65rem; color: var(--report-muted); font-size: .73rem; line-height: 1.48; }
  .photo-upload { display: flex; min-height: 8.2rem; align-items: center; justify-content: center; padding: .9rem; border: 1.5px dashed #F0B8B1; border-radius: .85rem; background: #FFFDFD; text-align: center; cursor: pointer; transition: border-color .18s ease, background .18s ease, transform .18s ease, box-shadow .18s ease; }
  .photo-upload:hover { border-color: var(--report-red); background: #FFF8F7; box-shadow: 0 .7rem 1.45rem rgba(219, 27, 13, .09); transform: translateY(-1px); }
  .photo-upload:focus-visible { outline: 3px solid rgba(219, 27, 13, .22); outline-offset: 2px; }
  .photo-upload svg { width: 1.55rem; height: 1.55rem; margin-bottom: .35rem; color: var(--report-red); }
  .photo-upload strong, .photo-upload span { display: block; }
  .photo-upload strong { color: var(--report-ink); font-size: .78rem; }
  .photo-upload span { margin-top: .18rem; color: var(--report-muted); font-size: .66rem; line-height: 1.45; }
  .photo-upload-summary { display: none; align-items: center; gap: .8rem; text-align: left; }
  .photo-upload[data-photo-state="selected"] .photo-upload-empty { display: none; }
  .photo-upload[data-photo-state="selected"] .photo-upload-summary { display: flex; }
  .photo-upload-summary img { width: 3.7rem; height: 3.7rem; border-radius: .7rem; object-fit: cover; box-shadow: 0 .45rem 1rem rgba(16, 34, 49, .16); }
  .photo-upload-summary span { margin: 0; }
  .photo-input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; clip-path: inset(50%); }
  .photo-dialog { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 1rem; }
  .photo-dialog[hidden] { display: none; }
  .photo-dialog-backdrop { position: absolute; inset: 0; border: 0; background: rgba(16, 34, 49, .56); backdrop-filter: blur(5px); cursor: default; }
  .photo-dialog-card { position: relative; width: min(100%, 31rem); overflow: hidden; border: 1px solid rgba(255, 255, 255, .62); border-radius: 1.5rem; background: #fff; box-shadow: 0 1.5rem 4rem rgba(16, 34, 49, .28); animation: photo-dialog-in .22s ease-out both; }
  .photo-dialog-heading { display: flex; align-items: flex-start; gap: .85rem; padding: 1.25rem 1.25rem .9rem; }
  .photo-dialog-icon { display: grid; width: 2.9rem; height: 2.9rem; flex: 0 0 2.9rem; place-items: center; border-radius: .95rem; color: #fff; background: linear-gradient(145deg, #EF2A1E, var(--report-red-deep)); box-shadow: 0 .7rem 1.4rem rgba(219, 27, 13, .25); }
  .photo-dialog-icon svg { width: 1.4rem; height: 1.4rem; }
  .photo-dialog-heading h2 { margin: .1rem 0 .25rem; color: var(--report-ink); font-size: 1.1rem; line-height: 1.2; }
  .photo-dialog-heading p { margin: 0; color: var(--report-muted); font-size: .8rem; line-height: 1.45; }
  .photo-dialog-close { display: grid; width: 2rem; height: 2rem; margin-left: auto; place-items: center; border: 0; border-radius: 50%; color: #64748B; background: #F5F7FA; font-size: 1.25rem; line-height: 1; cursor: pointer; }
  .photo-dialog-close:hover { color: var(--report-red); background: #FFF1F0; }
  .photo-camera-panel { margin: .15rem 1.25rem; padding: 1.05rem; border: 1px solid #F7D2CE; border-radius: 1rem; background: linear-gradient(135deg, #FFF8F7, #FFFDFC); text-align: center; }
  .photo-camera-placeholder { padding: .8rem .25rem; color: var(--report-muted); font-size: .8rem; line-height: 1.5; }
  .photo-camera-placeholder svg { width: 2.1rem; height: 2.1rem; margin-bottom: .45rem; color: var(--report-red); }
  .photo-camera-placeholder strong, .photo-camera-placeholder span { display: block; }
  .photo-camera-placeholder strong { color: var(--report-ink); font-size: .88rem; }
  .photo-camera-preview { display: block; width: 100%; max-height: 16rem; border-radius: .75rem; object-fit: cover; }
  .photo-camera-preview[hidden], .photo-camera-placeholder[hidden] { display: none; }
  .photo-dialog-actions { display: grid; grid-template-columns: 1fr 1fr; gap: .65rem; padding: 1rem 1.25rem 1.25rem; }
  .photo-dialog-actions button { min-height: 3rem; border-radius: .8rem; font-size: .82rem; font-weight: 850; cursor: pointer; }
  .photo-take-button, .photo-use-button { border: 0; color: #fff; background: linear-gradient(135deg, #EF2A1E, var(--report-red-deep)); box-shadow: 0 .7rem 1.3rem rgba(219, 27, 13, .20); }
  .photo-retake-button, .photo-cancel-button { border: 1px solid #DDE4EC; color: var(--report-ink); background: #fff; }
  .photo-use-button, .photo-retake-button { display: none; }
  .photo-dialog[data-photo-ready="true"] .photo-take-button, .photo-dialog[data-photo-ready="true"] .photo-cancel-button { display: none; }
  .photo-dialog[data-photo-ready="true"] .photo-use-button, .photo-dialog[data-photo-ready="true"] .photo-retake-button { display: inline-flex; align-items: center; justify-content: center; }

  .form-footer { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(10rem, .65fr); gap: 1rem; margin-top: clamp(.3rem, 2vw, .75rem); padding-top: 1.2rem; border-top: 1px solid var(--report-line); }
  .btn-primary { display: inline-flex; min-height: 3.4rem; align-items: center; justify-content: center; gap: .65rem; border: 0; border-radius: .85rem; color: #fff; background: linear-gradient(135deg, #EF2A1E, var(--report-red-deep)); box-shadow: 0 .8rem 1.6rem rgba(219, 27, 13, .25); font-size: .9rem; font-weight: 900; letter-spacing: .01em; cursor: pointer; transition: transform .18s ease, box-shadow .18s ease, filter .18s ease; }
  .btn-primary svg { width: 1.25rem; height: 1.25rem; }
  .btn-primary:hover { filter: saturate(1.1); transform: translateY(-2px); box-shadow: 0 1rem 2rem rgba(219, 27, 13, .30); }
  .btn-primary:disabled { cursor: wait; opacity: .7; transform: none; box-shadow: none; }
  .report-submit-error { margin: .85rem 0 0; padding: .8rem .9rem; border: 1px solid #FFD2CD; border-radius: .8rem; color: var(--report-red-deep); background: #FFF6F5; font-size: .8rem; font-weight: 750; line-height: 1.45; }

  @keyframes report-rise { from { opacity: 0; transform: translateY(.85rem); } to { opacity: 1; transform: translateY(0); } }
  @keyframes photo-dialog-in { from { opacity: 0; transform: translateY(1rem) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes report-pulse { 50% { transform: scale(1.05); box-shadow: 0 0 0 .35rem rgba(219, 27, 13, .08); } }
  @media (max-width: 950px) {
    .report-page-root { padding-bottom: calc(6rem + env(safe-area-inset-bottom)); }
    .report-form-shell { padding: 1rem; border-radius: 1.25rem; }
    .two-col-grid { grid-template-columns: 1fr; }
    .location-box[data-location-card] { min-height: 26rem; }
    .location-box[data-location-card] .location-details { display: flex; }
    .map-preview[data-location-map-surface] { display: block; height: 12.25rem; }
    .landmark-box { min-height: 16rem; }
    .type-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .type-btn { min-height: 5.8rem; font-size: .7rem; }
    .type-btn svg { width: 1.42rem; height: 1.42rem; }
    .field-helper { min-height: auto; }
    .photo-upload { min-height: 7rem; }
  }
  @media (max-width: 540px) {
    .report-page-root { padding: .85rem .75rem calc(6rem + env(safe-area-inset-bottom)); }
    .report-form-heading h1 { font-size: 1.7rem; }
    .warning-banner { align-items: flex-start; padding: .85rem; }
    .warning-banner-icon { width: 2.45rem; height: 2.45rem; flex-basis: 2.45rem; }
    .action-btn-row { grid-template-columns: 1fr; }
    .type-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .type-btn:last-child { grid-column: span 2; min-height: 4.65rem; flex-direction: row; }
    .form-footer { grid-template-columns: 1fr; gap: .65rem; }
    .btn-primary, .btn-cancel { min-height: 3.25rem; }
  }
  @media (prefers-reduced-motion: reduce) { .report-form-shell, .location-status.is-improving, .location-status.is-locating, .location-map-pulse { animation: none; } }
`;

export const reportFireMarkup = `
  <div class="report-page-root">
    <main class="report-form-shell" aria-labelledby="report-fire-title">
      <header class="report-form-heading">
        <span class="report-eyebrow">ALAB EMERGENCY RESPONSE</span>
        <h1 id="report-fire-title">Report a Fire Incident</h1>
        <p>Share the clearest details you can so responders can act faster.</p>
      </header>

      <section class="warning-banner" aria-label="Fire emergency safety reminder">
        <span class="warning-banner-icon" aria-hidden="true"><img src="/images/fire logo.webp" alt="" /></span>
        <div><h2>Fire Emergency</h2><p>Move to a safe location before sending the report.</p></div>
      </section>

      <div class="two-col-grid">
        <section class="step-section">
          <div class="step-title step-title-spread">
            <span class="step-title-leading"><span class="step-number">1</span> LOCATION</span>
            <span class="location-status" data-location-status>LOCATING</span>
          </div>
          <div class="location-box" data-location-card data-location-latitude="" data-location-longitude="" data-location-accuracy="" data-location-barangay="" data-location-municipality="" data-location-province="" data-location-valid="false" data-location-state="locating">
            <div class="location-details">
              <h4><svg class="location-heading-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.1 7-12A7 7 0 0 0 5 9c0 5.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg><span data-location-title>Detecting location</span></h4>
              <div class="location-address location-result" data-location-address data-location-result>
                <div class="location-address-row location-result-place"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s7-6.1 7-12A7 7 0 0 0 5 9c0 5.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg><strong data-location-place><span data-location-barangay>Barangay checking</span><span>, </span><span data-location-municipality>Municipality checking</span></strong></div>
                <div class="location-address-row location-result-coordinates"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2v20"/><path d="M2 12h20"/><circle cx="12" cy="12" r="9"/></svg><strong data-location-coordinates>Latitude -- | Longitude --</strong></div>
              </div>
              <p data-location-text hidden>Barangay checking, Municipality checking</p>
              <div class="accuracy" data-location-accuracy hidden></div>
              <div class="location-error" data-location-error hidden></div>
              <div class="action-btn-row action-btn-row-single">
                <button type="button" class="btn-small-outline" data-location-refresh><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Detect my location</button>
              </div>
            </div>
            <div class="map-preview" data-location-preview data-location-map-panel data-location-map-surface>
              <div class="location-map" data-location-map aria-label="OpenStreetMap street map with detected fire location"></div>
              <div class="location-map-overlay" data-location-map-overlay aria-live="polite"><span class="location-map-pulse" aria-hidden="true"></span><span data-location-map-label>Locating you...</span></div>
            </div>
          </div>
        </section>

        <section class="step-section">
          <div class="step-title"><span class="step-number">2</span> NEAREST LANDMARK</div>
          <div class="location-box landmark-box" data-nearest-landmark data-landmark-state="waiting">
            <div class="landmark-heading">
              <span class="landmark-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.1 7-12A7 7 0 0 0 5 9c0 5.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg></span>
              <div><span class="landmark-status" data-landmark-status>Waiting for location</span><h3 class="landmark-name" data-landmark-name>Finding a nearby mapped place...</h3></div>
            </div>
            <input class="landmark-input" data-landmark-input type="text" maxlength="120" placeholder="Type a landmark if needed" aria-label="Nearest landmark" />
            <p class="landmark-helper">A nearby place is filled automatically. You can type a different landmark if it is more accurate.</p>
          </div>
        </section>
      </div>

      <section class="step-section">
        <div class="step-title"><span class="step-number">3</span> WHAT IS BURNING?</div>
        <div class="type-grid" role="list" aria-label="Fire type">
          <button type="button" class="type-btn selected" data-fire-type="HOUSE_BUILDING" role="listitem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>House/Building</button>
          <button type="button" class="type-btn" data-fire-type="GRASS" role="listitem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20v-8M8 20v-5M16 20v-6M4 20v-3M20 20v-4"/></svg>Grass Fire</button>
          <button type="button" class="type-btn" data-fire-type="FOREST" role="listitem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 19 14 15 14 18 22 6 22 9 14 5 14 12 2"/></svg>Forest Fire</button>
          <button type="button" class="type-btn" data-fire-type="VEHICLE" role="listitem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H9.3a2 2 0 0 0-1.6.8L5 11l-5.16.86a1 1 0 0 0-.84.99V16h3m10 0a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0m-10 0a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0"/></svg>Vehicle Fire</button>
          <button type="button" class="type-btn" data-fire-type="OTHER" role="listitem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>Other</button>
        </div>
      </section>

      <section class="report-detail-grid">
        <div class="photo-field"><span class="field-label"><span class="step-number">4</span>ADD FIRE PHOTO <span class="optional-label">(OPTIONAL)</span></span><span class="field-helper">Take a photo only when it is safe to do so.</span><button type="button" class="photo-upload" data-photo-open data-photo-state="empty"><span class="photo-upload-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><strong>Take a photo</strong><span>Your camera opens in a secure popup</span></span><span class="photo-upload-summary"><img data-photo-summary-preview alt="Selected fire photo" /><span><strong>Photo ready</strong><span>Tap to retake it</span></span></span></button><input class="photo-input" id="fire-photo" data-photo-input type="file" accept="image/jpeg,image/png" capture="environment" /></div>
      </section>

      <p class="report-submit-error" data-report-submit-error role="alert" hidden></p>
      <footer class="form-footer"><button type="button" class="btn-primary" data-report-submit><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>SEND FIRE ALERT</button><button type="button" class="btn-cancel" data-report-cancel>Cancel</button></footer>
    </main>
    <div class="photo-dialog" data-photo-dialog data-photo-ready="false" role="dialog" aria-modal="true" aria-labelledby="photo-dialog-title" hidden>
      <button type="button" class="photo-dialog-backdrop" data-photo-close aria-label="Close camera dialog"></button>
      <section class="photo-dialog-card">
        <header class="photo-dialog-heading"><span class="photo-dialog-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span><div><h2 id="photo-dialog-title">Take a fire photo</h2><p>Only capture an image when you are in a safe place.</p></div><button type="button" class="photo-dialog-close" data-photo-close aria-label="Close">×</button></header>
        <div class="photo-camera-panel"><div class="photo-camera-placeholder" data-photo-placeholder><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><strong>Your camera is ready</strong><span>Take one clear photo to help responders identify the fire.</span></div><img class="photo-camera-preview" data-photo-preview alt="Fire photo preview" hidden /></div>
        <footer class="photo-dialog-actions"><button type="button" class="photo-take-button" data-photo-take>Open camera</button><button type="button" class="photo-cancel-button" data-photo-close>Cancel</button><button type="button" class="photo-retake-button" data-photo-retake>Retake photo</button><button type="button" class="photo-use-button" data-photo-use>Use this photo</button></footer>
      </section>
    </div>
  </div>
`;
