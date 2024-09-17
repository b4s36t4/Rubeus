import { logger } from '../../../apm';
import { LogStoreApmOptions } from '../../../middlewares/portkey/types';
import { retriableApiReq } from '../utils/helpers';
import { generateAWSHeaders } from './aws';
import { getS3CompatCreds } from './s3';

export async function uploadToWasabi(
  env: Record<string, any>,
  logObject: Record<string, any>,
  filePath: string,
  apmOptions: LogStoreApmOptions
) {
  const { bucket, region, accessKey, secretKey } = getS3CompatCreds(env);
  const url = `https://${bucket}.s3.${region}.wasabisys.com/${filePath}`;
  let isSuccess = true;
  let errorMessage = '';
  const body = JSON.stringify(logObject);
  try {
    const headers = await generateAWSHeaders(
      body,
      { 'content-type': 'application/json' },
      url,
      'POST',
      's3',
      region,
      accessKey,
      secretKey
    );
    const options = {
      method: 'POST',
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
      message: `WASABI_INSERT_ERROR: ${JSON.stringify({
        errorMessage,
        ...apmOptions,
      })}`,
    });
  }
}

export async function getFromWasabi(
  env: Record<string, any>,
  filePath: string
) {
  const { bucket, region, accessKey, secretKey } = getS3CompatCreds(env);
  const url = `https://${bucket}.s3.${region}.wasabisys.com/${filePath}`;
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
      message: `WASABI_GET_ERROR: ${errorMessage}`,
    });
  }
  return data;
}
