export const landingMobileStyles = String.raw`
  @media (max-width: 640px) {
    :root {
      --header-h: 4.4rem;
    }

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
      width: clamp(5.9rem, 25vw, 6.8rem);
      height: 3.2rem;
    }

    .header-actions {
      gap: 0.35rem;
    }

    .login-button {
      min-width: 5.1rem;
      min-height: 2.5rem;
      padding: 0.5rem 0.7rem;
      border-radius: 0.75rem;
      font-size: 0.82rem;
    }

    .menu-toggle {
      width: 2.5rem;
      height: 2.5rem;
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
      margin: clamp(2rem, 7vw, 2.75rem) 0 0.75rem;
      font-size: clamp(0.72rem, 3.25vw, 0.88rem);
      letter-spacing: 0.025em;
    }

    .hero h1 {
      order: 2;
      max-width: 36rem;
      font-size: clamp(1.75rem, 7.3vw, 2.8rem);
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
      margin: 1rem 0 0.8rem;
    }

    .hero__copy {
      order: 4;
      max-width: 35rem;
      font-size: clamp(0.88rem, 3.7vw, 1.02rem);
      line-height: 1.42;
    }

    .hero__visual {
      position: relative;
      order: 5;
      min-height: clamp(12.5rem, 52vw, 18rem);
      margin: 0.45rem calc(var(--page-pad) * -1) 0;
      overflow: hidden;
      background-image:
        linear-gradient(
          180deg,
          rgb(255 248 241 / 72%) 0%,
          rgb(255 248 241 / 8%) 22%,
          rgb(92 29 13 / 8%) 100%
        ),
        url("/images/bg images.webp");
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
      top: 0;
      bottom: auto;
      left: clamp(-2.2rem, -5vw, -1rem);
      width: clamp(9.5rem, 42vw, 16rem);
      filter: drop-shadow(0 1.4rem 1.8rem rgb(46 19 12 / 26%));
    }

    .firefighter {
      z-index: 2;
      top: 1.4rem;
      right: clamp(-4rem, -9vw, -2rem);
      bottom: auto;
      width: clamp(11rem, 48vw, 18rem);
      filter: drop-shadow(-0.7rem 1rem 1.6rem rgb(46 19 12 / 22%));
    }

    .hero__trust {
      position: relative;
      z-index: 8;
      order: 6;
      width: auto;
      margin: -2.2rem 0 0;
      padding: 0.7rem 0.55rem;
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
      margin-top: 0.8rem;
      align-items: stretch;
      flex-direction: column;
      gap: 0.55rem;
    }

    .hero__actions .button {
      width: 100%;
      min-width: 0;
      min-height: 3.1rem;
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
      width: 5.65rem;
      height: 3rem;
    }

    .login-button {
      width: auto;
      min-width: 4.6rem;
      padding-inline: 0.65rem;
    }

    .login-button__label {
      display: inline;
    }

    .menu-toggle {
      width: 2.35rem;
      height: 2.35rem;
      padding: 0.55rem;
    }

    .hero h1 {
      font-size: clamp(1.72rem, 8.5vw, 2rem);
    }

    .hero__visual {
      min-height: 12rem;
    }

    .phone {
      top: 0;
      bottom: auto;
      left: -1.2rem;
      width: 9rem;
    }

    .firefighter {
      top: 1.25rem;
      right: -2.3rem;
      bottom: auto;
      width: 10.5rem;
    }

    .hero__trust {
      margin-top: -2rem;
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

  @media (max-width: 640px) and (max-height: 750px) {
    .eyebrow {
      margin-top: 1.35rem;
    }

    .hero h1 {
      font-size: clamp(1.58rem, 6.8vw, 2.15rem);
    }

    .hero__rule {
      margin-block: 0.75rem 0.65rem;
    }

    .hero__copy {
      font-size: 0.84rem;
      line-height: 1.35;
    }

    .hero__visual {
      min-height: 11.25rem;
    }

    .phone {
      width: 8.75rem;
    }

    .firefighter {
      top: 1rem;
      width: 10.25rem;
    }

    .hero__trust {
      margin-top: -1.75rem;
      padding-block: 0.5rem;
    }

    .hero__actions {
      margin-top: 0.6rem;
    }

    .hero__actions .button {
      min-height: 2.85rem;
    }
  }
`;
