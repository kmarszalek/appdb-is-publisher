import Site from './Site';
import SiteService from './SiteService';
import SiteServiceImage from './SiteServiceImage';
import SiteServiceTemplate from './SiteServiceTemplate';
import SiteServiceStatus from './SiteServiceStatus';
import _ from 'lodash';

const DEFAULT_LIMIT = 20;

const RequestMetaData = ({entityType = null, dataType = 'item', links = {}} = {entityType: null, dataType: 'item'}) => {
  return (req, res, next) => {
    req.requestMetaData = Object.assign({}, {entityType, dataType});

    next();
  };
};

const CollectionMetaData = ({entityType, links}) => RequestMetaData({entityType, dataType: 'collection'});
const ItemMetaData = ({entityType}) => RequestMetaData({entityType, dataType: 'item'});

const applyMetaData = (doc, req, ext) => {
  ext = _.isPlainObject(ext) ? ext : {};
  req.requestMetaData = req.requestMetaData || {};
  doc = {...req.requestMetaData, ...ext, ...doc};
  return doc;
};

const _handleMissing = (req, res) => {console.log(';HANDLING MISSING!!!!!1');
  res.setHeader('Content-Type', 'application/json');
  res.status(404);
  let doc = {
    httpStatus: 404,
    error: {
      type: 'NOT_FOUND',
      message: 'Not found',
      details: 'The requested resource does not exist.'
    }
  };
  res.json(doc);
  res.end();
};

export const handleUnknown = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(400);
  let doc = {
    httpStatus: 400,
    error: {
      type: 'BAD_REQUEST',
      message: 'Bad request',
      details: 'Invalid request. Please check the URL for errors.'
    }
  };
  res.json(doc);
  res.end();
};

export const handleNoImlementation = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(501);
  let doc = {
    httpStatus: 501,
    error: {
      type: "NOT_IMPLEMENTED",
      message: 'Not implemented',
      details: 'The requested facility is not implemented yet.'
    }
  };
  res.json(doc);
  res.end();
};

const getInvalidFilterFromError = (errorMessage) => {
  let match = /^Argument\s+\"filter\" has invalid value (\{.*\})\./i.exec(errorMessage);
  return (match) ? match[1] : null;
};

const getGraphqlErrors = (e) => {
  let responseErrors = _.get(e, 'response.errors', []);
  return _.map(responseErrors, r => r.message).filter(e => !!e).map(s => s.replace(/\n/g, ' ')).join('\n');
};

const handleInvalidFilterError = (req, res, e) => {
  let errorMessage = (_.isString(e) ? e : e.message ) || '';
  let invalidFilter = /setting\s+.+\s+filter\s+property\s+as\s+\w+\s+value\s+with\s+invalid\s+operator/i.exec(errorMessage);
  if (!invalidFilter) {
    return false;
  }
  res.status(400);
  res.json({
    ...req.requestMetaData,
    httpStatus: 400,
    error: {
      type: "INVALID_FILTER_OPERATOR",
      message: 'Use of unsupported filtering operator in the provided filter.',
      details: e.message
    }
  });

  return true;
};

const handleUnknownFilter = (req, res, e) => {
  let errorMessage = (_.isString(e) ? e : e.message ) || '';
  let invalidFilter = /Cannot\s+parse\s+all\s+of\s+the\s+filter\s+string\.\s+Unknown\s+filter/i.exec(errorMessage);
  if (!invalidFilter) {
    return false;
  }
  res.status(400);
  res.json({
    ...req.requestMetaData,
    httpStatus: 400,
    error: {
      type: "UNKNOWN_FILTER",
      message: 'Use of unsupported filtering semantics.',
      details: e.message
    }
  });

  return true;
}
const handleInvalidGraphQLFilterError = (req, res, e) => {
  let errorMessage = (_.isString(e) ? e : e.message ) || '';
  let invalidFilter = getInvalidFilterFromError(errorMessage);
  if (!invalidFilter) {
    return false;
  }

  res.status(400);
  res.json({
    ...req.requestMetaData,
    httpStatus: 400,
    error: {
      type: "INVALID_FILTER",
      message: "The provided filter is invalid for this entity type (" + invalidFilter + ").",
      details: getGraphqlErrors(e)
    }
  });

  return true;
};

