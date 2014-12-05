#!/usr/bin/env node
var Q = require('q')

var repl = require('repl').start("> ");
require('repl.history')(repl, process.env.HOME + '/.node_history');

var Api = require('../index.js');
var api = new Api(
  {
    url: "http://localhost:8089", 
    activeRepo: 2,
    promiseFactory: function() {
      var d = Q.defer();

      return {
        resolve: d.resolve,
        reject: d.reject,
        promise: d.promise
      }
    }

});

api.login({user: "admin", password: "admin"});

api.ping(function(json) {
  console.log(json);
});

repl.context.api = api;


