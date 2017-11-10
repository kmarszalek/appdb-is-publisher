import api from './api';
import graphql from './graphql';
import configuration from './configuration';

const _subModules = {
  api: null,
  graphql: null
};

async function _init(conf) {
  _subModules.api = await api.init(configuration);
  _subModules.graphql = await graphql.init(configuration);

  return {
    getApi: (name) => _subModules.api.get(name),
    getGraphQL: () => _subModules.graphql.getGraphQL()
  };
}

export default _init;