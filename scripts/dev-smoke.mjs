const baseUrl = process.env.APP_URL ?? "http://localhost:3000";

const checks = [
  { name: "health", path: "/api/health", expectedStatus: 200 },
  { name: "profiles-active", path: "/api/profiles/active", expectedStatus: 200 },
  { name: "library", path: "/api/library", expectedStatus: 200 },
  { name: "jobs-not-found-shape", path: "/api/jobs/00000000-0000-0000-0000-000000000000", expectedStatus: 404 },
];

async function runCheck(check) {
  const url = `${baseUrl}${check.path}`;

  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(
      `Failed to reach ${url}. Start the dev server first with "pnpm dev". ${error instanceof Error ? error.message : ""}`.trim(),
    );
  }

  if (response.status !== check.expectedStatus) {
    const body = await response.text();
    throw new Error(
      `${check.name} expected HTTP ${check.expectedStatus} but got ${response.status} from ${url}. Body: ${body.slice(0, 300)}`,
    );
  }

  return {
    name: check.name,
    status: response.status,
  };
}

async function main() {
  const results = [];

  for (const check of checks) {
    const result = await runCheck(check);
    results.push(result);
  }

  for (const result of results) {
    console.log(`[smoke] ${result.name}: ${result.status}`);
  }
}

main().catch((error) => {
  console.error("[smoke] failed");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
