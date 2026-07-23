export const ExpoResourceFetcher = {
  fetch: async (_cb: (n: number) => void, url: string) => [
    `/tmp/${url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9._-]/g, '_')}`,
  ],
};
