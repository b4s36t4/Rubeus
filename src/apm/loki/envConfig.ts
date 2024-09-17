const requiredEnvVars = ['NODE_ENV', 'SERVICE_NAME', 'LOKI_AUTH', 'LOKI_HOST'];

export const loadAndValidateEnv = () => {
  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      console.error(`Missing required environment variable: ${varName}`);
      process.exit(1);
    }
  });

  return {
    NODE_ENV: process.env.NODE_ENV!,
    SERVICE_NAME: process.env.SERVICE_NAME!,
    LOKI_AUTH: process.env.LOKI_AUTH!,
    LOKI_HOST: process.env.LOKI_HOST!,
  };
};
