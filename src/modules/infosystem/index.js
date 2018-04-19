import api from './api';
import graphql from './graphql';
import configuration from './configuration';

const _subModules = {
  logger: null,
  api: null,
  graphql: null
};

/**
 * Initialize and return api, graphql and logger sub modules.
 */
async function _init() {
  _subModules.api = await api.init(configuration);
  _subModules.graphql = await graphql.init(configuration);

  return {
    getLogger: (name) => configuration.getLogger(name),
    getApi: (name) => _subModules.api.get(name),
    getGraphQL: () => _subModules.graphql.getGraphQL()
  };
}

export default _init;