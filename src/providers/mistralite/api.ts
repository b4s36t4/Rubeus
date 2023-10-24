import { ProviderAPIConfig } from "../types";

const MistraAPIConfig: ProviderAPIConfig = {
  baseURL: "https://api-inference.huggingface.co/models",
  headers: (API_KEY: string) => {
    return { Authorization: `Bearer ${API_KEY}` };
  },
  complete: "/mistralai/Mistral-7B-v0.1",
  chatComplete: "/mistralai/Mistral-7B-Instruct-v0.1",
};

export default MistraAPIConfig;
