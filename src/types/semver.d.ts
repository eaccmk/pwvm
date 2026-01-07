declare module "semver" {
  const semver: {
    valid: (version: string) => string | null;
    rcompare: (a: string, b: string) => number;
    compare: (a: string, b: string) => number;
  };

  export default semver;
}
