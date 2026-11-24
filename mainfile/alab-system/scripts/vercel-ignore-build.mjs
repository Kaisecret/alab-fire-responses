import { spawnSync } from "node:child_process";

// Only bynr is the active ALAB Vercel project. A second project is still
// connected to the repository in its owner's Vercel account.
const liveProject = "prj_4kiDvWv1tQinQzFuuZ4iNHZUhSMA";
const project = process.env.VERCEL_PROJECT_ID;
const deploymentUrls = [
  process.env.VERCEL_URL,
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
];
const obsoleteUrl = deploymentUrls.some((url) =>
  /^alab-fire-responses-bdtd(?:[.-]|$)/.test(url ?? ""),
);

// Vercel's ignored-build command uses 0 to skip and 1 to build.
if ((project && project !== liveProject) || obsoleteUrl) {
  console.log("Skipping obsolete Vercel project; ALAB deploys through bynr only.");
  process.exit(0);
}

const previous = process.env.VERCEL_GIT_PREVIOUS_SHA;
if (!previous) process.exit(1);

const diff = spawnSync("git", ["diff", "--quiet", previous, "HEAD", "--", "."], {
  stdio: "ignore",
});
// Missing shallow-clone history must build, just as changed files do.
process.exit(diff.status === 0 ? 0 : 1);
