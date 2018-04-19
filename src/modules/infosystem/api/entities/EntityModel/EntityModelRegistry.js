import _ from 'lodash';

/**
 * Initialized registry for entity models.
 *
 * NOTE: Meant to be used by the ExecutionEngine.
 */
function _initEntityModelRegistry() {
  const _models = {};
  const ops = {};

  /**
   * Registers a model instance with the given name.
   *
   * @param {string}    name      Model name.
   * @param {object}    instance  Model instance.
   * @returns {object}            Registered model instance.
   */
  ops.register = (name, instance) => {
    _.set(_models, name, instance);
    return ops.get(name);
  };

  /**
   * Retrieves model instance with given name.
   *
   * @param   {string} name Model name.
   * @returns {object}      Model instance.
   */
  ops.get = (name) => {
    return _.get(_models, name, 'argghhh');
  };

  return ops;
}

//Auto initialize registry. To be used as singleton.
const _registry = _initEntityModelRegistry();

export default _registry;