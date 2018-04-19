import config from './../../../config/config';
import _ from 'lodash';

/**
 * Helper class to retrieve configuration objects.
 */
class Configuration {
  constructor() {

  }
  /**
   * Retrieve configuration of a specific module.
   *
   * @param   {string}  name          Module name.
   * @param   {object}  defaultValue  Optional. Configuration object to be used if none is found for the specific module.
   *
   * @returns {object}                Configuration object.
   */
  getModuleConfiguration(name, defaultValue = null) {
    let ns = 'modules.' + name;
    return _.get(config, ns, defaultValue);
  };

  /**
   * Retrieve configuration of a specific service.
   *
   * @param   {string}  name          service name.
   * @param   {object}  defaultValue  Optional. Configuration object to be used if none is found for the specific service.
   *
   * @returns {object}                Configuration object.
   */
  getServerConfiguration(name, defaultValue = null) {
    let ns = 'server.' + name;
    return _.get(config, ns, defaultValue);
  }

}

const _configuration = new Configuration();

export default _configuration;
