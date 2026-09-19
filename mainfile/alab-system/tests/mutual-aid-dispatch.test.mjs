import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";

const source = (path) => readFileSync(join(process.cwd(), path), "utf8");

test("a summoned municipality may dispatch to the fire it was called to", () => {
  const dispatch = source("lib/municipal-bfp/dispatch.ts");

  /*
   * Dispatch required the incident to belong to the municipality pressing the
   * button. A summoned town could see the fire, see the road to it and accept
   * the request, then be refused when it tried to assign anyone: the call for
   * help reached them and stopped there.
   */
  assert.match(dispatch, /select 1 from incident_municipal_observers observer/);
  assert.match(dispatch, /observer\.observer_municipality_id = \$2/);
  assert.match(dispatch, /observer\.status = 'ACTIVE'/);
  // Resolving another municipality's incident is still theirs alone.
  assert.match(dispatch, /where fr\.id = \$1 and fr\.municipality_id = \$2/);
});

test("mutual aid adds crews without rewinding the incident", () => {
  const dispatch = source("lib/municipal-bfp/dispatch.ts");

  // A helper arriving at a fire whose own teams are already on scene must not
  // drag it back to RESPONDING, nor take over the responding station name.
  assert.match(dispatch, /const isOriginDispatch =/);
  assert.match(dispatch, /if \(isOriginDispatch\) \{/);
  assert.match(dispatch, /Mutual aid: \$\{input\.municipalityName\}/);
  assert.match(dispatch, /if \(isOriginDispatch && alreadyResponding\) throw new Error\("INVALID_STATUS"\)/);
});

test("a responder's app is given the fire, whoever they work for", () => {
  const dispatch = source("lib/municipal-bfp/dispatch.ts");
  const assignments = dispatch.slice(dispatch.indexOf("listMobileDispatchAssignments"));

  // Assignments are keyed on the responder, not their municipality, so a
  // summoned town's crew is served the same coordinates as the owner's.
  assert.match(assignments, /recipient\.recipient_user_id = \$1/);
  assert.match(assignments, /report\.latitude::float as latitude/);
  assert.match(assignments, /report\.longitude::float as longitude/);
  assert.doesNotMatch(
    assignments.slice(0, assignments.indexOf("order by")),
    /municipality_id = \$2/,
    "no municipality filter stands between a responder and their assignment",
  );
});

test("the observer row is what authorises the dispatch", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create table municipalities(id uuid primary key default gen_random_uuid(), name text);
      create table fire_reports(
        id uuid primary key default gen_random_uuid(),
        municipality_id uuid not null,
        status text not null default 'RESPONDING'
      );
      create table incident_municipal_observers(
        id uuid primary key default gen_random_uuid(),
        fire_report_id uuid not null,
        observer_municipality_id uuid not null,
        status text not null
      );
    `);

    const hamtic = (await db.query(`insert into municipalities(name) values ('Hamtic') returning id`)).rows[0].id;
    const sanJose = (await db.query(`insert into municipalities(name) values ('San Jose') returning id`)).rows[0].id;
    const culasi = (await db.query(`insert into municipalities(name) values ('Culasi') returning id`)).rows[0].id;
    const fire = (await db.query(`insert into fire_reports(municipality_id) values ($1) returning id`, [hamtic])).rows[0].id;

    // San Jose was summoned; Culasi was not.
    await db.query(
      `insert into incident_municipal_observers(fire_report_id, observer_municipality_id, status)
       values ($1, $2, 'ACTIVE')`,
      [fire, sanJose],
    );

    const permitted = (municipalityId) =>
      db.query(
        `select 1 from fire_reports fr
          where fr.id = $1
            and (
              fr.municipality_id = $2
              or exists (
                select 1 from incident_municipal_observers observer
                 where observer.fire_report_id = fr.id
                   and observer.observer_municipality_id = $2
                   and observer.status = 'ACTIVE'
              )
            )`,
        [fire, municipalityId],
      );

    assert.equal((await permitted(hamtic)).rows.length, 1, "the owning municipality may dispatch");
    assert.equal((await permitted(sanJose)).rows.length, 1, "so may the one it called for help");
    assert.equal((await permitted(culasi)).rows.length, 0, "a municipality nobody called may not");

    // Once monitoring ends, so does the authority it carried.
    await db.query(`update incident_municipal_observers set status = 'ENDED' where fire_report_id = $1`, [fire]);
    assert.equal((await permitted(sanJose)).rows.length, 0, "the authority ends when the summons does");
  } finally {
    await db.close();
  }
});
