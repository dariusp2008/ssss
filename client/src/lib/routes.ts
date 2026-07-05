const APP_ROUTE_PATTERNS: string[] = [
  "/",
  "/dashboard",
  "/projects",
  "/projects/:id",
  "/notifications",
  "/notification-settings",
  "/my-account",
  "/settings",
  "/subscription",
  "/my-data",
  "/news",
  "/companies",
  "/companies/:id",
  "/funding-calls",
  "/funding-calls/:id",
  "/cauta-dupa-idee",
  "/eligibility",
  "/how-it-works",
  "/calendar",
  "/calls-management",
  "/admin",
  "/privacy-policy",
  "/terms-conditions",
  "/cookie-policy",
];

function matchPattern(pattern: string, path: string): boolean {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return false;
  return patternParts.every((seg, i) =>
    seg.startsWith(":") ? pathParts[i].length > 0 : seg === pathParts[i]
  );
}

export function isKnownAppRoute(pathname: string): boolean {
  const path =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  return APP_ROUTE_PATTERNS.some((pattern) => matchPattern(pattern, path));
}
