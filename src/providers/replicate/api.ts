import { ProviderAPIConfig } from "../types";

const ReplicateAPIConfig: ProviderAPIConfig = {
  baseURL: "https://api.replicate.com/v1",
  headers: (API_KEY: string) => {
    return { Authorization: `Token ${API_KEY}` };
  },
  complete: "/predictions",
  chatComplete: "/predictions",
};

export default ReplicateAPIConfig;
