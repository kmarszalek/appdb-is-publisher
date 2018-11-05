var Promise = require('bluebird');
var glob = Promise.promisify(require('glob'));
var readFile = Promise.promisify(require('fs').readFile);

/**
 * Loads the file of the given path as a text file.
 *
 * @param   {string}  file  The file path to load.
 * @returns {Promise}       Resolves with the contents (string) of the file.
 */
function _fileLoader(file) {
  return readFile(file, 'utf-8');
}

/**
 * Loads the file of the given path as a nodejs module. Used for javascript mime types.
 *
 * @param   {string}  file  The file path to load.
 * @returns {Promise}       Resolves the exported value of the module.
 */
function _moduleLoader(file) {
  try {
    return Promise.resolve(require(file).default);
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * Returns the appropriate file loader for the given mime type.
 *
 * @param   {string}    format  The mime type.
 * @returns {function}          The loader function.
 */
function _loaderFor(format = 'text/plain') {
  switch(format) {
    case 'javascript':
    case 'nodejs':
    case 'module':
    case 'text/javascript':
    case 'application/javascript':
      return _moduleLoader;
    default:
      return _fileLoader;
  }
}

/**
 * Parses given data as JSON.
 *
 * @param   {string} data The data to parse.
 * @returns {object}      An object representation of JSON.
 */
function _parseJSON(data) {
  return JSON.parse(data || '{}');
}

/**
 * Dummy parser. Just returns the given data.
 *
 * @param   {string} data The data to parse.
 * @returns {string}      The given data.
 */
function _parseNone(data) {
  return data || '';
}

/**
 * Returns the appropriate parser for the given mime type.
 *
 * @param   {string}    format  The mime type.
 * @returns {function}          The parser function.
 */
function _parserFor(format) {
  switch(format) {
    case 'application/json':
    case 'text/json':
    case 'json':
      return _parseJSON;
    default:
      return _parseNone;
  }
}

/**
 * Load and parse files in the given directory.
 *
 * @param {string}    fsPath  The directory path.
 * @param {string}    format  The mime type of the file.
 *
 * @returns {Promise}         Resolves an array of parsed data (objects).
 */
function getDirectoryFiles(fsPath, format = 'text/plain') {
  let loader = _loaderFor(format);
  let parser = _parserFor(format);

  return glob(fsPath).then(files => {
    var prs = files.map(file => {
      return loader(file)
        .then(parser)
        .catch(err => {
          return Promise.reject(err);
        });
    });
    return Promise.all(prs);
  });
}

module.exports = {
  getDirectoryFiles: getDirectoryFiles
};
