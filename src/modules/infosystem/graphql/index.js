import {merge} from 'lodash';
import { makeExecutableSchema } from 'graphql-tools';
import {getDirectoryFiles} from './../../../lib/isql/utils/fs';
import {resolve} from 'path';

/**
 * Initialize and generate GraphQL executable schema
 * based on the type definitions in ./schema/*.graphql files
 * and the resolvers in ./resolvers/*.js folders.
 *
 * @returns {object}  GraphQL module API.
 */
async function _init() {
  let typeDefs = await getDirectoryFiles(__dirname + '/schema/*.graphql', 'text/plain');
  let resolveDefs = await getDirectoryFiles(__dirname + '/resolvers/*.js', 'application/javascript');
  let resolvers = resolveDefs.reduce((sum, def) => merge(sum, def), {});
  let executableSchema = makeExecutableSchema({typeDefs, resolvers});

  return {
    getGraphQL: () => executableSchema
  };
}

export const serviceDescription = {
  '/graphql': {
    description: 'Service providing a GraphQL endpoint to query the information system backend.'
  },
  '/tools/graphiql': {
    description: 'Service providing a UI tool to post queries to the local GraphQL endpoint.'
  },
  '/tools/voyager': {
    description: 'Service providing a UI tool to visually explore the local GraphQL schema as an interactive graph. [experimental]'
  }
};

export default {
  init: _init
}