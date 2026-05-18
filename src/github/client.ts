export type GitHubClientOptions = {
  token?: string;
};

export class GitHubClient {
  constructor(private readonly options: GitHubClientOptions = {}) {}

  async fetchJson<T>(url: string): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "openclaw-mrkhub-plugin",
    };
    if (this.options.token) {
      headers.Authorization = `Bearer ${this.options.token}`;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  repoContentsUrl(
    owner: string,
    repo: string,
    path: string,
    ref: string,
  ): string {
    const encoded = path
      .split("/")
      .filter(Boolean)
      .map((s) => encodeURIComponent(s))
      .join("/");
    return `https://api.github.com/repos/${owner}/${repo}/contents/${encoded}?ref=${encodeURIComponent(ref)}`;
  }

  rawFileUrl(
    owner: string,
    repo: string,
    path: string,
    ref: string,
  ): string {
    return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
  }
}