const handleGenericGraphQLError = (req, res, e) => {
  let isGraphQLError = (_.has(e, 'message') && _.has(e, 'stack') && _.has(e, 'response.errors') && _.has(e, 'request'));
  if (!isGraphQLError) {
    return false;
  }

  res.status(400);
  res.json({
    ...req.requestMetaData,
    httpStatus: 400,
    error: {
      type: "INVALID_REQUEST",
      message: "A backend service error occured while processing the request.",
      details: getGraphqlErrors(e)
    }
  });

  return true;
};

const _handleRequest = (pr, req, res) => {
  return pr.then(doc => {
    doc = applyMetaData(doc, req, {httpStatus: 200});
    if (doc.data === null) {
      return Promise.resolve(_handleMissing(req, res));
    }
    res.setHeader('Content-Type', 'application/json');
    res.json(doc);
    res.end();
  }).catch(e => {
    res.setHeader('Content-Type', 'application/json');
    if (
      !handleInvalidFilterError(req, res, e) &&
      !handleUnknownFilter(req, res, e) &&
      !handleInvalidGraphQLFilterError(req, res, e) &&
      !handleGenericGraphQLError(req, res, e)
    ) {
      res.status(500);
      res.json({...req.requestMetaData, httpStatus: 500, error: e});
    }
    res.end();
  });
}

const getCollectionRequestParams = (req) => {
  return {
    filter: _.trim(req.query.filter) || {},
    limit: parseInt(req.query.limit) || DEFAULT_LIMIT,
    skip: parseInt(req.query.skip) || 0
  };
}

