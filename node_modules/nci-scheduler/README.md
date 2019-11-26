# nci scheduler

Periodic build runner for nci [nci](https://github.com/node-ci/nci).


## Installation

```sh
npm install nci-scheduler
```


## Usage

To enable add this plugin to the `plugins` section at server config:

```json
{
    "plugins": [
        "nci-scheduler"
    ]
....
}
```

after that you can set scheduler settings at project config e.g. (for building
project every 5 seconds):

```json
    "buildEvery": {
        "time": "*/5 * * * * *",
        "withScmChangesOnly": true
    }
```

parameters:

 - `time` - 6 or 5 (seconds can be omitted) groups cron string
 - `withScmChangesOnly` - if true then build will be started only if there is
scm changes for project
