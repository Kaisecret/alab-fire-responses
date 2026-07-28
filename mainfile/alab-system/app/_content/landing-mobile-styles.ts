export const landingMobileStyles = String.raw`
  @media (max-width: 640px) {
    .landing-page-root {
      background: #eeeae6;
    }

    .site-header {
      height: var(--header-h);
      padding-inline: var(--page-pad);
      gap: 0.45rem;
      background: rgb(255 250 245 / 96%);
    }

    .brand {
      width: clamp(6.5rem, 28vw, 7.75rem);
      height: 3.7rem;
    }

    .header-actions {
      gap: 0.35rem;
    }

    .login-button {
      min-width: 5.4rem;
      min-height: 2.75rem;
      padding: 0.62rem 0.85rem;
      border-radius: 0.75rem;
      font-size: 0.82rem;
    }

    .menu-toggle {
      width: 2.75rem;
      height: 2.75rem;
      background: transparent;
    }

    .menu-toggle span {
      width: 1.55rem;
      height: 0.14rem;
      background: var(--ink);
    }

    .hero {
      display: grid;
      min-height: auto;
      padding: var(--header-h) var(--page-pad) 1.5rem;
      grid-template-columns: minmax(0, 1fr);
      row-gap: 0;
      background: var(--cream);
    }

    .hero__content {
      display: contents;
    }

    .eyebrow {
      order: 1;
      margin: clamp(2.3rem, 9vw, 3.5rem) 0 1rem;
      font-size: clamp(0.72rem, 3.25vw, 0.88rem);
      letter-spacing: 0.025em;
    }

    .hero h1 {
      order: 2;
      max-width: 36rem;
      font-size: clamp(1.95rem, 8.2vw, 3.25rem);
      letter-spacing: -0.035em;
      line-height: 1.08;
      text-wrap: balance;
    }

    .hero h1 span,
    .hero h1 strong {
      white-space: normal;
    }

    .hero h1 strong {
      margin-top: 0.4rem;
    }

    .hero__rule {
      order: 3;
      width: 8.4rem;
      margin: 1.5rem 0 1.25rem;
    }

    .hero__copy {
      order: 4;
      max-width: 35rem;
      font-size: clamp(0.98rem, 4.15vw, 1.15rem);
      line-height: 1.58;
    }

    .hero__visual {
      position: relative;
      order: 5;
      min-height: clamp(25rem, 118vw, 39rem);
      margin: 1.7rem calc(var(--page-pad) * -1) 0;
      overflow: hidden;
      background-image:
        linear-gradient(
          180deg,
          rgb(255 248 241 / 72%) 0%,
          rgb(255 248 241 / 8%) 22%,
          rgb(92 29 13 / 8%) 100%
        ),
        url("/images/bg images.png");
      background-position: center, 73% center;
      background-size: cover, cover;
      isolation: isolate;
    }

    .hero__visual::after {
      position: absolute;
      z-index: 4;
      right: 0;
      bottom: 0;
      left: 0;
      height: 22%;
      background: linear-gradient(transparent, rgb(74 26 14 / 14%));
      content: "";
      pointer-events: none;
    }

    .phone {
      z-index: 3;
      top: auto;
      bottom: -1.9rem;
      left: clamp(-3.7rem, -9vw, -2rem);
      width: clamp(18rem, 68vw, 27rem);
      filter: drop-shadow(0 1.4rem 1.8rem rgb(46 19 12 / 26%));
    }

    .firefighter {
      z-index: 2;
      right: clamp(-6.4rem, -14vw, -3.8rem);
      bottom: -1rem;
      width: clamp(20rem, 75vw, 29rem);
      filter: drop-shadow(-0.7rem 1rem 1.6rem rgb(46 19 12 / 22%));
    }

    .hero__trust {
      position: relative;
      z-index: 8;
      order: 6;
      width: auto;
      margin: -3.8rem 0 0;
      padding: 0.9rem 0.55rem;
      border: 1px solid rgb(217 27 16 / 8%);
      border-radius: 1rem;
      background: rgb(255 253 250 / 94%);
      box-shadow: 0 1rem 2.5rem rgb(79 34 20 / 15%);
      backdrop-filter: blur(0.8rem);
    }

    .hero__trust-item {
      padding-inline: clamp(0.3rem, 1.7vw, 0.65rem);
      justify-content: center;
      gap: clamp(0.3rem, 1.4vw, 0.55rem);
    }

    .hero__trust-icon {
      width: clamp(2rem, 9vw, 2.75rem);
      height: clamp(2rem, 9vw, 2.75rem);
    }

    .hero__trust-icon svg {
      width: clamp(0.95rem, 4vw, 1.25rem);
      height: clamp(0.95rem, 4vw, 1.25rem);
    }

    .hero__trust-value {
      font-size: clamp(0.66rem, 2.8vw, 0.86rem);
    }

    .hero__trust-label {
      font-size: clamp(0.58rem, 2.55vw, 0.78rem);
    }

    .hero__actions {
      order: 7;
      width: 100%;
      max-width: none;
      margin-top: 1.25rem;
      align-items: stretch;
      flex-direction: column;
      gap: 0.75rem;
    }

    .hero__actions .button {
      width: 100%;
      min-width: 0;
      min-height: 3.65rem;
      border-radius: 0.8rem;
      font-size: clamp(0.76rem, 3.3vw, 0.92rem);
    }

    .hero__actions .button--secondary {
      background: rgb(255 250 245 / 78%);
    }
  }

  @media (max-width: 370px) {
    :root {
      --page-pad: 0.9rem;
    }

    .brand {
      width: 6.15rem;
      height: 3.35rem;
    }

    .login-button {
      width: auto;
      min-width: 4.85rem;
      padding-inline: 0.65rem;
    }

    .login-button__label {
      display: inline;
    }

    .menu-toggle {
      width: 2.55rem;
      height: 2.55rem;
      padding: 0.55rem;
    }

    .hero h1 {
      font-size: clamp(1.72rem, 8.5vw, 2rem);
    }

    .hero__visual {
      min-height: 24rem;
    }

    .phone {
      bottom: -1.5rem;
      left: -3.2rem;
      width: 17.5rem;
    }

    .firefighter {
      right: -5.4rem;
      width: 19.5rem;
    }

    .hero__trust {
      margin-top: -3.3rem;
      padding-inline: 0.35rem;
    }

    .hero__trust-item {
      padding-inline: 0.22rem;
    }

    .hero__trust-text {
      gap: 0.05rem;
    }

    .hero__trust-value,
    .hero__trust-label {
      white-space: normal;
      line-height: 1.12;
    }
  }
`;
