export type MrkhubConfig = {
  repositories: string[];
  installDir?: string;
  githubToken?: string;
  defaultRef: string;
};

export type ResolvedRepo = {
  owner: string;
  repo: string;
  ref: string;
  skillsPath: string;
};
