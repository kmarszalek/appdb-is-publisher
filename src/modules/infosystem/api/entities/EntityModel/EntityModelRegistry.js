import _ from 'lodash';

function _initEntityModelRegistry() {
  const _models = {};
  const ops = {};

  ops.register = (name, instance) => {
    _.set(_models, name, instance);
    return ops.get(name);
  };

  ops.get = (name) => {
    return _.get(_models, name, 'argghhh');
  };

  return ops;
}
const _registry = _initEntityModelRegistry();
export default _registry;