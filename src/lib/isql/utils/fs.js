var Promise = require('bluebird');
var glob = Promise.promisify(require('glob'));
var readFile = Promise.promisify(require('fs').readFile);
var path = require('path');

function _fileLoader(file) {
  console.log('loading: ' , path.basename(file));
  return readFile(file, 'utf-8');
}

function _moduleLoader(file) {
  try {
    console.log('requiring: ' , path.basename(file));
    return Promise.resolve(require(file).default);
  } catch (e) {
    return Promise.reject(e);
  }
}

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

function _parseJSON(data) {
  return JSON.parse(data || '{}');
}

function _parseNone(data) {
  return data || '';
}

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