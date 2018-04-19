import { GraphQLClient } from 'graphql-request'
import getGraphQLEndpoint from './getGraphQLEndpoint';

//Get GraphQL endpoint
const _graphQLEndpoint = getGraphQLEndpoint();

console.log('REST GRPAPHQL ENDPOINT', _graphQLEndpoint);

//Create a GraphQL client
export const client = new GraphQLClient(_graphQLEndpoint,{ headers: {}});

//Create query function
export const query = (query, variables) => {
  return client.request(query, variables);
}

export const TEMPLATE_COLLECTION_HEADER = `
totalCount
count
limit
skip`;