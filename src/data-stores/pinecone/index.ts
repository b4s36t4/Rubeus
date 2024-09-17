import { Index, Pinecone, PineconeRecord } from '@pinecone-database/pinecone';

let pc: Pinecone | undefined;
let index: Index | undefined;

const { PINECONE_INDEX: pineconeIndexHost, PINECONE_API_KEY: pineconeApiKey } =
  process.env;

if (pineconeApiKey && pineconeIndexHost) {
  pc = new Pinecone();
  index = pc.index(pineconeIndexHost);
} else {
  console.log(
    'skipping pinecone initialization as env vars are not passed: PINECONE_API_KEY, PINECONE_INDEX_HOST'
  );
}

export const pineconeClient = pc;

export const pcUpsert = async (
  upsertData: PineconeRecord[],
  namespace: string
) => {
  if (!pc || !index) {
    throw new Error('Pinecone client not initialized');
  }
  return index.namespace(namespace).upsert(upsertData);
};

export const pcQuery = async (
  vector: any,
  topK: number,
  filter: any,
  namespace: string
) => {
  if (!pc || !index) {
    throw new Error('Pinecone client not initialized');
  }
  return index.namespace(namespace).query({
    vector,
    topK,
    filter: filter || {},
  });
};

export const pcDeleteOne = async (recordId: string, namespace: string) => {
  if (!pc || !index) {
    throw new Error('Pinecone client not initialized');
  }
  return await index.namespace(namespace).deleteOne(recordId);
};
