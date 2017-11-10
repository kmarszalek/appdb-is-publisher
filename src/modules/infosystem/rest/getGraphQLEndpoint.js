import Configuration from '../../../lib/isql/Configuration';
import _ from 'lodash';
import {join} from 'path';


export default function getGraphQLEndpoint() {
  let targetUrl = Configuration.getModuleConfiguration('infosystem.rest.graphQLUrl', 'local');

  if (targetUrl === 'local') {
    let localTarget = {
      protocol: Configuration.getServerConfiguration('http.protocol', 'http'),
      port: Configuration.getServerConfiguration('http.port', 80),
      host: Configuration.getServerConfiguration('http.host', 'localhost'),
      path: Configuration.getServerConfiguration('http.routes.infosystem.graphql', 'graphql')
    };
    return localTarget.protocol + '://' + localTarget.host + ':' + localTarget.port + join('/', localTarget.path);
  }

  return targetUrl;
};