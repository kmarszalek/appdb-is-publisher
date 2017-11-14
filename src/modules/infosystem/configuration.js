import configuration from './../../lib/isql/Configuration';
import Logger from './../../lib/isql/Logger';
import _ from 'lodash';

const _logger = Logger();
const _get = (path = null, defaultValue = null) => {
  let mod = configuration.getModuleConfiguration('infosystem', {});

  if (path !== null) {
    return _.get(mod, path, null);
  }

  return mod;
};

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