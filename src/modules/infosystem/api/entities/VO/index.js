import initModel from './model';
import {getArgsWithBaseFilter} from '../utils';
import _ from 'lodash';

const relationFilterRoot = (root, args, context) => {
  if (_.has(root, 'services.endpointPKey')) {
    addFilter = _.set(addFilter, 'service.endpointPKey.eq', _.get(root, 'services.endpointPKey'));
  }
  if (_.has(root, 'sites.pkey')) {
    addFilter = _.set(addFilter, 'site.pkey.eq', _.get(root, 'sites.pkey'));
  }
  if (_.has(root, 'sites.name')) {
    addFilter = _.set(addFilter, 'site.name.eq', _.get(root, 'sites.name'));
  }

  return addFilter;
}

const relationalFilter = (root, args, context, parentType) => {
  let addFilter = {};
  if (!parentType) {

  } else {
    switch(parentType) {
      case 'Site':
        if (_.has(root, 'pkey')) {
          addFilter = _.set(addFilter, 'sites.pkey.eq', _.get(root, 'pkey'));
        }
        if (_.has(root, 'name')) {
          addFilter = _.set(addFilter, 'sites.name.eq', _.get(root, 'name'));
        }
        break;
      case 'SiteService':
        if (_.has(root, 'endpointPKey')) {
          addFilter = _.set(addFilter, 'services.endpointPKey.eq', _.get(root, 'endpointPKey'));
        }
        break;
      case 'SiteServiceImage':
      default:
        addFilter = relationFilterRoot(root, args, context);
        break;
    }
  }

  return _.merge(args.filter || {}, addFilter);
};

const getOneVO = (collection) => {
  return _.first(uniqVOs(collection).items) || null;
};

const uniqVOs = ({limit = 0, skip = 0} = {limit: 0, skip: 0}) => (collection) => {
  collection.items = _.chain(collection.items)
    .map(item => item.name)
    .filter(name => !!name)
    .uniq().value();

  collection.limit = limit;
  collection.skip = skip;
  collection.totalCount = collection.items.length;

  collection.items = _.chain(collection.items)
    .sort()
    .slice(collection.skip || 0)
    .take(collection.limit || collection.items.length)
    .map(item => ({name: item})).value();

  return collection;
};


function _initVO(context) {
  const _VOModel = initModel(context);

  const VO = {};

  VO.getByName = (name, context) => _VOModel.findMany({
    filter: {name: {eq: name}},
    fields: ['name']
  }, context).then(collection => _.first(collection.items) || null);

  VO.getRelatedVOs = ({root, args, context}) => _VOModel.findMany({
    filter: relationalFilter(root, args, context),
    fields: ['name']
  }, context).then(uniqVOs(args));

  VO.getAll = ({root, args, context}) => {

    return _VOModel.findMany(Object.assign(args || {} ,{
      filter: Object.assign({name: {ne: null}}, _.get(args, 'filter', {name: {ne: null}})),
      fields: ['name']
    }), context);//.then(uniqVOs(args));
  };

  VO.getSitesForVOName = ({root, args, context}) => context.api('site').getAll({
    root,
    args: getArgsWithBaseFilter({images: {imageVoVmiInstanceVO: {eq: _.get(root, 'name')}}}, args),
    context
  });

  VO.getSiteServicesForVOName = ({root, args, context}) => context.api('siteService').getAll({
    root,
    args: getArgsWithBaseFilter({images: {imageVoVmiInstanceVO: {eq: _.get(root, 'name')}}}, args),
    context
  });

  VO.getSiteServiceImagesForVOName = ({root, args, context}) => context.api('siteServiceImage').getAll({
    root,
    args: getArgsWithBaseFilter({imageVoVmiInstanceVO: {eq: _.get(root, 'name')}}, args),
    context
  });

  VO.getRelatedVOs = ({root, args, context}) => _VOModel.findMany({
    filter: relationalFilter(root, args, context),
    fields: ['name']
  }, context);//.then(uniqVOs(args));

  VO.getSiteRelatedVOs = ({root, args, context}) => _VOModel.findMany(Object.assign(args || {}, {
    filter: relationalFilter(root, args, context, 'Site'),
    fields: ['name']
  }), context);//.then(uniqVOs(args));

  VO.getSiteServiceRelatedVOs = ({root, args, context}) => _VOModel.findMany({
    filter: relationalFilter(root, args, context, 'SiteService'),
    fields: ['name']
  }, context);//.then(uniqVOs(args));

  VO.getSiteServiceImageRelatedVOs = ({root, args, context}) => _VOModel.findMany({
    filter: relationalFilter(root, args, context, 'SiteServiceImage'),
    fields: ['name']
  }, context);//.then(uniqVOs(args));

  VO.getModel = () => {
    return _VOModel;
  };

  return VO;
}

export default _initVO;