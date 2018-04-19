/**
 * Function used as a default named parameter value.
 * If the function parameter is not set then this function will run and
 * throw an error.
 *
 * @param {string} name     The parameter name to be used in the error message.
 * @param {string} source   The source(code/location) that the error returns.
 */
export default function mandatoryFunctionParameter(name, source) {
  let err =  new Error('Parameter ' + name + ' is mandatory');
  err.source = source || err.source || null;

  throw err;
}