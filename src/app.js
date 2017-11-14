import LoggingSystem from './lib/isql/Logger';
import InformationSystem from './modules/infosystem';
import HttpServer from './server';

async function _initApplication() {
  try {
    let logger = LoggingSystem();
    let infoSystem = await InformationSystem();
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