import {resolveAs} from '../utils';

const VOResolver = {
  Query: {
    voByName: (root, args, context, info) => context.api('vo').getByName(args.name, context),
    vos: resolveAs.collectionWith('vo#getAll')
  },
  VO: {
    sites: resolveAs.collectionWith('vo#getSitesForVOName'),
    services: resolveAs.collectionWith('vo#getSiteServicesForVOName'),
    images: resolveAs.collectionWith('vo#getSiteServiceImagesForVOName')
  }
};

export default VOResolver;