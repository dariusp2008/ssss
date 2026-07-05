declare const __APP_VERSION__: string;
declare const __COMMIT_HASH__: string;
declare const __BUILD_DATE__: string;

const state = {
  version: typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "1.0.0",
  commitHash: typeof __COMMIT_HASH__ !== "undefined" ? __COMMIT_HASH__ : "dev",
  buildDate: typeof __BUILD_DATE__ !== "undefined" ? __BUILD_DATE__ : new Date().toISOString(),
};

export function setVersionState(v: { version: string; commitHash: string; buildDate?: string }) {
  state.version = v.version;
  state.commitHash = v.commitHash;
  if (v.buildDate) state.buildDate = v.buildDate;
}

export function getVersionString(): string {
  const hash = state.commitHash !== "dev" ? ` (${state.commitHash})` : "";
  return `v${state.version}${hash}`;
}

export function getFullVersionInfo() {
  return {
    version: state.version,
    commitHash: state.commitHash,
    buildDate: state.buildDate,
    display: getVersionString(),
  };
}
