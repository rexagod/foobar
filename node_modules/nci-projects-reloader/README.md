# nci projects reloader

On disk changes projects reloader for nci for [nci](https://github.com/node-ci/nci).

## Installation

```sh
npm install nci-projects-reloader
```

## Usage

To enable add this plugin to the `plugins` section at server config:

```json
{
    "plugins": [
        "nci-projects-reloader"
    ]
....
}
```

after that when you change any project config (or add new project) on disk it
will be automatically updated within currently running nci server.
