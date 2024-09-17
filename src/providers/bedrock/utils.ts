import { SignatureV4 } from '@smithy/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { getFromKV, putInKV } from '../../services/kvstore';
import { logger } from '../../apm';

export const generateAWSHeaders = async (
  body: Record<string, any> | undefined,
  headers: Record<string, string>,
  url: string,
  method: string,
  awsService: string,
  awsRegion: string,
  awsAccessKeyID: string,
  awsSecretAccessKey: string,
  awsSessionToken: string | undefined
): Promise<Record<string, string>> => {
  const signer = new SignatureV4({
    service: awsService,
    region: awsRegion || 'us-east-1',
    credentials: {
      accessKeyId: awsAccessKeyID,
      secretAccessKey: awsSecretAccessKey,
      ...(awsSessionToken && { sessionToken: awsSessionToken }),
    },
    sha256: Sha256,
  });

  const urlObj = new URL(url);
  const hostname = urlObj.hostname;
  headers['host'] = hostname;
  const request = {
    method: method,
    path: urlObj.pathname,
    protocol: 'https',
    hostname: urlObj.hostname,
    headers: headers,
    ...(body && { body: JSON.stringify(body) }),
  };

  const signed = await signer.sign(request);
  return signed.headers;
};

export async function getAssumedRoleCredentials(
  awsRoleArn: string,
  awsExternalId: string,
  awsRegion: string,
  accessKey?: string,
  secretKey?: string
) {
  const cacheKey = `${awsRoleArn}/${awsExternalId}/${awsRegion}`;
  const resp = await getFromKV(cacheKey);
  if (resp) {
    return resp;
  }
  // Long-term credentials to assume role, static values from ENV
  const accessKeyId: string =
    accessKey || process.env.AWS_ASSUME_ROLE_ACCESS_KEY_ID || '';
  const secretAccessKey: string =
    secretKey || process.env.AWS_ASSUME_ROLE_SECRET_ACCESS_KEY || '';
  const region = awsRegion || process.env.AWS_ASSUME_ROLE_REGION || 'us-east-1';
  const service = 'sts';
  const hostname = `sts.${region}.amazonaws.com`;
  const signer = new SignatureV4({
    service,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    sha256: Sha256,
  });
  const date = new Date();
  const sessionName = `${date.getFullYear()}${date.getMonth()}${date.getDay()}`;
  const url = `https://${hostname}?Action=AssumeRole&Version=2011-06-15&RoleArn=${awsRoleArn}&RoleSessionName=${sessionName}${awsExternalId ? `&ExternalId=${awsExternalId}` : ''}`;
  const urlObj = new URL(url);
  const requestHeaders = { host: hostname };
  const options = {
    method: 'GET',
    path: urlObj.pathname,
    protocol: urlObj.protocol,
    hostname: urlObj.hostname,
    headers: requestHeaders,
    query: Object.fromEntries(urlObj.searchParams),
  };
  const { headers } = await signer.sign(options);

  let credentials: any;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      const resp = await response.text();
      logger.error({ message: resp });
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlData = await response.text();
    credentials = parseXml(xmlData);
    putInKV(cacheKey, credentials, 60); //1 minute
  } catch (error) {
    logger.error({ message: `Error assuming role:, ${error}` });
  }
  return credentials;
}

function parseXml(xml: string) {
  // Simple XML parser for this specific use case
  const getTagContent = (tag: string) => {
    const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 's');
    const match = xml.match(regex);
    return match ? match[1] : null;
  };

  const credentials = getTagContent('Credentials');
  if (!credentials) {
    throw new Error('Failed to parse Credentials from XML response');
  }

  return {
    accessKeyId: getTagContent('AccessKeyId'),
    secretAccessKey: getTagContent('SecretAccessKey'),
    sessionToken: getTagContent('SessionToken'),
    expiration: getTagContent('Expiration'),
  };
}
