import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { teamMarkup } from "../app/_content/landing-team.ts";

test("landing team section lists the five abstract authors with Khing Jay as lead developer", () => {
  const names = [...teamMarkup.matchAll(/<h3>([^<]+)<\/h3>/g)].map((match) => match[1]);
  assert.deepEqual(names, ["Jhon Kylho Estrabo", "John Rey D. Fajardo", "Khing Jay C. Regala", "Rhoda May V. Bangcaya", "Renz Asher E. Peralta"]);
  const lead = teamMarkup.slice(teamMarkup.indexOf('class="team-card is-lead"'));
  assert.match(lead.slice(0, lead.indexOf("</li>")), /Khing Jay C\. Regala[\s\S]*Lead Developer/);
  assert.equal(teamMarkup.match(/is-lead/g).length, 1);
  for (const [, photo] of teamMarkup.matchAll(/src="(\/images\/[^"]+)"/g)) {
    assert.ok(existsSync(`public${photo}`), photo);
  }
});

test("landing page places the team section inside the landing content, before </main>", () => {
  const page = readFileSync("app/_components/landing-page.tsx", "utf8");
  assert.match(page, /lastIndexOf\("<\/div>", withCall\.indexOf\("<\/main>"\)\)/);
  assert.match(page, /\$\{teamStyles\}/);
});
