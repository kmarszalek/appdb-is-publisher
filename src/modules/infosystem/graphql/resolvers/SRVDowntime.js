import {resolveAs, prepareCollectionResolverArgs, prepareItemResolverArgs} from '../utils';

const SRVDowntimeResolver = {
  Query: {
    SRVDowntimeById: (root, args, context, info) => context.api('srvDowntime').getById(args.id, context),
    SRVDowntimes: resolveAs.collectionWith('srvDowntime#getAll')
  },
  SRVDowntime: {
    site: resolveAs.itemWith('srvDowntime#getSite'),
    siteService: resolveAs.itemWith('srvDowntime#getSiteService')
  }
};

export default SRVDowntimeResolver;