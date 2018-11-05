import {resolveAs} from '../utils';

const SiteServiceImageResolver = {
  Query: {
    siteServiceImageById: (root, args, context, info) => context.api('siteServiceImage').getById(args.id, context),
    siteServiceImages: resolveAs.collectionWith('siteServiceImage#getAll')
  },
  SiteServiceImage: {
    site: resolveAs.itemWith('siteService#getSite'),
    service: resolveAs.itemWith('siteServiceImage#getSiteService'),
    templates: resolveAs.collectionWith('siteServiceImage#getSiteServiceTemplates')
  }
};

export default SiteServiceImageResolver;