import { requestUrl } from "obsidian";

const BASE_URL = "https://api.prod.whoop.com/developer/v2";

export class WhoopClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async get(path: string, params?: Record<string, string>): Promise<unknown> {
    let url = BASE_URL + path;
    if (params && Object.keys(params).length > 0) {
      url += "?" + new URLSearchParams(params).toString();
    }

    let backoffMs = 1000;
    for (let attempt = 0; attempt <= 3; attempt++) {
      const resp = await requestUrl({
        url,
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/json",
        },
      });

      if (resp.status === 429) {
        if (attempt < 3) {
          await sleep(backoffMs);
          backoffMs *= 2;
          continue;
        }
        throw new Error(`WHOOP API rate limit exceeded for ${path}`);
      }

      if (resp.status === 404) {
        throw new NotFoundError(path);
      }

      if (resp.status < 200 || resp.status >= 300) {
        throw new Error(`WHOOP API returned ${resp.status} for ${path}`);
      }

      return resp.json;
    }

    throw new Error(`WHOOP API request failed for ${path}`);
  }
}

export class NotFoundError extends Error {
  constructor(path: string) {
    super(`Not found: ${path}`);
    this.name = "NotFoundError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
