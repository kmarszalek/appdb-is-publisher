import LoggingSystem from './lib/isql/Logger';
import InformationSystem from './modules/infosystem';
import HttpServer from './server';

/**
 * Initialize sub modules/services and
 * starts ISPublisher application.
 *
 */
async function _initApplication() {
  try {
    //Initalize logging system
    let logger = LoggingSystem();
    //Initialize information system module
    let infoSystem = await InformationSystem();
    //Initialize HTTP server. Passing ispublisher sub services.
    let server = await HttpServer({
      getLogger: infoSystem.getLogger,
      graphQLSchema: infoSystem.getGraphQL(),
      getApi: infoSystem.getApi
    });

    console.log('Started');
  } catch(e) {
    console.log(e);
    process.exit(1);
  }
}

export default _initApplication;