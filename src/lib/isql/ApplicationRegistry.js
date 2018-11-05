import _ from 'lodash';

let ApplicationRegistry = {
  register(typeName, namespace, obj) {
    if (_.has(obj, typeName + '.' + namespace in obj)) {
      throw new Error('Module ' + namespace + ' already registered');
    }
    _conf[namespace] = obj;
  },
  get(name, defaultValue = null) {
    return (_.has(this._conf, name)) ? _conf[name] : null;
  },
  getModule(name, defaultValue = null) {
    return _.get(_conf, name);
  },
  getStorage(name) {

  },
  getSettings(name) {

  }
};

export default ApplicationRegistry;