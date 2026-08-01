import Link from "next/link";

import type { UserModuleDefinition } from "../_content/user-modules";

const moduleShellStyles = `
  .module-shell {
    min-height: 100vh;
    background: #f8faf9;
    color: #1f2933;
    font-family: Arial, Helvetica, sans-serif;
  }

  .module-shell__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem clamp(1rem, 4vw, 3rem);
    border-bottom: 1px solid #d9e2dc;
    background: #ffffff;
  }

  .module-shell__brand {
    margin: 0;
    font-size: 1rem;
    font-weight: 800;
  }

  .module-shell__nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .module-shell__nav a,
  .module-shell__action {
    color: #1f2933;
    font-weight: 700;
    text-decoration: none;
  }

  .module-shell__nav a {
    font-size: 0.9rem;
  }

  .module-shell__main {
    width: min(1120px, calc(100% - 2rem));
    margin: 0 auto;
    padding: clamp(2rem, 5vw, 4rem) 0;
  }

  .module-shell__eyebrow {
    margin: 0 0 0.75rem;
    color: #b42318;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .module-shell__title {
    max-width: 780px;
    margin: 0;
    font-size: clamp(2rem, 5vw, 4rem);
    line-height: 1.04;
    letter-spacing: 0;
  }

  .module-shell__description {
    max-width: 760px;
    margin: 1rem 0 0;
    color: #52605a;
    font-size: 1.05rem;
    line-height: 1.7;
  }

  .module-shell__actions,
  .module-shell__highlights,
  .module-shell__sections {
    display: grid;
    gap: 1rem;
    margin-top: 2rem;
  }

  .module-shell__actions {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .module-shell__highlights {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .module-shell__sections {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }

  .module-shell__action,
  .module-shell__highlight,
  .module-shell__section {
    border: 1px solid #d9e2dc;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 18px 45px rgba(31, 41, 51, 0.08);
  }

  .module-shell__action {
    display: block;
    padding: 1.1rem;
  }

  .module-shell__action strong,
  .module-shell__highlight strong,
  .module-shell__section h2 {
    display: block;
    margin: 0 0 0.45rem;
  }

  .module-shell__action span,
  .module-shell__highlight span {
    display: block;
    color: #52605a;
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .module-shell__highlight,
  .module-shell__section {
    padding: 1.1rem;
  }

  .module-shell__highlight-value {
    color: #0f766e;
    font-size: 1.2rem;
    font-weight: 800;
  }

  .module-shell__section ul {
    margin: 0;
    padding-left: 1.1rem;
    color: #52605a;
    line-height: 1.65;
  }

  .module-shell--municipal .module-shell__eyebrow {
    color: #9a3412;
  }

  .module-shell--provincial .module-shell__eyebrow {
    color: #0f766e;
  }

  @media (max-width: 680px) {
    .module-shell__bar {
      align-items: flex-start;
      flex-direction: column;
    }

    .module-shell__nav {
      width: 100%;
    }
  }
`;

type ModuleShellProps = {
  moduleData: UserModuleDefinition;
  accent: "resident" | "municipal" | "provincial";
};

export function ModuleShell({ moduleData, accent }: ModuleShellProps) {
  return (
    <>
      <style>{moduleShellStyles}</style>
      <div className={`module-shell module-shell--${accent}`}>
        <header className="module-shell__bar">
          <p className="module-shell__brand">ALAB Fire Response</p>
          <nav className="module-shell__nav" aria-label="Role modules">
            <Link href="/">Home</Link>
            <Link href="/resident">Resident</Link>
            <Link href="/municipal-bfp">Municipal BFP</Link>
            <Link href="/provincial-bfp">Provincial BFP</Link>
            <Link href="/login">Login</Link>
          </nav>
        </header>

        <main className="module-shell__main">
          <p className="module-shell__eyebrow">{moduleData.eyebrow}</p>
          <h1 className="module-shell__title">{moduleData.title}</h1>
          <p className="module-shell__description">{moduleData.description}</p>

          <section className="module-shell__actions" aria-label="Primary actions">
            {moduleData.primaryActions.map((action) => (
              <Link
                className="module-shell__action"
                href={action.href}
                key={action.href}
              >
                <strong>{action.label}</strong>
                <span>{action.description}</span>
              </Link>
            ))}
          </section>

          <section
            className="module-shell__highlights"
            aria-label={`${moduleData.role} highlights`}
          >
            {moduleData.highlights.map((highlight) => (
              <article className="module-shell__highlight" key={highlight.label}>
                <strong>{highlight.label}</strong>
                <p className="module-shell__highlight-value">
                  {highlight.value}
                </p>
                <span>{highlight.detail}</span>
              </article>
            ))}
          </section>

          <section
            className="module-shell__sections"
            aria-label={`${moduleData.role} module details`}
          >
            {moduleData.sections.map((section) => (
              <article className="module-shell__section" key={section.title}>
                <h2>{section.title}</h2>
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        </main>
      </div>
    </>
  );
}
