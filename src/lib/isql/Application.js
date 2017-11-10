import Configuration from './Configuration';

class Application  {
  constructor(_config) {
    this._configuration = new Configuration(_config || {});
  }

  getConfiguration() {
    return this._configuration;
  }

  getRegistry() {

  }
}

export default Application;