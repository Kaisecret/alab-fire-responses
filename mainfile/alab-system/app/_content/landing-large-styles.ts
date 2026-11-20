// Big screens only. Every rule sits behind a min-width query, so phones,
// tablets and small laptops keep the layout they already have.
export const landingLargeStyles = String.raw`
  @media (min-width: 1440px) {
    :root {
      /* The hero phone follows the screen height, so tall monitors are filled. */
      --phone-width: clamp(24rem, calc((100svh - var(--header-h)) * 0.56), 40rem);
    }

    .hero__content {
      justify-content: center;
      padding-block: 2rem 4rem;
    }

    .phone {
      top: calc(50% - var(--phone-width) * 0.75 - 1rem);
    }
  }
`;
// Wider than 1920px the whole page also scales up: see app/globals.css.
