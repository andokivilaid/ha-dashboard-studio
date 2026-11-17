/** Thin GitHub REST client with rate-limit awareness, used by the ingester. */

const API = "https://api.github.com";

export interface GhRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string;
  default_branch: string;
  topics?: string[];
  archived: boolean;
  fork: boolean;
  owner: { login: string; html_url: string };
  license: { key: string; name: string; url: string | null } | null;
}

export interface GhTreeEntry {
  path: string;
  type: "blob" | "tree" | "commit";
  size?: number;
  sha: string;
}

export class GitHub {
  private remaining = 5000;
  private resetAt = 0;

  constructor(private readonly token: string) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (this.remaining <= 2 && this.resetAt > Date.now()) {
      const wait = this.resetAt - Date.now() + 1000;
      process.stderr.write(`  rate limit reached, sleeping ${Math.round(wait / 1000)}s\n`);
      await new Promise((r) => setTimeout(r, wait));
    }
    const url = path.startsWith("http") ? path : `${API}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "ha-dashboard-studio-ingest",
        ...(init.headers ?? {}),
      },
    });
    const remaining = res.headers.get("x-ratelimit-remaining");
    const reset = res.headers.get("x-ratelimit-reset");
    if (remaining) this.remaining = Number(remaining);
    if (reset) this.resetAt = Number(reset) * 1000;

    if (res.status === 403 || res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after") ?? 60);
      process.stderr.write(`  secondary limit, sleeping ${retryAfter}s\n`);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      return this.request<T>(path, init);
    }
    if (!res.ok) throw new Error(`GitHub ${res.status} ${res.statusText} for ${url}`);
    return (await res.json()) as T;
  }

  async searchRepos(query: string, perPage = 100, page = 1): Promise<GhRepo[]> {
    const data = await this.request<{ items: GhRepo[] }>(
      `/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}&page=${page}`,
    );
    return data.items ?? [];
  }

  async searchCode(query: string, perPage = 100, page = 1): Promise<
    Array<{ path: string; repository: GhRepo; html_url: string }>
  > {
    const data = await this.request<{
      items: Array<{ path: string; repository: GhRepo; html_url: string }>;
    }>(`/search/code?q=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`);
    return data.items ?? [];
  }

  async getRepo(fullName: string): Promise<GhRepo> {
    return this.request<GhRepo>(`/repos/${fullName}`);
  }

  async getTree(fullName: string, branch: string): Promise<GhTreeEntry[]> {
    const data = await this.request<{ tree: GhTreeEntry[]; truncated: boolean }>(
      `/repos/${fullName}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    );
    return data.tree ?? [];
  }

  async getRawFile(fullName: string, branch: string, path: string): Promise<string> {
    const url = `https://raw.githubusercontent.com/${fullName}/${branch}/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
    const res = await fetch(url, { headers: { "User-Agent": "ha-dashboard-studio-ingest" } });
    if (!res.ok) throw new Error(`raw ${res.status} for ${url}`);
    return res.text();
  }

  get rateRemaining(): number {
    return this.remaining;
  }
}
