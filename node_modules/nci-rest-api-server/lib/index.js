'use strict';

var Steppy = require('twostep').Steppy,
	_ = require('underscore'),
	querystring = require('querystring');
/*
 * Pure rest api on pure nodejs follows below
 */

var router = {};
router.routes = {};

_(['get', 'post', 'patch', 'delete']).each(function(method) {
	router[method] = function(path, handler) {
		this.routes[method] = this.routes[method] || [];
		var keys = [],
			regExpStr = path.replace(/:(\w+)/g, function(match, name) {
				keys.push(name);
				return '(.+)';
			});

		this.routes[method].push({
			regExp: new RegExp('^' + regExpStr + '$'),
			handler: handler,
			keys: keys
		});
	};
});

router.del = router['delete'];

router.getRoute = function(req) {
	var parts,
		route = _(this.routes[req.method.toLowerCase()]).find(function(route) {
			parts = route.regExp.exec(req.path);
			return parts;
		});


	if (route && route.keys.length) {
		route.params = {};
		_(route.keys).each(function(key, index) {
			route.params[key] = parts[index + 1];
		});
	}

	return route;
};

var createRequestListener = function(app) {
	var logger = app.lib.logger('rest api'),
		accessToken = (
			(app.config.http && app.config.http.apiAccessToken) ||
			(Math.random() * Math.random()).toString(36).substring(2)
		);

	logger.log('access token is: %s', accessToken);

	router.get('/api/0.1/builds', function(req, res, next) {
		Steppy(
			function() {
				var getParams = {limit: Number(req.query.limit) || 20};

				if (req.query.project) {
					getParams.projectName = req.query.project;
				}

				app.builds.getRecent(getParams, this.slot());
			},
			function(err, builds) {
				res.json({builds: builds});
			},
			next
		);
	});

	router.get('/api/0.1/builds/:id', function(req, res, next) {
		Steppy(
			function() {
				var id = Number(req.params.id);

				app.builds.get(id, this.slot());
			},
			function(err, build) {
				if (build) {
					res.json({build: build});
				} else {
					res.statusCode = 404;
					res.end();
				}
			},
			next
		);
	});

	// run building of a project
	router.post('/api/0.1/builds', function(req, res, next) {
		Steppy(
			function() {
				var projectName = req.body.project,
					project = app.projects.get(projectName);

				if (project) {
					res.statusCode = 204;
					logger.log('Run project "%s"', projectName);
					app.builds.create({
						projectName: projectName,
						withScmChangesOnly: req.body.withScmChangesOnly,
						queueQueued: req.body.queueQueued,
						initiator: {type: 'httpApi'},
						buildParams: req.body.buildParams,
						env: req.body.env
					});
				} else {
					res.statusCode = 404;
				}

				res.end();
			},
			next
		);
	});

	router.patch('/api/0.1/builds/:id', function(req, res, next) {
		Steppy(
			function() {
				var id = Number(req.params.id),
					cancel = req.body.cancel;

				if (cancel) {
					logger.log('Cancel build "%s"', id);

					app.builds.cancel({
						buildId: id,
						canceledBy: {type: 'httpApi'}
					}, this.slot());
				} else {
					logger.log('Nothing to patch for build "%s"', id);
					this.pass(null);
				}
			},
			function(err) {
				res.statusCode = 204;
				res.end();
			},
			next
		);
	});

	router.get('/api/0.1/projects', function(req, res, next) {
		Steppy(
			function() {
				res.json({projects: app.projects.getAll()});
			},
			next
		);
	});

	router.post('/api/0.1/projects', function(req, res, next) {
		var token = req.body.token;

		Steppy(
			function() {
				if (token !== accessToken) {
					throw new Error('Access token doesn`t match');
				}

				var name = req.body.name,
					config = req.body.config,
					configFile = req.body.configFile,
					loadConfig;

				if (_(req.body).has('loadConfig')) {
					loadConfig = req.body.loadConfig;
				} else {
					loadConfig = true;
				}

				app.projects.create({
					name: name,
					config: config,
					configFile: configFile,
					load: loadConfig
				}, this.slot());
			},
			function(err) {
				res.statusCode = 204;
				res.end();
			},
			next
		);
	});

	router.get('/api/0.1/projects/:name', function(req, res, next) {
		Steppy(
			function() {
				var project = app.projects.get(req.params.name);
				if (project) {
					res.json({project: project});
				} else {
					res.statusCode = 404;
					res.end();
				}
			},
			next
		);
	});

	router.del('/api/0.1/projects/:name', function(req, res, next) {
		var token = req.body.token,
			projectName = req.params.name;

		Steppy(
			function() {
				logger.log('Cleaning up project "%s"', projectName);

				if (token !== accessToken) {
					throw new Error('Access token doesn`t match');
				}

				app.projects.remove({name: projectName}, this.slot());
			},
			function() {
				logger.log('Project "%s" cleaned up', projectName);
				res.statusCode = 204;
				res.end();
			},
			next
		);
	});

	router.patch('/api/0.1/projects/:name', function(req, res, next) {
		var token = req.body.token,
			projectName = req.params.name,
			project,
			newProjectName = req.body.name,
			config = req.body.config,
			configFile = req.body.configFile,
			loadConfig,
			archived = req.body.archived;

		Steppy(
			function() {
				if (_(req.body).has('loadConfig')) {
					loadConfig = req.body.loadConfig;
				} else {
					loadConfig = true;
				}

				if (token !== accessToken) {
					throw new Error('Access token doesn`t match');
				}

				project = app.projects.get(projectName);

				if (!project) {
					throw new Error(
						'Can`t find project "' + projectName + '" for patch'
					);
				}

				if (config || configFile) {
					logger.log(
						'Set config for project "%s"', projectName
					);

					app.projects.setConfig({
						projectName: projectName,
						config: config,
						configFile: configFile,
						load: loadConfig
					}, this.slot());
				} else {
					this.pass(null);
				}
			},
			function() {
				if (_(archived).isBoolean()) {
					if (archived === project.archived) {
						this.pass(null);
					} else {
						if (archived) {
							logger.log('Archive project "%s"', projectName);
							app.projects.archive({name: projectName}, this.slot());
						} else {
							logger.log('Unarchive project "%s"', projectName);
							app.projects.unarchive({name: projectName}, this.slot());
						}
					}
				} else {
					this.pass(null);
				}
			},
			function() {
				// rename should be the last modification to not affect other
				// changes (coz name will be changed)
				if (newProjectName && projectName !== newProjectName) {
					logger.log(
						'Rename project "%s" to "%s"', projectName, newProjectName
					);

					var curProject = app.projects.get(projectName);
					if (!curProject) {
						throw new Error('Project "' + projectName + '" not found');
					}
					this.pass(curProject);

					var newProject = app.projects.get(newProjectName);
					if (newProject) {
						throw new Error(
							'Project name "' + newProjectName + '" already used'
						);
					}

					app.projects.rename({
						name: projectName,
						newName: newProjectName
					}, this.slot());
				} else {
					this.pass(null);
				}
			},
			function() {
				res.statusCode = 204;
				res.end();
			},
			next
		);
	});

	return function(req, res, next) {

		res.json = function(data) {
			res.end(JSON.stringify(data, null, 4));
		};

		Steppy(
			function() {
				var stepCallback = this.slot();

				var urlParts = req.url.split('?');
				req.path = urlParts[0];
				req.query = querystring.parse(urlParts[1]);

				req.setEncoding('utf-8');
				var bodyString = '';
				req.on('data', function(data) {
					bodyString += data;
				});
				req.on('end', function() {
					stepCallback(null, bodyString);
				});
				req.on('error', stepCallback);
			},
			function(err, bodyString) {
				req.body = bodyString ? JSON.parse(bodyString) : {};

				var route = router.getRoute(req);
				if (route) {
					req.params = route.params;
					route.handler(req, res, this.slot());
				} else {
					res.statusCode = 404;
					res.end();
				}
			},
			next
		);
	};

};

exports.register = function(app) {
	var requestListener = createRequestListener(app);

	app.httpServer.addRequestListener(function(req, res, next) {
		if (req.url.indexOf('/api/') === 0) {
			return requestListener(req, res, next);
		} else {
			next();
		}
	});
};
