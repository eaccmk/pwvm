import https from "node:https";

export type RegistryMetadata = {
  versions?: Record<string, unknown>;
  "dist-tags"?: {
    latest?: string;
  };
};

const REGISTRY_URL = "https://registry.npmjs.org";

export const fetchPackageMetadata = async (
  packageName: string,
): Promise<RegistryMetadata> =>
  new Promise((resolve, reject) => {
    const url = `${REGISTRY_URL}/${encodeURIComponent(packageName)}`;
    const request = https.get(
      url,
      {
        headers: {
          Accept: "application/vnd.npm.install-v1+json",
        },
      },
      (response) => {
        if (!response.statusCode || response.statusCode >= 400) {
          reject(new Error("Registry request failed."));
          response.resume();
          return;
        }

        response.setEncoding("utf8");
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          try {
            const parsed = JSON.parse(body) as RegistryMetadata;
            resolve(parsed);
          } catch {
            reject(new Error("Invalid registry response."));
          }
        });
      },
    );

    request.on("error", (error) => {
      reject(error);
    });

    request.setTimeout(8000, () => {
      request.destroy(new Error("Registry request timed out."));
    });
  });
