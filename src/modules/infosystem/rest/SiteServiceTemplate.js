import _ from 'lodash';
import {query, TEMPLATE_COLLECTION_HEADER} from './restModel';
import {filterToGraphQL, asyncFilterToGraphQL, resultHandlerByPath} from './utils';
import {TEMPLATE_SITE_ITEM_FIELDS, TEMPLATE_SITE_DETAILS_FIELDS} from './Site';
import {TEMPLATE_SITE_SERVICE_COLLECTION_FIELDS, TEMPLATE_SITE_SERVICE_DETAILS_FIELDS} from './SiteService';
import {TEMPLATE_SITE_SERVICE_IMAGE_COLLECTION_FIELDS, TEMPLATE_SITE_SERVICE_IMAGE_DETAILS_FIELDS} from './SiteServiceImage';
import Site from './Site';
import SiteService from './SiteService';
import SiteServiceImage from './SiteServiceImage';

export const TEMPLATE_SITE_SERVICE_TEMPLATE_COLLECTION_FIELDS = `
id
entityName
resourceID
resourceManager
executionEnvironmentMainMemorySize
executionEnvironmentPhysicalCPUs
executionEnvironmentLogicalCPUs
executionEnvironmentCPUMultiplicity
executionEnvironmentOSFamily
executionEnvironmentConnectivityIn
executionEnvironmentConnectivityOut
executionEnvironmentCPUModel
executionEnvironmentDiskSize
executionEnvironmentPlatform
executionEnvironmentCPUVendor
executionEnvironmentVirtualMachine
executionEnvironmentComputingManagerForeignKey
resourceManagerForeignKey
entityOtherInfo
`;
export const TEMPLATE_SITE_SERVICE_TEMPLATE_DETAILS_FIELDS =`
id
entityName
resourceID
resourceManager
executionEnvironmentMainMemorySize
executionEnvironmentPhysicalCPUs
executionEnvironmentLogicalCPUs
executionEnvironmentCPUMultiplicity
executionEnvironmentOSFamily
executionEnvironmentConnectivityIn
executionEnvironmentConnectivityOut
executionEnvironmentCPUModel
executionEnvironmentDiskSize
executionEnvironmentPlatform
executionEnvironmentCPUVendor
executionEnvironmentVirtualMachine
executionEnvironmentComputingManagerForeignKey
resourceManagerForeignKey
entityOtherInfo
hash
site {
  id
  pkey
  name
}
service {
  id
  endpointPKey
  isInProduction
  endpointURL
}
`;

export const getCallerByIdentifier = (id, onlyQuery = false) => {
  if (onlyQuery) {
    return `id: {eq: "${id}"}`;
  }else {
    return `siteServiceTemplateById(id: "${id}")`;
  }
};

export const getSiteServiceImage = (templateId, imageId) => {
  let caller = getCallerByIdentifier(templateId);
  let imagesQuery = SiteServiceImage.getCallerByIdentifier(imageId, true);

  return query(`{
    data: ${caller} {
      id
      images(filter: {${imagesQuery}}, limit: 1, skip: 0) {
        items {
          ${TEMPLATE_SITE_SERVICE_IMAGE_DETAILS_FIELDS}
        }
      }
    }
  }`).then(resultHandlerByPath('data.images.items.0'));
};

export const getAllSiteServiceImages = (templateId, {filter = {}, limit = 0, skip = 0} = {filter:{}, limit: 0, skip: 0}) => {
  return asyncFilterToGraphQL(filter).then(imagesFlt => {
    let caller = getCallerByIdentifier(templateId);
    let imagesQuery = `
      images(filter: ${imagesFlt}, limit: ${limit}, skip: ${skip}) {
        ${TEMPLATE_COLLECTION_HEADER}
        items {
        ${TEMPLATE_SITE_SERVICE_IMAGE_COLLECTION_FIELDS}
        }
      }
    `;
    return query(`{
      data: ${caller} {
        id
        ${imagesQuery}
      }
    }`).then(resultHandlerByPath('data.images'));
  });
};

export const getSite = (templateId) => {
  let caller = getCallerByIdentifier(templateId);
  return query(`{
    data: ${caller} {
      id
      site {
        ${TEMPLATE_SITE_DETAILS_FIELDS}
      }
    }
  }`).then(resultHandlerByPath('data.site as data'));
};

export const getSiteService = (templateId) => {
  let caller = getCallerByIdentifier(templateId);
  return query(`{
    data: ${caller} {
      id
      service {
        ${TEMPLATE_SITE_SERVICE_DETAILS_FIELDS}
      }
    }
  }`).then(resultHandlerByPath('data.service as data'));
};

export const getByIdentifier = (id) => {
  let caller = getCallerByIdentifier(id);

  return query(`{
    data: ${caller} {
      ${TEMPLATE_SITE_SERVICE_TEMPLATE_DETAILS_FIELDS}
    }
  }`);
};

export const getAll =  ({filter = {}, limit = 0, skip = 0} = {filter:{}, limit: 0, skip: 0}) => {
  return asyncFilterToGraphQL(filter).then(flt => {
    return query(`
      {
        data: siteServiceTemplates(filter: ${flt}, limit: ${limit}, skip: ${skip}) {
          ${TEMPLATE_COLLECTION_HEADER}
          items {
          ${TEMPLATE_SITE_SERVICE_TEMPLATE_COLLECTION_FIELDS}
          }
        }
      }
    `);
  });
};

export default {
  getCallerByIdentifier,
  getSiteServiceImage,
  getAllSiteServiceImages,
  getSiteService,
  getSite,
  getByIdentifier,
  getAll
};