export const expressRouter = function (router, config) {
  //############################################
  //################## SITES ###################
  //############################################

  router.get('/sites/:siteId/services/:serviceId/images/:imageId',[
    ItemMetaData({entityType: 'SiteServiceImage'})
  ], (req, res) => {
    let siteId = _.trim(req.params.siteId);
    let serviceId = _.trim(req.params.serviceId);
    let imageId = _.trim(req.params.imageId);

    _handleRequest(Site.getSiteServiceImage(siteId, serviceId, imageId), req, res);
  });

  router.get('/sites/:siteId/services/:serviceId/images', [CollectionMetaData({entityType: 'SiteServiceImage'})], (req, res) => {
    let siteId = _.trim(req.params.siteId);
    let serviceId = _.trim(req.params.serviceId);
    let params = getCollectionRequestParams(req);

    _handleRequest(Site.getAllSiteServiceImages(siteId, serviceId, params), req, res);
  });

  router.get('/sites/:siteId/services/:serviceId/templates/:templateId', [ItemMetaData({entityType: 'SiteServiceTemplate'})], (req, res) => {
    let siteId = _.trim(req.params.siteId);
    let serviceId = _.trim(req.params.serviceId);
    let templateId = _.trim(req.params.templateId);

    _handleRequest(Site.getSiteServiceTemplate(siteId, serviceId, templateId), req, res);
  });

  router.get('/sites/:siteId/services/:serviceId/templates', [CollectionMetaData({entityType: 'SiteServiceTemplate'})], (req, res) => {
    let siteId = _.trim(req.params.siteId);
    let serviceId = _.trim(req.params.serviceId);
    let params = getCollectionRequestParams(req);

    _handleRequest(Site.getAllSiteServiceTemplates(siteId, serviceId, params), req, res);
  });

  router.get('/sites/:siteId/services/:serviceId', [ItemMetaData({entityType: 'SiteService'})], (req, res) => {
    let siteId = _.trim(req.params.siteId);
    let serviceId = _.trim(req.params.serviceId);

    _handleRequest(Site.getSiteService(siteId, serviceId), req, res);
  });

  router.get('/sites/:siteId/services', [CollectionMetaData({entityType: 'SiteService'})], (req, res) => {
    let params = getCollectionRequestParams(req);
    let siteId = _.trim(req.params.siteId);

    _handleRequest(Site.getAllSiteServices(siteId, params), req, res);
  });

  router.get('/sites/:siteId', [ItemMetaData({entityType: 'Site'})], (req, res) => {
    let siteId = _.trim(req.params.siteId );

    _handleRequest(Site.getByIdentifier(siteId), req, res);
  });

  router.get('/sites', [CollectionMetaData({entityType: 'Site'})], (req, res) => {
    let params = getCollectionRequestParams(req);

    _handleRequest(Site.getAll(params), req, res);
  });

  //#############################################
  //############### SITE SERVICES ###############
  //#############################################

  router.get('/services/:serviceId/templates/:templateId', [ItemMetaData({entityType: 'SiteServiceTemplate'})], (req, res) => {
    let serviceId = _.trim(req.params.serviceId );
    let templateId = _.trim(req.params.templateId );

    _handleRequest(SiteService.getTemplate(serviceId, templateId), req, res);
  });

  router.get('/services/:serviceId/templates', [CollectionMetaData({entityType: 'SiteServiceTemplate'})], (req, res) => {
    let serviceId = _.trim(req.params.serviceId );
    let params = getCollectionRequestParams(req);

    _handleRequest(SiteService.getAllTemplates(serviceId, params), req, res);
  });

  router.get('/services/:serviceId/images/:imageId', [ItemMetaData({entityType: 'SiteServiceImage'})], (req, res) => {
    let serviceId = _.trim(req.params.serviceId );
    let imageId = _.trim(req.params.imageId );

    _handleRequest(SiteService.getImage(serviceId, imageId), req, res);
  });

  router.get('/services/:serviceId/images', [CollectionMetaData({entityType: 'SiteServiceImage'})], (req, res) => {
    let serviceId = _.trim(req.params.serviceId );
    let params = getCollectionRequestParams(req);

    _handleRequest(SiteService.getAllImages(serviceId, params), req, res);
  });

  router.get('/services/:serviceId/site', [ItemMetaData({entityType: 'Site'})], (req, res) => {
    let serviceId = _.trim(req.params.serviceId );

    _handleRequest(SiteService.getSite(serviceId), req, res);
  });

  router.get('/services/:serviceId', [ItemMetaData({entityType: 'SiteService'})], (req, res) => {
    let serviceId = _.trim(req.params.serviceId );

    _handleRequest(SiteService.getByIdentifier(serviceId), req, res);
  });

  router.get('/services', [CollectionMetaData({entityType: 'SiteService'})], (req, res) => {
    let params = getCollectionRequestParams(req);

    _handleRequest(SiteService.getAll(params), req, res);
  });

  //###########################################
  //################ TEMPLATES ################
  //###########################################

  router.get('/templates/:templateId/images/:imageId', [ItemMetaData({entityType: 'SiteServiceImage'})], (req, res) => {
    let templateId = _.trim(req.params.templateId );
    let imageId = _.trim(req.params.imageId );

    _handleRequest(SiteServiceTemplate.getSiteServiceImage(templateId, imageId), req, res);
  });
  router.get('/templates/:templateId/images', [CollectionMetaData({entityType: 'SiteServiceImage'})], (req, res) => {
    let templateId = _.trim(req.params.templateId );
    let params = getCollectionRequestParams(req);

    _handleRequest(SiteServiceTemplate.getAllSiteServiceImages(templateId, params), req, res);
  });

  router.get('/templates/:templateId/service', [ItemMetaData({entityType: 'SiteService'})], (req, res) => {
    let templateId = _.trim(req.params.templateId );

    _handleRequest(SiteServiceTemplate.getSiteService(templateId), req, res);
  });

  router.get('/templates/:templateId/site', [ItemMetaData({entityType: 'Site'})], (req, res) => {
    let templateId = _.trim(req.params.templateId );

    _handleRequest(SiteServiceTemplate.getSite(templateId), req, res);
  });

  router.get('/templates/:templateId', [ItemMetaData({entityType: 'SiteServiceTemplate'})], (req, res) => {
    let templateId = _.trim(req.params.templateId );

    _handleRequest(SiteServiceTemplate.getByIdentifier(templateId), req, res);
  });

  router.get('/templates', [CollectionMetaData({entityType: 'SiteServiceTemplate'})], (req, res) => {
    let params = getCollectionRequestParams(req);

    _handleRequest(SiteServiceTemplate.getAll(params), req, res);
  });

  //###########################################
  //################## IMAGES #################
  //###########################################

  router.get('/images/:imageId/templates/:templateId', [ItemMetaData({entityType: 'SiteServiceTemplate'})], (req, res) => {
    let imageId = _.trim(req.params.imageId );
    let templateId = _.trim(req.params.templateId);

    _handleRequest(SiteServiceImage.getSiteServiceTemplate(imageId, templateId), req, res);
  });

  router.get('/images/:imageId/templates', [CollectionMetaData({entityType: 'SiteServiceTemplate'})], (req, res) => {
    let imageId = _.trim(req.params.imageId );
    let params = getCollectionRequestParams(req);

    _handleRequest(SiteServiceImage.getAllSiteServiceTemplates(imageId, params), req, res);
  });

  router.get('/images/:imageId/service', [ItemMetaData({entityType: 'SiteService'})], (req, res) => {
    let imageId = _.trim(req.params.imageId );

    _handleRequest(SiteServiceImage.getSiteService(imageId), req, res);
  });

  router.get('/images/:imageId/site', [ItemMetaData({entityType: 'Site'})], (req, res) => {
    let imageId = _.trim(req.params.imageId );

    _handleRequest(SiteServiceImage.getSite(imageId), req, res);
  });

  router.get('/images/:imageId', [ItemMetaData({entityType: 'SiteServiceImage'})], (req, res) => {
    let imageId = _.trim(req.params.imageId );

    _handleRequest(SiteServiceImage.getByIdentifier(imageId), req, res);
  });

  router.get('/images', [CollectionMetaData({entityType: 'SiteServiceImage'})], (req, res) => {
    let params = getCollectionRequestParams(req);

    _handleRequest(SiteServiceImage.getAll(params), req, res);
  });

  router.get('/statuses/:statusId/service', [CollectionMetaData({entityType: 'SiteServiceStatus'})], (req, res) => {
    let statusId = _.trim(req.params.statusId);

    _handleRequest(SiteServiceStatus.getSiteService(statusId), req, res);
  });

  router.get('/statuses/:statusId/site', [CollectionMetaData({entityType: 'SiteServiceStatus'})], (req, res) => {
    let statusId = _.trim(req.params.statusId);

    _handleRequest(SiteServiceStatus.getSite(statusId), req, res);
  });

  router.get('/statuses/:statusId', [CollectionMetaData({entityType: 'SiteServiceStatus'})], (req, res) => {
    let statusId = _.trim(req.params.statusId);

    _handleRequest(SiteServiceStatus.getByIdentifier(statusId), req, res);
  });

  router.get('/statuses', [CollectionMetaData({entityType: 'SiteServiceStatus'})], (req, res) => {
    let params = getCollectionRequestParams(req);

    _handleRequest(SiteServiceStatus.getAll(params), req, res);
  });


  router.get('/', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(501);
    res.json(serviceDescription);
    res.end();
  });

  console.log('[infosystem:Rest] Inited');
  return router;
};

