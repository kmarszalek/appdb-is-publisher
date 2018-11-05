import winston from 'winston';
import _ from 'lodash';
import path from 'path';

const _logLevels = ['error', 'warn', 'info', 'verbose', 'debug', 'silly'];

const _catchAllLogger = winston.createLogger({
  levels: winston.config.npm,
  transports: [
    new winston.transports.Console()
  ],
  exitOnError: false
});

const _registry = {
  _default: _catchAllLogger
};

const _ensurePath = (filePath = __dirname) => {
  if (path.extname(filePath)) {
    filePath = path.dirname(filePath);
  }
};

const _createLogger = (name, conf = { error: null, warn: null, info: null, verbose: null, debug: null, silly: null }) => {
  let loggerTransports =_logLevels.reduce((acc, level) => {
    let logFile = conf[level];
    if (logFile && _.isString(logFile) && _.trim(logFile) ) {
      _ensurePath(logFile);
      acc.push( new winston.transports.File( { name: 'file_ ' + name + '_' + level, filename: logFile, level: level } ) );
    } else {
      acc.push( new winston.transports.Console( {name: 'console_ ' + name + '_' + level, level: level } ) );
    }
    return acc;
  }, []);

  return winston.createLogger({
    levels: winston.config.npm,
    transports: loggerTransports,
    exitOnError: false
  });
};

const _registerLogger = (name, conf = {}) => {
  _registry[name] = _createLogger(name, conf);
  return _getRegisteredLogger(name);
};

const _hasRegisteredLogger = (name) => {
  return (_.has(_registry, name) && _registry[name]);
}

const _getRegisteredLogger = (name) => {
  if (_.trim(name)) {
    return _.get(_registry, name, _catchAllLogger);
  }
  return _catchAllLogger;
};

export default function() {
  return {
    register: _registerLogger,
    isRegistered: _hasRegisteredLogger,
    get: _getRegisteredLogger
  };
};
