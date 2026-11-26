// "Meet the team" section at the bottom of the landing page. Names and emails
// follow the author block of the ALAB abstract; the lead developer sits in the middle.
type Member = { name: string; photo: string; email: string; role?: string; lead?: boolean; github?: string };

const MEMBERS: Member[] = [
  { name: "Jhon Kylho Estrabo", photo: "estrabo", email: "estrabojhon@sac.edu.ph", role: "Developer" },
  { name: "John Rey D. Fajardo", photo: "fajardo", email: "fajardojohn@sac.edu.ph", role: "Developer" },
  { name: "Khing Jay C. Regala", photo: "regala", email: "regalakhing@sac.edu.ph", lead: true, github: "Kaisecret" },
  { name: "Rhoda May V. Bangcaya", photo: "bangcaya", email: "bangcayarhoda@sac.edu.ph", role: "Developer" },
  { name: "Renz Asher E. Peralta", photo: "peralta", email: "peraltarenz@sac.edu.ph", role: "Developer" },
];

const MAIL_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6 8.5-6"/></svg>';
const GITHUB_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" class="team-link__solid"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z"/></svg>';

const card = (m: Member) => `
            <li class="team-card${m.lead ? " is-lead" : ""}">
              <img src="/images/team-${m.photo}.webp" alt="${m.name}" width="480" height="480" loading="lazy" decoding="async">
              <h3>${m.name}</h3>
              ${m.lead ? '<span class="team-badge">Lead Developer</span>' : `<p class="team-role">${m.role}</p>`}
              <div class="team-links">
                <a class="team-link" href="mailto:${m.email}" title="${m.email}" aria-label="Email ${m.name}">${MAIL_ICON}Email</a>
                ${m.github ? `<a class="team-link" href="https://github.com/${m.github}" target="_blank" rel="noopener noreferrer" aria-label="${m.name} on GitHub">${GITHUB_ICON}@${m.github}</a>` : ""}
              </div>
            </li>`;

export const teamMarkup = `
      <section class="landing-section team-section" id="team" aria-labelledby="team-title">
        <div class="section-shell">
          <header class="section-intro team-intro reveal">
            <p class="section-kicker">The developers</p>
            <h2 id="team-title">Meet the <span class="team-brand">ALAB</span> Developers</h2>
            <p>St. Anthony&rsquo;s College, Antique, Philippines</p>
          </header>
          <ul class="team-grid reveal">${MEMBERS.map(card).join("")}
          </ul>
        </div>
      </section>
`;

export const teamStyles = `
    .team-section { background: var(--landing-paper); }
    .team-intro { margin: 0 auto clamp(2rem, 4vw, 3rem); text-align: center; }
    .team-intro .section-kicker { justify-content: center; }
    .team-intro .section-kicker::after { width: 2.4rem; height: 0.15rem; border-radius: 999px; background: currentColor; content: ""; }
    .team-intro h2, .team-intro > p:last-child { margin-inline: auto; }
    .team-intro .team-brand { color: var(--landing-red); }
    .team-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 1.25rem; align-items: center; margin: 0; padding: 0; list-style: none; }
    .team-card { display: flex; min-width: 0; flex-direction: column; align-items: center; padding: 1.75rem 1rem 1.5rem; border: 1px solid var(--landing-line); border-radius: 1.5rem; background: #fff; box-shadow: 0 0.75rem 2rem rgb(16 34 44 / 6%); text-align: center; }
    .team-card img { width: 7.5rem; height: 7.5rem; border: 0.3rem solid #fff; border-radius: 50%; object-fit: cover; box-shadow: 0 0 0 2px rgb(217 27 16 / 22%), 0 0.5rem 1.25rem rgb(16 34 44 / 12%); }
    .team-card h3 { margin: 1rem 0 0.3rem; color: var(--landing-ink); font-size: 1.05rem; font-weight: 800; line-height: 1.3; }
    .team-role { margin: 0; color: var(--landing-muted); font-size: 0.9rem; }
    .team-links { display: flex; margin-top: 0.9rem; flex-direction: column; align-items: center; gap: 0.5rem; }
    .team-link { display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.45rem 0.95rem; border: 1px solid rgb(217 27 16 / 24%); border-radius: 999px; color: var(--landing-red); font-size: 0.85rem; font-weight: 750; text-decoration: none; transition: background 0.15s ease; }
    .team-link:hover { background: rgb(217 27 16 / 6%); }
    .team-link:focus-visible { outline: 2px solid var(--landing-red); outline-offset: 2px; }
    .team-link svg { width: 1rem; height: 1rem; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .team-link svg.team-link__solid { fill: currentColor; stroke: none; }
    .team-card.is-lead { padding: 2.25rem 1.25rem 1.75rem; border: 2px solid rgb(217 27 16 / 32%); box-shadow: 0 1.25rem 3rem rgb(217 27 16 / 14%); }
    .team-card.is-lead img { width: 9.5rem; height: 9.5rem; }
    .team-card.is-lead h3 { font-size: 1.3rem; }
    .team-badge { padding: 0.35rem 0.95rem; border-radius: 999px; background: var(--landing-red); color: #fff; font-size: 0.76rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
    @media (max-width: 1100px) {
      .team-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: 40rem; margin-inline: auto; }
      .team-card.is-lead { order: -1; grid-column: 1 / -1; justify-self: center; width: min(100%, 20rem); }
    }
    @media (max-width: 520px) {
      .team-grid { grid-template-columns: 1fr; }
    }
`;
