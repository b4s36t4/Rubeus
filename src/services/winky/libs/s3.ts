import { logger } from '../../../apm';
import { LogStoreApmOptions } from '../../../middlewares/portkey/types';
import { getAssumedRoleCredentials } from '../../../providers/bedrock/utils';
import { retriableApiReq } from '../utils/helpers';
import { generateAWSHeaders } from './aws';

export function getS3CompatCreds(env: Record<string, any>) {
  return {
    region: env.LOG_STORE_REGION,
    accessKey: env.LOG_STORE_ACCESS_KEY,
    secretKey: env.LOG_STORE_SECRET_KEY,
    bucket: env.LOG_STORE_GENERATIONS_BUCKET,
    roleArn: env.LOG_STORE_AWS_ROLE_ARN,
    externalId: env.LOG_STORE_AWS_EXTERNAL_ID,
    basePath: env.LOG_STORE_BASEPATH,
  };
}

export async function uploadToS3(
  env: Record<string, any>,
  logObject: Record<string, any>,
  filePath: string,
  apmOptions: LogStoreApmOptions
) {
  const { bucket, region, accessKey, secretKey } = getS3CompatCreds(env);
  const url = `https://${bucket}.s3.${region}.amazonaws.com/${filePath}`;
  let isSuccess = true;
  let errorMessage = '';
  const body = JSON.stringify(logObject);
  try {
    const headers = await generateAWSHeaders(
      body,
      { 'content-type': 'application/json' },
      url,
      'PUT',
      's3',
      region,
      accessKey,
      secretKey
    );
    const options = {
      method: 'PUT',
      headers,
      body: JSON.stringify(logObject),
    };
    await retriableApiReq(env, url, options);
  } catch (error: any) {
    isSuccess = false;
    errorMessage = error.message;
  }
  if (!isSuccess) {
    logger.error({
      message: `S3_INSERT_ERROR: ${JSON.stringify({
        errorMessage,
        ...apmOptions,
      })}`,
    });
  }
}

export async function uploadToS3Assumed(
  env: Record<string, any>,
  logObject: Record<string, any>,
  filePath: string,
  apmOptions: LogStoreApmOptions
) {
  const { bucket, region, accessKey, secretKey, roleArn, externalId } =
    getS3CompatCreds(env);
  const { accessKeyId, secretAccessKey, sessionToken } =
    await getAssumedRoleCredentials(
      roleArn,
      externalId,
      region,
      accessKey,
      secretKey
    );
  const url = `https://${bucket}.s3.${region}.amazonaws.com/${filePath}`;
  let isSuccess = true;
  let errorMessage = '';
  const body = JSON.stringify(logObject);
  try {
    const headers = await generateAWSHeaders(
      body,
      { 'content-type': 'application/json' },
      url,
      'PUT',
      's3',
      region,
      accessKeyId,
      secretAccessKey,
      sessionToken
    );
    const options = {
      method: 'PUT',
      headers,
      body: JSON.stringify(logObject),
    };
    await retriableApiReq(env, url, options);
  } catch (error: any) {
    isSuccess = false;
    errorMessage = error.message;
  }
  if (!isSuccess) {
    logger.error({
      message: `S3_INSERT_ERROR: ${JSON.stringify({
        errorMessage,
        ...apmOptions,
      })}`,
    });
  }
}

export async function getFromS3(env: Record<string, any>, filePath: string) {
  const { bucket, region, accessKey, secretKey } = getS3CompatCreds(env);
  const url = `https://${bucket}.s3.${region}.amazonaws.com/${filePath}`;
  let isSuccess = true;
  let errorMessage = '';
  let data;
  try {
    const headers = await generateAWSHeaders(
      undefined,
      { 'content-type': 'application/json' },
      url,
      'GET',
      's3',
      region,
      accessKey,
      secretKey
    );
    const options = {
      method: 'GET',
      headers,
    };
    const resp = await retriableApiReq(env, url, options);
    data = await resp.json();
  } catch (error: any) {
    isSuccess = false;
    errorMessage = error.message;
  }
  if (!isSuccess) {
    logger.error({
      message: `S3_INSERT_ERROR: ${errorMessage}`,
    });
  }
  return data;
}

export async function getFromS3Assumed(
  env: Record<string, any>,
  filePath: string
) {
  const { bucket, region, accessKey, secretKey, roleArn, externalId } =
    getS3CompatCreds(env);
  const { accessKeyId, secretAccessKey, sessionToken } =
    await getAssumedRoleCredentials(
      roleArn,
      externalId,
      region,
      accessKey,
      secretKey
    );
  const url = `https://${bucket}.s3.${region}.amazonaws.com/${filePath}`;
  let isSuccess = true;
  let errorMessage = '';
  let data;
  try {
    const headers = await generateAWSHeaders(
      undefined,
      { 'content-type': 'application/json' },
      url,
      'GET',
      's3',
      region,
      accessKeyId,
      secretAccessKey,
      sessionToken
    );
    const options = {
      method: 'GET',
      headers,
    };
    const resp = await retriableApiReq(env, url, options);
    data = await resp.json();
  } catch (error: any) {
    isSuccess = false;
    errorMessage = error.message;
  }
  if (!isSuccess) {
    logger.error({
      message: `S3_INSERT_ERROR: ${errorMessage}`,
    });
  }
  return data;
}
