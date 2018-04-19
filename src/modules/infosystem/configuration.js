import configuration from './../../lib/isql/Configuration';
import Logger from './../../lib/isql/Logger';
import _ from 'lodash';

const _logger = Logger();

/**
 * Retrieve Information System configuration values.
 *
 * If no arguments are gievn it returns the whole module configuration object.
 *
 * @param   {string}  path          The key or path to retirieve a configuration value.
 * @param   {*}       defaultValue  Optional. Used when configuration path does not exist.
 *
 * @returns {*}                     A configuration value.
 */
const _get = (path = null, defaultValue = null) => {
  let mod = configuration.getModuleConfiguration('infosystem', {});

  if (path !== null) {
    return _.get(mod, path, defaultValue);
  }

  return mod;
};

/**
 * Returns a logger for the information system or a sub module of it.
 *
 * @param   {string} submodule  Sub module name.
 * @returns {object}            Logger object.
 */
const _getLogger = (submodule = null) => {
  if (_.trim(submodule) && _logger.isRegistered('infosystem/' + submodule) === false) {
    return _logger.register('infosystem/' + submodule, _get(submodule + '.logger' || {}));
  }
  return _logger.get('infosystem/' + submodule);
};

export default {
  get: _get,
  getLogger: _getLogger
};