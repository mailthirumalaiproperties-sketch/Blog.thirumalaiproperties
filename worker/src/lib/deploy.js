// Triggers and reports the main website's GitHub Actions build, which pulls
// published content from this API and redeploys thirumalaiproperties.com.

function githubConfig(env) {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_WORKFLOW, GITHUB_REF } = env;
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || !GITHUB_WORKFLOW) return null;
  return {
    base: `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${GITHUB_WORKFLOW}`,
    ref: GITHUB_REF || "main",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "thirumalai-cms",
    },
  };
}

export async function triggerSiteBuild(env, reason) {
  const gh = githubConfig(env);
  if (!gh) {
    console.log(`site build not triggered (GitHub not configured): ${reason}`);
    return { triggered: false, reason: "not-configured" };
  }
  const res = await fetch(`${gh.base}/dispatches`, {
    method: "POST",
    headers: { ...gh.headers, "Content-Type": "application/json" },
    body: JSON.stringify({ ref: gh.ref }),
  });
  if (!res.ok) {
    console.error("site build trigger failed", res.status, await res.text());
    return { triggered: false, reason: `github-${res.status}` };
  }
  return { triggered: true };
}

export async function latestSiteBuild(env) {
  const gh = githubConfig(env);
  if (!gh) return { configured: false };
  const res = await fetch(`${gh.base}/runs?per_page=1`, { headers: gh.headers });
  if (!res.ok) return { configured: true, error: `GitHub returned ${res.status}` };
  const run = (await res.json()).workflow_runs?.[0];
  if (!run) return { configured: true, run: null };
  return {
    configured: true,
    run: {
      status: run.status,
      conclusion: run.conclusion,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      url: run.html_url,
      event: run.event,
    },
  };
}

/** Fire-and-forget rebuild after content changes (does not delay the response). */
export function scheduleSiteBuild(c, reason) {
  const task = triggerSiteBuild(c.env, reason).catch((err) => console.error("site build trigger error", err));
  try {
    c.executionCtx.waitUntil(task);
  } catch {
    // executionCtx is unavailable in some test environments; the promise still runs.
  }
}
