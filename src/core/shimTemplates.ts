export const unixShim = (pwvmBinPath: string): string => `#!/usr/bin/env bash
node "${pwvmBinPath}" _shim "$@"
`;

export const windowsShim = (pwvmBinPath: string): string => `@echo off
"${pwvmBinPath}" _shim %*
`;
