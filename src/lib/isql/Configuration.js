import config from './../../../config/config'; //'./../../../config/config';
import _ from 'lodash';

class Configuration {
  constructor() {

  }

  getModuleConfiguration(name, defaultValue = null) {
    let ns = 'modules.' + name;
    return _.get(config, ns, defaultValue);
  };

  getServerConfiguration(name, defaultValue = null) {
    let ns = 'server.' + name;
    return _.get(config, ns, defaultValue);
  }

}

const _configuration = new Configuration();

export default _configuration;
