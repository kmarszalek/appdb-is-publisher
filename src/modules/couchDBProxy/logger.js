import winston from 'winston';
import mkdirp from 'mkdirp';
let _logger = null;

export const createLogger = (config) => {
  if (!_logger) {
    mkdirp.sync(config.logpath);
    _logger = new (winston.Logger)({
      transports: [
        new winston.transports.File({ filename: config.logpath + '/debug.log', json: false })
      ],
      exceptionHandlers: [
        new (winston.transports.Console)({ json: true, timestamp: true }),
        new winston.transports.File({ filename: config.logpath + '/exceptions.log', json: false })
      ],
      exitOnError: false
    });
  }

  return _logger;
};

export default createLogger;
