# IS Publisher

> Provides access to information system backend.

## Installation

Clone repository, go to the cloned folder and then install all the package dependencies with the following command:
```sh
npm install
```

## Configuration

In order to properly configure the IS Publisher, create the following file from the root folder:
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

## Usage

### GraphQL interface

Provides a service endpoint to post [GraphQL](https://graphql.org/)queries. The service runs over HTTP via a single endpoint:
```
http://<ispublisher_hostname>/graphql
```

In order to help you build your queries or simply perform queries, the [graphiql](https://github.com/graphql/graphiql) UI tool is provided, at the following endpoint:
```
http://<ispublisher_hostname>/tools/graphiql
```
To visually inspect the information schema, the [voyager](https://github.com/APIs-guru/graphql-voyager)   web UI tool is also provided, at the following endpoint:
```
http://<ispublisher_hostname>/tools/voyager
```

>It is suggested to use the aforementioned tools since they provide the data schema documentation and can guide you to write correct queries.

### REST API interface
This service is build on top of graphql service to help users perform simple queries is case they cannot use the graphql language. The root path of this service is accessible at:
```
http://<ispublisher_hostname>/rest
```
The specific endpoint responds with a json describing all of the available REST resources in order to get started.

It should be noted that many complex query operations performed in graphql, such as quering array elements, or matching numeric ranges etc,do not apply to this interface. The same goes for the resource structure, which is predefined in the REST API case.

#### Paging with the REST API
Paging is achieved with the use of **limit** and **skip** query string fields. Eg. Retrieve the first 10 sites:
```
http://<ispublisher_hostname>/rest/sites?limit=10?skip=0
```

### Filtering with the REST API
Filtering is achieved by setting the **filter** query string field. It contains space seperated expressions in the following format:
```
  <property>[.<subproperty>][::<operation>]:<value>
```

| name | mandatory | description |
| ---- | --------- | ----------- |
| property | yes | The property of the resource |
| subproperty | no | A nested property |
| operation | no | A comparison operation. Defaults to **eq**(equals) |
| value | yes | The value to match |

>Properties and subproperties are case sensitive

>Text values must be wrapped in double quotes

>Boolean values take no operation and can be either **true** or **false**

Operation value depends on the value type:

| operation | value | description |
| --------- | ----- | ----------- |
| eq | text, number | Exact equal with value |
| ne | text, number | Not equal with value |
| like | text | Contains value. Can use "*". |
| ilike | text | Case insensite. Contains value. Can use "*". |
| nlike | text | Does not contain value. Can use "*" |
| nilike | text | Case insensitive. Does not contain value. Can use "*" |
| gt | number | Greater than value |
| ge | number | Greater than or equal to value |
| lt | number | Less than value |
| le | number | Less then or equal to value |


#### Examples
Find any site from _"Spain"_:
```
/rest/sites?filter=country:"Spain"
```

Find any site with name that contains the word _"meta"_ we write our filter like:
```
/rest/sites?filter=name::ilike:"*meta*"
```

Combine the above queries:
```
/rest/sites?filter=country:"Spain" name::ilike:"*meta*"
```

Find any site with a service not in _production_:
```
/rest/sites?filter=services.isInProduction:false
```

## CouchDB interface

This interface is a read only proxy to the backend CouchDB instance that can be used by couchdb client tools. It can be accessed from the following endpoint:
```
http://<ispublisher_hostname>/couchdb
```