export const serviceDescription = {
  '/rest': {
    description: 'Service to query the information system in a RESTful fashion',
    routes: {
      '/sites': {
        description: 'List of sites in the information system.Each site may contain one or more services. If the site has at least one cloud service, it may also contain VM images and cloud execution templates.'
      },
      '/sites/[<id> | name:<sitename> | gocdb:<pkey>]': {
        description: 'A site entry in the information system. Can be retrieved by the information system ID, the name of the site, or the pkey as provided by the gocdb portal API'
      },
      '/sites/[<id> | name:<sitename> | gocdb:<pkey>]/services': {
        description: 'List of services provided by the current site. Services may contain one or more VM image references and execution templates.'
      },
      '/sites/[<id> | name:<sitename> | gocdb:<pkey>]/services/[<id> | gocdb: <id>]': {
        description: 'A service entry in the information system. Can be retrieved by the information system ID, or the endpoint pkey as provided by the gocdb portal API'
      },
      '/sites/[<id> | name:<sitename> | gocdb:<pkey>]/services/[<id> | gocdb: <endpointpkey>]/images': {
        description: 'List of VM images provided by the current service.'
      },
      '/sites/[<id> | name:<sitename> | gocdb:<pkey>]/services/[<id> | gocdb: <endpointpkey>]/images/<id>': {
        description: 'A VM image entry in the information system. Can be retrieved by the information system ID.'
      },
      '/sites/[<id> | name:<sitename> | gocdb:<pkey>]/services/[<id> | gocdb: <endpointpkey>]/templates': {
        description: 'List of templates provided by the current service.'
      },
      '/sites/[<id> | name:<sitename> | gocdb:<pkey>]/services/[<id> | gocdb: <endpointpkey>]/templates/<id>': {
        description: 'A template entry in the ninformation system. Can be retrieved by the information system ID.'
      },
      '/services': {
        description: 'List of services in the information system. Services may contain one or more VM image references and execution templates.'
      },
      '/services/[<id> | gocdb:<endpointpkey>]': {
        description: 'A service entry in the information system.Can be retrieved by the information system ID, or the endpoint pkey as provided by the gocdb portal API'
      },
      '/services/[<id> | gocdb:<endpointpkey>]/site': {
        description: 'Retrieve the site entry theat the current service belongs to.'
      },
      '/services/[<id> | gocdb:<endpointpkey>]/images': {
        description: 'Retrieve a list of VM images the current sevice provides.'
      },
      '/services/[<id> | gocdb:<endpointpkey>]/images/<id>': {
        description: 'A VM image entry provided by the current service.'
      },
      '/services/[<id> | gocdb:<endpointpkey>]/templates': {
        description: 'Retrieve a list of templates the current service provides.'
      },
      '/services/[<id> | gocdb:<endpointpkey>]/templates/<id>': {
        description: 'A template entry provided by the current service.'
      },
      '/images': {
        description: 'List of VM image entries in the information system.'
      },
      '/images/<id>': {
        description: 'A VM image entry in the information system. Can be retieved with the information system ID.'
      },
      '/images/<id>/service': {
        description: 'The service entry in the information system the current VM image belongs to.'
      },
      '/images/<id>/site': {
        description: 'The site entry in the information system the current VM image belongs to.'
      },
      '/images/<id>/temlates': {
        description: 'List of templates in the information system that can be used with the current VM image belongs to.'
      },
      '/images/<id>/templates/<id>': {
        description: 'A template entry that can be used with the current VM image.'
      },
      '/templates': {
        description: 'List of templates in the information system.'
      },
      '/templates/<id>': {
        description: 'A template entry in the information system. Can be retrieved with the information system ID.'
      },
      '/templates/<id>/service': {
        description: 'The service entry that the current template belongs to.'
      },
      '/templates/<id>/site': {
        description: 'The site entry that the current template belongs to.'
      },
      '/templates/<id>/images': {
        description: 'List of VM images that can use the current template.'
      },
      '/templates/<id>/images/<id>': {
        description: 'A VM image entry that can use the current template.'
      }
    }
  }
};