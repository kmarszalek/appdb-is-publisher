import Entities from './entities';
import Storage from './storage';

async function _initApi(config) {
  let _api = (name) => _api.entities.get(name);
  _api.storage = await Storage.init(config.get('storage._default.options'));
  _api.get = (name) => _api.entities.get(name);
  _api.entities = await Entities(_api);

  return _api;
}

export default {
  init: _initApi
}