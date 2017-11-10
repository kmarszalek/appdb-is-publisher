import {existsSync} from 'fs';
import _ from 'lodash';
import path from 'path';

var config = {
  "server": {
    "http": {
      "port": 80,
      "routes": {
        "infosystem":{
          "rest" : "/rest",
          "graphql": "/graphql",
          "graphiql": "/graphiql"
        },
        "couchDBProxy": "/couchdb"
      }
    }
  },
  "modules": {
    "infosystem": {
      "storage": {
        "_default": {
          "dialect": "couchdb",
          "options" :{
            "name": "_default",
            "url": "",
            "collection": "testdb"
          }
        }
      },
      "rest": {
        "graphQLUrl": "local"
      }
    },
    "couchDBProxy": {
      "target": {
        "protocol"  : "https",
        "host"      : "localhost",
        "port"      : 6984,
        "username"  : "",
        "password"  : ""
      },
      "logpath"     : "/var/log/is-publisher/proxy"
    }
  }
};


function loadConfig() {
  var _instanceConfigPath = path.resolve(__dirname, './instance.config.js');
  var instanceConfig = {};

  if (existsSync(_instanceConfigPath)) {
    instanceConfig = require(_instanceConfigPath).default;
  }

  return _.merge(config, instanceConfig);
};


export default loadConfig();