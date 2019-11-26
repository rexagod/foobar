'use strict';

var Steppy = require('twostep').Steppy,
	inherits = require('util').inherits,
	fs = require('fs'),
	path = require('path'),
	yaml = require('js-yaml');

var envVarRegExp = /(\$\w+)/g;

// one directon yaml type, transforms env variable name to it's value 
var EnvYamlType = new yaml.Type('!env', {
	kind: 'scalar',

	resolve: function(data) {
		return envVarRegExp.test(data);
	},

	construct: function(str) {
		return str.replace(envVarRegExp, function(name) {
			return process.env[name.slice(1)];
		});
	}
});

var schema = yaml.Schema.create([EnvYamlType]);

exports.register = function(app) {
	var ParentLoader = app.lib.reader.BaseReaderLoader;

	function Loader() {
		ParentLoader.call(this);
	}

	inherits(Loader, ParentLoader);

	Loader.prototype.ext = 'yaml';

	Loader.prototype._load = function(dir, name, callback) {
		var self = this;
		Steppy(
			function() {
				var filePath = path.join(dir, name + '.' + self.ext);
				fs.readFile(filePath, 'utf8', this.slot());
			},
			function(err, text) {
				var content = yaml.load(text, {schema: schema});

				this.pass(content);
			},
			callback
		);
	};

	app.lib.reader.register(Loader.prototype.ext, Loader);
};
