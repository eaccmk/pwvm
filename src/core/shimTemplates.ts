const escapeUnixPath = (p: string) => p.replace(/'/g, "'\\''");
const escapeWindowsPath = (p: string) => p.replace(/"/g, "").replace(/%/g, "%%");

export const unixShim = (pwvmBinPath: string): string => `#!/usr/bin/env bash
node '${escapeUnixPath(pwvmBinPath)}' _shim "$@"
`;

export const windowsShim = (pwvmBinPath: string): string => `@echo off
"${escapeWindowsPath(pwvmBinPath)}" _shim %*
`;
