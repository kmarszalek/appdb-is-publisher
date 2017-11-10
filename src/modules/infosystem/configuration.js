import configuration from './../../lib/isql/Configuration';
import _ from 'lodash';

export default {
    get: function(path = null, defaultValue = null) {
      let mod = configuration.getModuleConfiguration('infosystem', {});

      if (path !== null) {
        return _.get(mod, path, null);
      }

      return mod;
    }
}