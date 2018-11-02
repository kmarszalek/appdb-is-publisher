import winston from 'winston';
import mkdirp from 'mkdirp';
let _logger = null;

/**
 * Creates a winston based logger for usage from couchDBProxy.
 *
 * @param   {object}  config  Configuration object, by default from config.js(modules.couchDBProxy).
 *
 * @returns {object}          A winston logger instance.
 */
export const createLogger = (config) => {
  if (!_logger) {
    mkdirp.sync(config.logpath);
    _logger = winston.createLogger({
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
