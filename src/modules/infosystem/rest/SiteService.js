import _ from 'lodash';
import {query, TEMPLATE_COLLECTION_HEADER} from './restModel';
import {filterToGraphQL, resultHandlerByPath} from './utils';
import gql from 'graphql-tag';
import {TEMPLATE_SITE_ITEM_FIELDS, TEMPLATE_SITE_DETAILS_FIELDS} from './Site';
import {TEMPLATE_SITE_SERVICE_IMAGE_COLLECTION_FIELDS, TEMPLATE_SITE_SERVICE_IMAGE_DETAILS_FIELDS} from './SiteServiceImage';
import {TEMPLATE_SITE_SERVICE_TEMPLATE_COLLECTION_FIELDS, TEMPLATE_SITE_SERVICE_TEMPLATE_DETAILS_FIELDS} from './SiteServiceTemplate';
import Site from './Site';
import SiteServiceImage from './SiteServiceImage';
import SiteServiceTemplate from './SiteServiceTemplate';

export const TEMPLATE_SITE_SERVICE_ITEM_FIELDS = `
id
endpointPKey
isInProduction
beta
gocPortalUrl
endpointServiceType
endpointURL
endpointID
endpointInterfaceName
endpointInterfaceVersion
endpointTechnology
endpointQualityLevel
endpointCapabilities
endpointServingState
endpointHealthState
endpointImplementor
endpointImplementationVersion
location {
  id
  longitude,
  latitude
  country
  domainForeignKey
}
computingEndpointComputingServiceForeignKey
endpointServiceForeignKey
managerID
managerProductName
managerProductVersion
computingManagerTotalLogicalCPUs
computingManagerWorkingAreaTotal
entityOtherInfo`;

export const TEMPLATE_SITE_SERVICE_DETAILS_FIELDS =`
${TEMPLATE_SITE_SERVICE_ITEM_FIELDS}
images: imageList {
  ${TEMPLATE_SITE_SERVICE_IMAGE_COLLECTION_FIELDS}
}
templates: templateList {
  ${TEMPLATE_SITE_SERVICE_TEMPLATE_COLLECTION_FIELDS}
}
site {
  id
  pkey
  name
}
`;

export const TEMPLATE_SITE_SERVICE_COLLECTION_FIELDS = `
items {
  ${TEMPLATE_SITE_SERVICE_ITEM_FIELDS}
}
`;

export const getCallerByIdentifier = (id, onlyQuery = false) => {
  if (id.indexOf('gocdb:') === 0) {
    id = id.replace('gocdb:', '');
    if (onlyQuery) {
      return `endpointPKey: {eq: "${id}"}`;
    } else {
      return `siteServiceByGocDBPKey(id: "${id}")`;
    }

  }  else {
    if (onlyQuery) {
      return `id: {eq: "${id}"}`;
    }else {
      return `siteServiceById(id: "${id}")`;
    }
  }
};

export const getByIdentifier = (id) => {
  let caller = getCallerByIdentifier(id);
  return query(gql`{
    data: ${caller} {
      ${TEMPLATE_SITE_SERVICE_DETAILS_FIELDS}
    }
  }`);
};

export const getSite = (serviceId) => {
  let caller = getCallerByIdentifier(serviceId);
  return query(gql`{
    data: ${caller} {
      id
      site {
        ${TEMPLATE_SITE_DETAILS_FIELDS}
      }
    }
  }`).then(resultHandlerByPath('data.site'));
};

export const getAllImages = (serviceId, {filter = {}, limit = 0, skip = 0} = {filter:{}, limit: 0, skip: 0}) => {
  let caller = getCallerByIdentifier(serviceId);
  let imagesFlt = filterToGraphQL(filter);
  let imagesQuery = `
    images(filter: ${imagesFlt}, limit: ${limit}, skip: ${skip}) {
      ${TEMPLATE_COLLECTION_HEADER}
      items {
      ${TEMPLATE_SITE_SERVICE_IMAGE_COLLECTION_FIELDS}
      }
    }
  `;
  return query(gql`{
    data: ${caller} {
      id
      ${imagesQuery}
    }
  }`).then(resultHandlerByPath('data.images'));
};

export const getImage = (serviceId, imageId) => {
  let caller = getCallerByIdentifier(serviceId);
  let imageQuery = SiteServiceImage.getCallerByIdentifier(imageId, true);

  return query(gql`{
    data: ${caller} {
      id
      images(filter: {${imageQuery}}, limit: 1, skip: 0) {
        items {
          ${TEMPLATE_SITE_SERVICE_IMAGE_DETAILS_FIELDS}
        }
      }
    }
  }`).then(resultHandlerByPath('data.images.items.0'));
};

export const getAllTemplates = (serviceId, {filter = {}, limit = 0, skip = 0} = {filter:{}, limit: 0, skip: 0}) => {
  let caller = getCallerByIdentifier(serviceId);
  let templatesFlt = filterToGraphQL(filter);
  let templatesQuery = `
    templates(filter: ${templatesFlt}, limit: ${limit}, skip: ${skip}) {
      ${TEMPLATE_COLLECTION_HEADER}
      items {
      ${TEMPLATE_SITE_SERVICE_TEMPLATE_COLLECTION_FIELDS}
      }
    }
  `;
  return query(gql`{
    data: ${caller} {
      id
      ${templatesQuery}
    }
  }`).then(resultHandlerByPath('data.templates'));
};

export const getTemplate = (serviceId, templateId) => {
  let caller = getCallerByIdentifier(serviceId);
  let templateQuery = SiteServiceTemplate.getCallerByIdentifier(templateId, true);

  return query(gql`{
    data: ${caller} {
      id
      templates(filter: {${templateQuery}}, limit: 1, skip: 0) {
        items {
          ${TEMPLATE_SITE_SERVICE_TEMPLATE_DETAILS_FIELDS}
        }
      }
    }
  }`).then(resultHandlerByPath('data.templates.items.0'));
};

export const getAll = ({filter = {}, limit = 0, skip = 0} = {filter:{}, limit: 0, skip: 0}) => {
  let flt = filterToGraphQL(filter);

  return query(gql`
    {
      data: siteServices(filter: ${flt}, limit: ${limit}, skip: ${skip}) {
        ${TEMPLATE_COLLECTION_HEADER}
        ${TEMPLATE_SITE_SERVICE_COLLECTION_FIELDS}
      }
    }
  `);
};



export default {
  getAll,
  getCallerByIdentifier,
  getByIdentifier,
  getSite,
  getAllImages,
  getImage,
  getAllTemplates,
  getTemplate

}