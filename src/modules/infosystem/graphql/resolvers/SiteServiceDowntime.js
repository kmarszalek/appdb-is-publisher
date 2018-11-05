import {resolveAs} from '../utils';

const SiteServiceDowntimeResolver = {
  Query: {
    SiteServiceDowntimeById : (root, args, context, info) => context.api('siteServiceDowntime').getById(args.id, context),
    SiteServiceDowntimes    : resolveAs.collectionWith('siteServiceDowntime#getAll')
  },
  SiteServiceDowntime: {
    site        : resolveAs.itemWith('siteServiceDowntime#getSite'),
    service     : resolveAs.itemWith('siteServiceDowntime#getSiteService')
  }
};

export default SiteServiceDowntimeResolver;