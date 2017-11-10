export default function mandatoryFunctionParameter(name, source) {
  let err =  new Error('Parameter ' + name + ' is mandatory');
  err.source = source || err.source || null;

  throw err;
}