import _ from 'lodash';
import {query, TEMPLATE_COLLECTION_HEADER} from './restModel';
import gql from 'graphql-tag';
import {filterToGraphQL, resultHandlerByPath} from './utils';
import {TEMPLATE_SITE_SERVICE_ITEM_FIELDS, TEMPLATE_SITE_SERVICE_DETAILS_FIELDS} from './SiteService';
import {TEMPLATE_SITE_SERVICE_IMAGE_COLLECTION_FIELDS, TEMPLATE_SITE_SERVICE_IMAGE_DETAILS_FIELDS} from './SiteServiceImage';
import {TEMPLATE_SITE_SERVICE_TEMPLATE_COLLECTION_FIELDS, TEMPLATE_SITE_SERVICE_TEMPLATE_DETAILS_FIELDS} from './SiteServiceTemplate';
import SiteService from './SiteService';
import SiteServiceImage from './SiteServiceImage';
import SiteServiceTemplate from './SiteServiceTemplate';

export const TEMPLATE_SITE_ITEM_FIELDS = `
id
pkey
name
shortName
officialName
description
gocdbPortalUrl
homeUrl
giisUrl
countryCode
country
tier
subgrid
roc
prodInfrastructure
certStatus
timezone
latitude
longitude
domainName
`;

export const TEMPLATE_SITE_DETAILS_FIELDS = `
${TEMPLATE_SITE_ITEM_FIELDS}
services (skip: 0, limit: 100000) {
  totalCount
  items {
    id
    endpointPKey
  }
}`;


export const getCallerByIdentifier = (id, onlyQuery = false) => {
  if (id.indexOf('gocdb:') === 0) {
    id = id.replace('gocdb:', '');
    if (onlyQuery) {
      return `pkey: "${id}"`;
    } else {
      return `siteByGocDBPKey(id: "${id}")`;
    }

  } else if (id.indexOf('name:') === 0) {
    id = id.replace('name:', '');
    if (onlyQuery) {
      return `name: {eq: "${id}"}`;
    }else {
      return `siteByName(name: "${id}")`;
    }
  } else {
    if (onlyQuery) {
      return `id: {eq: "${id}"}`;
    }else {
      return `siteById(id: "${id}")`;
    }
  }
};

export const getByIdentifier = (id) => {
  let caller = getCallerByIdentifier(id);
  return query(gql`{
    data: ${caller} {
      ${TEMPLATE_SITE_DETAILS_FIELDS}
    }
  }`);
}

export const getAllSiteServices = (siteId, {filter = {}, limit = 0, skip = 0} = {filter:{}, limit: 0, skip: 0}) => {
  let siteCaller = getCallerByIdentifier(siteId);
  let flt = filterToGraphQL(filter);
  let servicesQuery = `
    services(filter: ${flt}, limit: ${limit}, skip: ${skip}) {
      ${TEMPLATE_COLLECTION_HEADER}
      items {
        ${TEMPLATE_SITE_SERVICE_ITEM_FIELDS}
      }
    }`;
  return query(gql`{
    data: ${siteCaller} {
      id
      ${servicesQuery}
    }
  }`).then(doc => {
    return Promise.resolve(_.get(doc, 'data.services', doc));
  });
};

export const getSiteService = (siteId, serviceId) => {
  let siteCaller = getCallerByIdentifier(siteId);
  let serviceFlt = SiteService.getCallerByIdentifier(serviceId, true);
  let servicesQuery = `
  services(filter: {${serviceFlt}}, limit: 1, skip: 0) {
    ${TEMPLATE_COLLECTION_HEADER}
    items {
      ${TEMPLATE_SITE_SERVICE_DETAILS_FIELDS}
    }
  }`;
  return query(gql`{
    data: ${siteCaller} {
      id
      ${servicesQuery}
    }
  }`).then(resultHandlerByPath('data.services.items.0'));
};

