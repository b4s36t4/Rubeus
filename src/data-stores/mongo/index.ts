import { Db, MongoClient } from 'mongodb';
import { logger } from '../../apm';

const {
  MONGO_DB_CONNECTION_URL: url,
  LOG_STORE: logStore,
  MONGO_DATABASE: dbName,
  MONGO_COLLECTION_NAME: collectionName,
  MONGO_GENERATION_HOOKS_COLLECTION_NAME: generationHooksCollectionName,
} = process.env;

if (!logStore) {
  console.log(
    'LOG_STORE is not set in env. It can have these values: mongo, s3, wasabi, azure, gcs, or netapp'
  );
  process.exit();
}

if (
  logStore === 'mongo' &&
  (!url ||
    !logStore ||
    !dbName ||
    !collectionName ||
    !generationHooksCollectionName)
) {
  console.log(
    'Required envs are not set for mongo log store: MONGO_DB_CONNECTION_URL, MONGO_DATABASE, MONGO_COLLECTION_NAME'
  );
  process.exit();
}

let client: MongoClient | undefined;
let database: Db | undefined;

if (logStore === 'mongo') {
  client = new MongoClient(url as string);
  // Use connect method to connect to the server
  await client.connect();

  database = client.db(dbName);
  try {
    await database.command({
      ping: 1,
    });
  } catch (e) {
    console.log('MONGO PING ERROR', e);
    process.exit();
  }

  console.log('Connected successfully to MongoDB');
}

export const mongoClient = database;

export const mongoGet = async (query: any, mongoCollectionName: string) => {
  if (!database || !collectionName) {
    throw new Error('log store is not mongo');
  }
  const collection = database.collection(mongoCollectionName);
  return await collection.find(query).toArray();
};

export const mongoSet = async (data: any, mongoCollectionName: string) => {
  if (!database || !collectionName) {
    throw new Error('log store is not mongo');
  }
  try {
    const collection = database.collection(mongoCollectionName);
    await collection.insertOne(data);
  } catch (e: any) {
    logger.error({
      message: `mongo insert error: ${e.message}`,
      logId: data['_id'],
    });
  }
  return;
};
