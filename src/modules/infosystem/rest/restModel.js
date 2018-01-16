import { GraphQLClient } from 'graphql-request'
import getGraphQLEndpoint from './getGraphQLEndpoint';

const _graphQLEndpoint = getGraphQLEndpoint();
console.log('REST GRPAPHQL ENDPOINT', _graphQLEndpoint);
export const client = new GraphQLClient(_graphQLEndpoint,{ headers: {}});

export const query = (query, variables) => {
  return client.request(query, variables);
}

export const TEMPLATE_COLLECTION_HEADER = `
totalCount
count
limit
skip`;