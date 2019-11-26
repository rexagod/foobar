# nci static server

Static files server for [nci](https://github.com/node-ci/nci).


## Installation

```sh
npm install nci-static-server
```


## Usage

To enable add this plugin to the `plugins` section at server config, set
locations which should be shared via http by setting `http.static` section e.g.:

```json
{
    "plugins": [
        "nci-static-server"
    ],
    "http": {
        "host": "127.0.0.1",
        "port": 3000,
        "url": "http://127.0.0.1:3000",
        "static": {
            "locations": [
                {
                    "url": "/js/",
                    "root": "static/"
                }
            ]
        }
    },
....
}
```

Location `root` resolves according to current working dirictory.

Example above will share all files from `current working dirictory/static/js/`
when access to `/js/` e.g. `current working dirictory/static/js/lib/jquery.js`
will be available by url `/js/lib/jquery.js`.

Location `url` also can be a regexp but then you need to use reader which
supports regexps e.g. with [nci yaml reader](https://github.com/node-ci/nci-yaml-reader)
server `config.yml` may looks like:

```yml
plugins:
    - nci-static-server

http:
    host: 127.0.0.1
    port: 3000
    url: http://127.0.0.1:3000
    static:
        locations:    
            - url: !!js/regexp ^/(js|css|fonts|images)/
              root: static/
            - url: !!js/regexp ^/projects/(\w|-)+/workspace(/)?
              root: data/
#uncomment lines below to prevent directory listing
#        options:
#            showDir: false
```

first location shares all required static, the second one provides access to
content of project workspaces. Note that by default directory listing is
enabled.
