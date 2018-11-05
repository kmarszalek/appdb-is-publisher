import {version} from '../../../../../package.json';

export default {
  Query: {
    version: () => version
  }
}