export const getSiteServiceImage= (siteId, serviceId, imageId) => {
  let siteCaller = getCallerByIdentifier(siteId);
  let serviceFlt = SiteService.getCallerByIdentifier(serviceId, true);
  let imagesFlt = SiteServiceImage.getCallerByIdentifier(imageId, true);
  let imagesQuery = `images(filter: {${imagesFlt}}, limit: 1, skip: 0) {
    items {
      ${TEMPLATE_SITE_SERVICE_IMAGE_DETAILS_FIELDS}
    }
  }`;
  let servicesQuery = `
  services(filter: {${serviceFlt}}, limit: 1, skip: 0) {
    items {
      id
      ${imagesQuery}
    }
  }`;

  return query(gql`{
    data: ${siteCaller} {
      id
      ${servicesQuery}
    }
  }`).then(resultHandlerByPath('data.services.items.0.images.items.0'));
};

export const getAllSiteServiceImages = (siteId, serviceId, {filter = {}, limit = 0, skip = 0} = {filter:{}, limit: 0, skip: 0}) => {
  let siteCaller = getCallerByIdentifier(siteId);
  let serviceFlt = SiteService.getCallerByIdentifier(serviceId, true);
  let imagesFlt = filterToGraphQL(filter);
  let imagesQuery = `images(filter: ${imagesFlt}, limit: ${limit}, skip: ${skip}) {
    ${TEMPLATE_COLLECTION_HEADER}
    items {
      ${TEMPLATE_SITE_SERVICE_IMAGE_COLLECTION_FIELDS}
    }
  }`;
  let servicesQuery = `services(filter: {${serviceFlt}}, limit: 1, skip: 0) {
    ${TEMPLATE_COLLECTION_HEADER}
    items {
      id
      ${imagesQuery}
    }
  }`;

  return query(gql`{
    data: ${siteCaller} {
      id
      ${servicesQuery}
    }
  }`).then(resultHandlerByPath('data.services.items.0.images'));
};

export const getSiteServiceTemplate = (siteId, serviceId, templateId) => {
  let siteCaller = getCallerByIdentifier(siteId);
  let serviceFlt = SiteService.getCallerByIdentifier(serviceId, true);
  let templatesFlt = SiteServiceTemplate.getCallerByIdentifier(templateId, true);
  let templatesQuery = `templates(filter: {${templatesFlt}}, limit: 1, skip: 0) {
    items {
      ${TEMPLATE_SITE_SERVICE_TEMPLATE_DETAILS_FIELDS}
    }
  }`;
  let servicesQuery = `
  services(filter: {${serviceFlt}}, limit: 1, skip: 0) {
    items {
      id
      ${templatesQuery}
    }
  }`;
  return query(gql`{
    data: ${siteCaller} {
      id
      ${servicesQuery}
    }
  }`).then(resultHandlerByPath('data.services.items.0.templates.items.0'));
};

export const getAllSiteServiceTemplates = (siteId, serviceId, {filter = {}, limit = 0, skip = 0} = {filter:{}, limit: 0, skip: 0}) => {
  let siteCaller = getCallerByIdentifier(siteId);
  let serviceFlt = SiteService.getCallerByIdentifier(serviceId, true);
  let templatesFlt = filterToGraphQL(filter);
  let templatesQuery = `templates(filter: ${templatesFlt}, limit: ${limit}, skip: ${skip}) {
    ${TEMPLATE_COLLECTION_HEADER}
    items {
      ${TEMPLATE_SITE_SERVICE_TEMPLATE_COLLECTION_FIELDS}
    }
  }`;
  let servicesQuery = `services(filter: {${serviceFlt}}, limit: 1, skip: 0) {
    ${TEMPLATE_COLLECTION_HEADER}
    items {
      id
      ${templatesQuery}
    }
  }`;

  return query(gql`{
    data: ${siteCaller} {
      id
      ${servicesQuery}
    }
  }`).then(resultHandlerByPath('data.services.items.0.templates'));
};

export const getAll = ({filter = {}, limit = 0, skip = 0} = {filter:{}, limit: 0, skip: 0}) => {
  let flt = JSON.stringify(filter);
  return query(gql`
    {
      data: sites(filter: ${flt}, limit: ${limit}, skip: ${skip}) {
        totalCount
        count
        limit
        skip
        items {
          ${TEMPLATE_SITE_ITEM_FIELDS}
        }
      }
    }
  `);
}

export default {
  getAll,
  getAllSiteServiceTemplates,
  getAllSiteServiceImages,
  getAllSiteServices,
  getSiteServiceTemplate,
  getSiteServiceImage,
  getSiteService,
  getByIdentifier
}