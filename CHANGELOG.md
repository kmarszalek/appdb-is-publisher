# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.2] - 2018-11-05
### Changed
- Update third party dependencies to their current version
- Use package.json version value from graphql version resolver
- Clean up unused code

## [1.3.1] - 2018-04-23
### Changed
- Code revision and documentation
- Revised logging information

## [1.3.0] - 2018-01-16
### Added
- Add WARNING in site service status enumeration
- Add enumeration filtering in REST api
- Add argo status and gocdb downtime in site and service details for REST api
- Add argo service statuses resource in REST api
- Add gocdb downtimes resource in REST api
### Changed
- Update apollo-server dependency package to v1.3.2
### Fixed
- Fix relation of service statuses to site services in entity model


## [1.2.1] - 2017-12-18
### Added
- Allow models to provide custom pre process arguments and post process response (future use)

## [1.2.0] - 2017-12-13
### Added
- Graphical tool voyager to display graphql schema
- Add filtering in REST api interface
- Add filtering of SRV and service downtimes from the sites and services entities in GraphQL
- Add cors in GraphQl endpoint
### Changed
- Grapgiql tool is moved under route /tools with voyager
- CouchDB optimization. Detect if query can be performed by id field only
- Removed "or" operations from filter types until properly implement backend functionality
- Auto convert of REST filters to GraphQL ones


## [1.1.3] - 2017-11-28
### Changed
- Set all filters to be handled woith filter operators instead of passing raw values
- CouchDB optimazation. Use request level caching to avoid duplicate db queries
- Ensure that only one db task is running any specific query and not having duplicate db requests
### Fixed
- Replaced invalid filter types for site service entity


## [1.1.2] - 2017-11-21
### Changed
- Set default couchdb collection to "isappdb"


## [1.1.1] - 2017-11-20
### Changed
- Set shared fields between entities.
- Relate service and SRV downtime entities with site and site service entities
- CouchDB optimization. Do not use $eq instead of $in operator for single id search
- CouchDB optimization. Merge external entity filtering with internal on shared fields
### Fixed
- Fix endpointURL mapping in SiteService model
- Fix graphql filtering for many to one relation types.


## [1.1.0] - 2017-11-15
### Added
- Added filter array operators (containsAll, icontainsAll, containsSome, icontainsSome, containsBetween)
- Added new fields in SiteService, SiteServiceImage, SiteServiceTemplate in Graphql and REST interface
- Added central logger
### Changed
- Set default production cluster to 4 process


## [1.0.0] - 2017-11-10
### Added
- initial release