import Entities from './entities';
import Storage from './storage';

/**
 * Initialize the Imformation System API, along with the entities and storage sub modules.
 * The api is responsible for accessing the backend couchdb instance and appling rules and constraints.
 *
 * @param   {object}          config  Information System configuration helper.
 * @returns {object}                  Api object.
 */
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