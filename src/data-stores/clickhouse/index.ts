import { createClient } from '@clickhouse/client';

let updatedHost = process.env.ANALYTICS_STORE_ENDPOINT;
//modify host to prefix http:// if not present
if (!updatedHost?.startsWith('http')) {
  updatedHost = `http://${updatedHost}`;
}
// modify host to suffix :port is not present
if (
  !process.env.ANALYTICS_STORE_ENDPOINT?.includes(':') &&
  process.env.ANALYTICS_STORE_PORT
) {
  updatedHost = `${updatedHost}:${process.env.ANALYTICS_STORE_PORT}`;
}

const clickhouseClient = createClient({
  host: updatedHost,
  username: process.env.ANALYTICS_STORE_USER,
  password: process.env.ANALYTICS_STORE_PASSWORD,
});

async function testConnection() {
  try {
    console.log('Attempting to ping ClickHouse...');
    await clickhouseClient.ping();
    console.log('Ping successful');

    console.log('Attempting to execute a query...');
    const rows = await clickhouseClient.query({
      query: 'SELECT 1',
      format: 'JSONEachRow',
    });
    await rows.json();

    console.log('Connected successfully to ClickHouse');
  } catch (e) {
    console.error('ClickHouse connection error:', e);
    process.exit(1);
  }
}

testConnection();

export default clickhouseClient;
