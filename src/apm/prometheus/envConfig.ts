const requiredEnvVars = [
  'NODE_ENV',
  'PROMETHEUS_GATEWAY_URL',
  'PROMETHEUS_GATEWAY_AUTH',
  'SERVICE_NAME',
];

export const loadAndValidateEnv = (): { [key: string]: string } => {
  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      console.error(`Missing required environment variable: ${varName}`);
      process.exit(1);
    }
  });

  return {
    NODE_ENV: process.env.NODE_ENV!,
    PROMETHEUS_GATEWAY_URL: process.env.PROMETHEUS_GATEWAY_URL!,
    PROMETHEUS_GATEWAY_AUTH: process.env.PROMETHEUS_GATEWAY_AUTH!,
    SERVICE_NAME: process.env.SERVICE_NAME!,
  };
};
