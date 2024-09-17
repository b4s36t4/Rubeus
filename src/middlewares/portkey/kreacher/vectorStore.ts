import { pcDeleteOne, pcQuery, pcUpsert } from '../../../data-stores/pinecone';

// Helper function to create the filter object for Pinecone.
function createPineconeMetaFilters(metadata: Record<string, any>) {
  const filter: Record<string, any> = {};
  Object.keys(metadata).forEach((key) => {
    // Pinecone does not accept null values in filters
    if (metadata[key] !== null) {
      filter[key] = { $eq: metadata[key] };
    }
  });
  return filter;
}

export const VectorStore = {
  get: async (
    vector: any,
    metadata: Record<string, any>,
    namespace: string
  ) => {
    try {
      const vectorStoreResponse = await pcQuery(
        vector,
        1,
        createPineconeMetaFilters(metadata),
        namespace
      );

      if (
        vectorStoreResponse &&
        vectorStoreResponse.matches &&
        vectorStoreResponse.matches.length > 0
      ) {
        const firstMatch = vectorStoreResponse.matches[0];
        return firstMatch.id;
      }
    } catch (err: any) {
      return false;
    }

    return true;
  },

  put: async (
    key: string,
    vector: any,
    metadata: Record<string, any>,
    namespace: string
  ) => {
    try {
      // Store the request vector in the vector db
      const upsertVectors = [{ id: key, values: vector, metadata: metadata }];
      await pcUpsert(upsertVectors, namespace);
    } catch (err: any) {
      return false;
    }

    return true;
  },

  del: async (key: string, namespace: string) => {
    try {
      // Delete this key from the vector DB, if exists
      await pcDeleteOne(key, namespace);
    } catch (err: any) {
      return false;
    }

    return true;
  },
};
