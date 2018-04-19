# IS Publisher

> Provides access to information system backend.

## Installation

Clone repository, go to the cloned folder and then install all the package dependencies with the following command:
```sh
npm install
```

## Configuration

In order to properly configure the IS Publisher, create a the following file from THE root folder:
```sh
./config/instance.config.js
```

Below you can see how the structure of this file should be with the systems default values (you can omit the comments):

```javascript
module.exports = {
  "server": {
    "http": {
      //HTTP server port
      "port": 80
    }
  },
  "modules": {
    "infosystem": {
      "storage": {
        "_default": {
          "dialect": "couchdb",
          "options" :{
            "name": "_default",
            //The couchdb endpoint url.
            //You should provide the correct credentials.
            "url": "https://nouser:nouser@localhost:6984",
            //This is the default collection name.
            //Depends on ISCollector setup.
            "collection": "isappdb"
          }
        }
      },
      "rest": {
        //Location of GraphQL endpoint for
        //the REST API
        "graphQLUrl": {
          "protocol"  : "https",
          "host"      : "localhost",
          "port"      : 80,
          "path"      : "graphql"
        }
        //if you want to use the local graphql
        //service you can set
        //
        //  "graphQLUrl": "local"
        //
        //to avoid setting each field.
      }
    },
    "couchDBProxy": {
      //Location of the CouchDB endpoint to proxy
      "target": {
        "protocol"  : "https",
        "host"      : "localhost",
        "port"      : 6984,
        "username"  : "",
        "password"  : ""
      },
      //Path for CouchDB proxy to log traffic.
      //The process must have write permissions to the folder.
      "logpath"     : "/var/log/is-publisher/proxy"
    }
  }
};

```

## Starting the server

### Development
Execute from the root folder of IS Publisher the following command:
```sh
node bin/dev
```
### Production

Execute from the root folder of IS Publisher the following command:
```sh
npm run production
```

### Long running service

To ensure that the service will always be running there are two files, for production and development instances, that relies on [pm2 package](http://pm2.keymetrics.io/).

If pm2 is installed we can run for a development instance, the following command in the root folder of ispublisher:
```sh
pm2 start pm2.dev.json
```

For the production instance an extra step is required.
```sh
npm run build
pm2 start pm2.production.json
```
