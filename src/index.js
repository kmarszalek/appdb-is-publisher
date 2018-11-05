import appModulePath from 'app-module-path';
import {resolve} from 'path';

appModulePath.addPath(resolve(__dirname, './lib'));

setTimeout(() => {
  var app = require('./app');
  app.default();
},1);