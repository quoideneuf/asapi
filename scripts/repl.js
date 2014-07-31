#!/usr/bin/env node

var repl = require('repl');
require('../')(repl, process.env.HOME + '/.node_history');

var Api = require('../index.js');
var api = new Api({url: "http://localhost:8089", active_repo: 2});

api.login({user: "admin", password: "admin"});

api.ping(function(json) {
  console.log(json);
});

repl.start("> ").context.api = api;


