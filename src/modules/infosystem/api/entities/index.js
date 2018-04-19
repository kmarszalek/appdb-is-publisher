import Site from './Site';
import SiteService from './SiteService';
import SiteServiceImage from './SiteServiceImage';
import SiteServiceTemplate from './SiteServiceTemplate';
import SiteServiceStatus from './SiteServiceStatus';
import SiteServiceDowntime from './SiteServiceDowntime';
import SRVDowntime from './SRVDowntime';

/**
 * Initializes the entities supported by the information system.
 *
 * @param   {object} context  Information System API.
 *
 * @returns {object}          Information System Entities API.
 */
function _initEntities(context) {
  const _entities = {
    site: Site(context),
    siteService: SiteService(context),
    siteServiceImage: SiteServiceImage(context),
    siteServiceTemplate: SiteServiceTemplate(context),
    siteServiceStatus: SiteServiceStatus(context),
    siteServiceDowntime: SiteServiceDowntime(context),
    srvDowntime: SRVDowntime(context)
  };

  return {
    get: (name) => _entities[name]
  };
}

export default _initEntities;