# nci rest api server

REST api server for [nci](https://github.com/node-ci/nci).


## Installation

```sh
npm install nci-rest-api-server
```


## Usage

To enable add this plugin to the `plugins` section at server config:

```json
{
    "plugins": [
        "nci-rest-api-server"
    ],
    "http": {
        "host": "127.0.0.1",
        "port": 3000,
        "url": "http://127.0.0.1:3000"
    },
....
}
```

after that you can access api according to your server `http.host` and
`http.port` options.


## API routes

Notes:

 - Currently destructive api methods (project removing/renaming)
protected by randomly generated token which will be printed to the server log
during server startup.
 - Currently server respond format is only json.


### GET /api/0.1/builds

Get builds sorted by date in descending order.

Query parameters:
 - `project` - optional project filter
 - `limit` - maximum builds count to get (20 by default)


### GET /api/0.1/builds/:id

Get particular build by id.


### POST /api/0.1/builds

Create build by running given project.

Body parameters:
 - `project` - project to build
 - `withScmChangesOnly` - if true then build will be started only if
there is scm changes for project
 - `queueQueued` - if true then currently queued project can be queued
again


### PATCH /api/0.1/builds/:id

Update build.

Body parameters:
 - `cancel` - if set to true then build will be canceled


### GET /api/0.1/projects

Get configs for all currently loaded projects.


### GET /api/0.1/projects/:name

Get particular project by name.


### POST /api/0.1/projects

Create new project and set config.

Body parameters:
 - `name` - project name
 - `config` - project configuratjion object
 - `configFile` - project cconfig file object with `name` and `content` fields
(it's alternative for `config` option when need to set file in specific format)
 - `loadConfig` - if true then project will be loaded


### PATCH /api/0.1/projects/:name

Modify project.

To rename project, body parameters:
 - `name` - new project name

To set project config, body parameters:
 - `config` - project configuratjion object
 - `configFile` - project cconfig file object with `name` and `content` fields
(it's alternative for `config` option when need to set file in specific format)
 - `loadConfig` - if true then project will be loaded

To archive/unarchive project, body parameters:
 - `archived` - boolean, new state of the project

### DELETE /api/0.1/projects/:name

Remove project.
