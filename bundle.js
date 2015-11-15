(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var request = require('./lib/request');

var formDataFactory = require('./lib/form-data-factory.js');
var fileLoader = require('./lib/file-loader.js');
var loggerFactory = require('./lib/log-factory.js');

function Api(opts) {
  opts = opts || {};
  var session = opts.session;
  var backendUrl = opts.url;
  var activeRepo = opts.activeRepo || opts.active_repo;
  var logger = opts.logger;
  var promiseFactory = opts.promiseFactory
  var requestInterface = opts.requestInterface;
  var connectionTimeout = opts.connectionTimeout || 7200;

  var self = this;


  if (typeof(requestInterface) != 'undefined') {
    request = requestInterface;
  }


  if (typeof(logger) === 'undefined') {
    logger = loggerFactory();
  }


  if (typeof(promiseFactory) === 'undefined') {
    promiseFactory = function() {
      return {
        resolve: function(){
        },
        reject: function(){
        },
        promise: {
          then: function(){
            throw new Error("Called 'then' on stubbed Promise");
          },
          catch: function(){
            throw new Error("Called 'catch' on stubbed Promise");
          }
        }
      }
    }
  }


  this.ping = function(callback) {
    return doGet("/", {}, callback);
  }

  // Requires aspace_eraser plugin
  this.nuke = function(callback) {
    return doDelete("/", callback);
  }


  this.login = function(opts, callback) {
    var formOpts = {password: opts.password};
    var loginUrl = backendUrl + "/users/" + opts.user + "/login";

    return requestRequest('post', {url: loginUrl, form: formOpts}, function(err, body) {

      if (!err) {
        session = body.session;
      }

      if (callback) callback(err, session);
    });
  };

  this.logout = function() {
    setSession(undefined);
  }

  this.hasSession = function() {
    if (session) {
      return true;
    } else {
      return false;
    }
  };


  this.getRepo = function() {
    return activeRepo;
  };


  this.setRepo = function(id) {
    activeRepo = id;
  };


  this.download = function(uri, streamWriter) {
    downloadStream(uri, streamWriter);
  };


  this.get = function(uri, opts, callback) {
    if (typeof(opts) == 'function') {
      callback = opts;
      opts = {};
    }

    return doGet(uri, opts, callback);
  };


  this.post = function(uri, obj, callback) {
    return doPost(uri, obj, callback);
  };


  this.getJobs = function(opts, callback) {
    var opts = opts || {};
    var page = opts.page || 1;
    return doGet("/repositories/:repo_id/jobs?page=" + page, {}, callback);
  };


  this.getJobError = function(job_id, callback) {
    doGetRaw("/repositories/:repo_id/jobs/" + job_id + "/log", function(err, res, body) {
      if (res.statusCode == 200) {
        var importError = parseError(body);
        callback(null, importError);
      }
    });
  };


  this.getUpdates = function(last_sequence, callback) {
    if (typeof(last_sequence) === 'function') {
      callback = last_sequence;
      last_sequence = 0;
    }

    this.get("/update-feed?last_sequence=" + last_sequence, callback);
  };


  this.getNotifications = function(last_sequence, callback) {
    if (typeof(last_sequence) === 'function') {
       callback = last_sequence;
      last_sequence = 0;
    }

    this.get("/notifications?last_sequence=" + last_sequence, callback);
  };


  this.getRepositories = function(callback) {
    return doGet("/repositories", {}, callback);
  };


  this.getResources = function(opts, callback) {
    if (typeof(opts) === 'function') {
      callback = opts;
      opts = {};
    }

    var page = opts.page || 1;

    return doGet("/repositories/:repo_id/resources", opts, callback);
  };


  this.eachResource = function(callback, page) {
    if (typeof(page) === 'undefined') {
      page = 1;
    }

    self.getResources({page: page}, function(err, json) {
      if (err) {
        callback(err);
      } else {
        for (var i = 0; i < json.results.length; i++) {
          callback(err, json.results[i]);
        }

        if (json.last_page > page) {
          self.eachResource(callback, page + 1);
        }
      }
    });
  };


  this.updateRecord = function(rec, callback) {
    return doPost(rec.uri, rec, callback);
  };

  // needs to be update for new AS background jobs scheme
  this.createJob = function(job, callback) {
    var d = promiseFactory();

    for (var i = 0; i < job.files.length; i++) {
      if (!fileLoader.existsSync(job.files[i])) {
        var err = new Error("File " + job.files[i] + " does not exist");
        d.reject(err);
        if (callback) callback(err);
        return d.promise;
      }
    };

    var form = formDataFactory();
    form.append('job', JSON.stringify(job));
    for (var i=0; i < job.files.length; i++) {
      var filepath = job.files[i];
      form.append('files[' + i + ']', fileLoader.createReadStream(filepath));
    }


    doPostForm("/repositories/:repo_id/jobs", form, function(err, json) {
      if (!err && json.error) {
        err = new Error(JSON.stringify(json.error));
      } else if (!err && json.status != 'Created') {
        err = "Job Status error: " + json.status;
      }

      if (err) {
        d.reject(err);
      } else {
        d.resolve(json);
      }

      if (callback) callback(err, json);
    });

    return d.promise;
  };


  this.createRepository = function(obj, callback) {
    return doPost("/repositories", obj, callback);
  };


  this.createLocation = function(obj, callback) {
    return doPost("/locations", obj, callback);
  };


  this.createClassification = function(obj, callback) {
    return doPost("/repositories/:repo_id/classifications", obj, callback);
  };


  this.createAccession = function(obj, callback) {
    return doPost("/repositories/:repo_id/accessions", obj, callback);
  };


  this.createResource = function(obj, callback) {
    return doPost("/repositories/:repo_id/resources", obj, callback);
  };


  this.createArchivalObject = function(obj, callback) {
    return doPost("/repositories/:repo_id/archival_objects", obj, callback);
  };


  this.createDigitalObject = function(obj, callback) {
    return doPost("/repositories/:repo_id/digital_objects", obj, callback);
  };


  function setSession(new_session) {
    session = new_session;
  };


  function resolvePath(path) {
    if (activeRepo) {
      path = path.replace(":repo_id", activeRepo);
    }

    return path;
  };


  function getASHost() {
    if (typeof(backendUrl) === 'undefined') {
      throw "Missing base url for REST api";
    }

    return backendUrl.replace(/https?:\/\//, "").replace(/:\d+$/, "");
  };


  function getASPort() {
    if (typeof(backendUrl) == 'undefined') {
      throw "Missing base url for REST api";
    }

    return backendUrl.replace(/.*:/, "");
  };


  function expand(path) {
    path = resolvePath(path);

    if (typeof(backendUrl) == 'undefined') {
      throw "Missing base url for REST api";
    }

    return backendUrl + path;
  }


  function serverError(code, body) {
    var err = new Error(body);
    err.code = code;
    return err;
  }


  function downloadStream(uri, streamWriter) {
    var opts = {
      url: expand(uri),
      headers: {}
    };

    if (session) {
      opts.headers['X-ArchivesSpace-Session'] = session;
    }

    request.get(opts).pipe(streamWriter);
  }


  // get JSON
  function doGet(uri, opts, callback) {

    if (opts === undefined)
      opts = {}

    var d = promiseFactory();
    var json;

    if (Object.keys(opts).length > 0) {
      uri += "?"
      for (i=0; i < Object.keys(opts).length; i++){
        var paramName = Object.keys(opts)[i];
        var paramVal = opts[Object.keys(opts)[i]];

        if (typeof(paramVal) === 'object') {
          for (j=0; j < Object.keys(paramVal).length; j++) {
            uri += paramName + "[]=";
            uri += paramVal[i];
          }
        } else {
          uri += paramName+"="+paramVal;
        }
        if (i < Object.keys(opts).length - 1) uri += "&";
      }
    }

    var opts = {
      url: expand(uri),
      timeout: connectionTimeout,
    };

    return requestRequest('get', opts, callback);
  };


  // TODO test this
  function doDelete(path, callback) {
    var d = promiseFactory();
    var opts = {
      url: expand(path),
      headers: {
        'X-ArchivesSpace-Session': session
      }
    };

    request.del(opts, function(err, res, body) {
      logger.debug("ASpace Response: " + res.statusCode + " : " + JSON.stringify(body));


      if (res.statusCode && res.statusCode != 200) {
        err = new ArchivesSpaceServerError(res.statusCode, body);
      }

      if (err) d.reject(err);
      else d.resolve(body);

      if (callback) callback(err, body);
    });

    return d.promise;
  };


  function doPost(path, obj, callback) {
    var opts = {
      url: expand(path),
    };

    if (obj) {
      opts.json = obj;
    }

    logger.debug("Posting" + JSON.stringify(opts));

    return requestRequest('post', opts, callback);
  };


  function doPostForm(path, form, callback) {

    var opts = {
      host: getASHost(),
      port: getASPort(),
      path: resolvePath(path),
      headers: {
        'X-ArchivesSpace-Session': session
      }
    };

    form.submit(opts, function(err, res) {
      res.on('data', function(data) {
        var job = JSON.parse(data);
        callback(err, job);
      });

    });
  }


  function requestRequest(method, opts, callback) {
    var d = promiseFactory();

    if (session) {
      opts.headers = opts.headers || {};
      opts.headers['X-ArchivesSpace-Session'] = session;
    }

    opts.method = method.toUpperCase();

    request.apply(method, [opts, function(err, res, body) {

      if (res && body) {
        logger.debug("ASpace Response: " + res.statusCode + " : " + JSON.stringify(body));
      }

      if (res && res.statusCode === 0) {
        logger.debug(JSON.stringify(res) + JSON.stringify(err));
        err = new ConnectionError("Cannot connect to ArchivesSpace; check settings and network connection");
      } else if (res && res.statusCode && res.statusCode != 200) {
        err = new ArchivesSpaceServerError(res.statusCode, body);
      }

      if (!err && typeof(body) === 'string') {
        body = JSON.parse(body);
      }

      if (err) {
        d.reject(err);
      } else {
        d.resolve(body);
      }

      if (callback) callback(err, body);
    }]);

    return d.promise;
  }


  function parseError(body) {

    var results = [];
    var loginfo = body.split(/=+\n/).map(function(s) { return s.replace(/\\n/g, ''); });

    while (loginfo[0].length < 1 && loginfo.length > 0) {
      loginfo.shift();
    }

    while (loginfo.length > 1) {
      console.log(loginfo);
      var filename = loginfo.shift();
      var match = loginfo.shift().match(/Error:.*/);

      if (match) {
        results.push(filename + " -> " + match[0]);
      } else {
        results.push(filename + " (appears ok)");
      }
    }

    return results.join("\n");
  }

  function ConnectionError(message) {
    this.message = message;
  }

  ConnectionError.prototype = new Error();
  ConnectionError.prototype.constructor = ConnectionError;

  function ArchivesSpaceServerError(code, response) {
    this.name = "ArchivesSpaceServerError"
    this.message = response;
    this.code = code;
  }

  ArchivesSpaceServerError.prototype = new Error();
  ArchivesSpaceServerError.prototype.constructor = ArchivesSpaceServerError;

}

module.exports = Api;

if (typeof(window) != 'undefined') {
  window.Api = Api;
}

},{"./lib/file-loader.js":2,"./lib/form-data-factory.js":3,"./lib/log-factory.js":4,"./lib/request":5}],2:[function(require,module,exports){
function FileLoader() {

  this.existsSync = function() {
    false;
  };

  this.createReadStream = function() {
  };

}

module.exports = new FileLoader();

},{}],3:[function(require,module,exports){
function NoFormData() {
  this.append = function(field, json) {
    throw new Error("Multipart form not supported for browsers at this time");
  };
}

module.exports = function() {
  return new NoFormData();
};

},{}],4:[function(require,module,exports){
function Logger() {
  this.debug = function(msg) {
    console.log(msg);
  };

  this.info = function(msg) {
    console.log(msg);
  };
}



module.exports = function() {
  return new Logger();
};

},{}],5:[function(require,module,exports){
module.exports = require('browser-request');

},{"browser-request":6}],6:[function(require,module,exports){
// Browser Request
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// UMD HEADER START 
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
  }
}(this, function () {
// UMD HEADER END

var XHR = XMLHttpRequest
if (!XHR) throw new Error('missing XMLHttpRequest')
request.log = {
  'trace': noop, 'debug': noop, 'info': noop, 'warn': noop, 'error': noop
}

var DEFAULT_TIMEOUT = 3 * 60 * 1000 // 3 minutes

//
// request
//

function request(options, callback) {
  // The entry-point to the API: prep the options object and pass the real work to run_xhr.
  if(typeof callback !== 'function')
    throw new Error('Bad callback given: ' + callback)

  if(!options)
    throw new Error('No options given')

  var options_onResponse = options.onResponse; // Save this for later.

  if(typeof options === 'string')
    options = {'uri':options};
  else
    options = JSON.parse(JSON.stringify(options)); // Use a duplicate for mutating.

  options.onResponse = options_onResponse // And put it back.

  if (options.verbose) request.log = getLogger();

  if(options.url) {
    options.uri = options.url;
    delete options.url;
  }

  if(!options.uri && options.uri !== "")
    throw new Error("options.uri is a required argument");

  if(typeof options.uri != "string")
    throw new Error("options.uri must be a string");

  var unsupported_options = ['proxy', '_redirectsFollowed', 'maxRedirects', 'followRedirect']
  for (var i = 0; i < unsupported_options.length; i++)
    if(options[ unsupported_options[i] ])
      throw new Error("options." + unsupported_options[i] + " is not supported")

  options.callback = callback
  options.method = options.method || 'GET';
  options.headers = options.headers || {};
  options.body    = options.body || null
  options.timeout = options.timeout || request.DEFAULT_TIMEOUT

  if(options.headers.host)
    throw new Error("Options.headers.host is not supported");

  if(options.json) {
    options.headers.accept = options.headers.accept || 'application/json'
    if(options.method !== 'GET')
      options.headers['content-type'] = 'application/json'

    if(typeof options.json !== 'boolean')
      options.body = JSON.stringify(options.json)
    else if(typeof options.body !== 'string')
      options.body = JSON.stringify(options.body)
  }
  
  //BEGIN QS Hack
  var serialize = function(obj) {
    var str = [];
    for(var p in obj)
      if (obj.hasOwnProperty(p)) {
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
      }
    return str.join("&");
  }
  
  if(options.qs){
    var qs = (typeof options.qs == 'string')? options.qs : serialize(options.qs);
    if(options.uri.indexOf('?') !== -1){ //no get params
        options.uri = options.uri+'&'+qs;
    }else{ //existing get params
        options.uri = options.uri+'?'+qs;
    }
  }
  //END QS Hack
  
  //BEGIN FORM Hack
  var multipart = function(obj) {
    //todo: support file type (useful?)
    var result = {};
    result.boundry = '-------------------------------'+Math.floor(Math.random()*1000000000);
    var lines = [];
    for(var p in obj){
        if (obj.hasOwnProperty(p)) {
            lines.push(
                '--'+result.boundry+"\n"+
                'Content-Disposition: form-data; name="'+p+'"'+"\n"+
                "\n"+
                obj[p]+"\n"
            );
        }
    }
    lines.push( '--'+result.boundry+'--' );
    result.body = lines.join('');
    result.length = result.body.length;
    result.type = 'multipart/form-data; boundary='+result.boundry;
    return result;
  }
  
  if(options.form){
    if(typeof options.form == 'string') throw('form name unsupported');
    if(options.method === 'POST'){
        var encoding = (options.encoding || 'application/x-www-form-urlencoded').toLowerCase();
        options.headers['content-type'] = encoding;
        switch(encoding){
            case 'application/x-www-form-urlencoded':
                options.body = serialize(options.form).replace(/%20/g, "+");
                break;
            case 'multipart/form-data':
                var multi = multipart(options.form);
                //options.headers['content-length'] = multi.length;
                options.body = multi.body;
                options.headers['content-type'] = multi.type;
                break;
            default : throw new Error('unsupported encoding:'+encoding);
        }
    }
  }
  //END FORM Hack

  // If onResponse is boolean true, call back immediately when the response is known,
  // not when the full request is complete.
  options.onResponse = options.onResponse || noop
  if(options.onResponse === true) {
    options.onResponse = callback
    options.callback = noop
  }

  // XXX Browsers do not like this.
  //if(options.body)
  //  options.headers['content-length'] = options.body.length;

  // HTTP basic authentication
  if(!options.headers.authorization && options.auth)
    options.headers.authorization = 'Basic ' + b64_enc(options.auth.username + ':' + options.auth.password);

  return run_xhr(options)
}

var req_seq = 0
function run_xhr(options) {
  var xhr = new XHR
    , timed_out = false
    , is_cors = is_crossDomain(options.uri)
    , supports_cors = ('withCredentials' in xhr)

  req_seq += 1
  xhr.seq_id = req_seq
  xhr.id = req_seq + ': ' + options.method + ' ' + options.uri
  xhr._id = xhr.id // I know I will type "_id" from habit all the time.

  if(is_cors && !supports_cors) {
    var cors_err = new Error('Browser does not support cross-origin request: ' + options.uri)
    cors_err.cors = 'unsupported'
    return options.callback(cors_err, xhr)
  }

  xhr.timeoutTimer = setTimeout(too_late, options.timeout)
  function too_late() {
    timed_out = true
    var er = new Error('ETIMEDOUT')
    er.code = 'ETIMEDOUT'
    er.duration = options.timeout

    request.log.error('Timeout', { 'id':xhr._id, 'milliseconds':options.timeout })
    return options.callback(er, xhr)
  }

  // Some states can be skipped over, so remember what is still incomplete.
  var did = {'response':false, 'loading':false, 'end':false}

  xhr.onreadystatechange = on_state_change
  xhr.open(options.method, options.uri, true) // asynchronous
  if(is_cors)
    xhr.withCredentials = !! options.withCredentials
  xhr.send(options.body)
  return xhr

  function on_state_change(event) {
    if(timed_out)
      return request.log.debug('Ignoring timed out state change', {'state':xhr.readyState, 'id':xhr.id})

    request.log.debug('State change', {'state':xhr.readyState, 'id':xhr.id, 'timed_out':timed_out})

    if(xhr.readyState === XHR.OPENED) {
      request.log.debug('Request started', {'id':xhr.id})
      for (var key in options.headers)
        xhr.setRequestHeader(key, options.headers[key])
    }

    else if(xhr.readyState === XHR.HEADERS_RECEIVED)
      on_response()

    else if(xhr.readyState === XHR.LOADING) {
      on_response()
      on_loading()
    }

    else if(xhr.readyState === XHR.DONE) {
      on_response()
      on_loading()
      on_end()
    }
  }

  function on_response() {
    if(did.response)
      return

    did.response = true
    request.log.debug('Got response', {'id':xhr.id, 'status':xhr.status})
    clearTimeout(xhr.timeoutTimer)
    xhr.statusCode = xhr.status // Node request compatibility

    // Detect failed CORS requests.
    if(is_cors && xhr.statusCode == 0) {
      var cors_err = new Error('CORS request rejected: ' + options.uri)
      cors_err.cors = 'rejected'

      // Do not process this request further.
      did.loading = true
      did.end = true

      return options.callback(cors_err, xhr)
    }

    options.onResponse(null, xhr)
  }

  function on_loading() {
    if(did.loading)
      return

    did.loading = true
    request.log.debug('Response body loading', {'id':xhr.id})
    // TODO: Maybe simulate "data" events by watching xhr.responseText
  }

  function on_end() {
    if(did.end)
      return

    did.end = true
    request.log.debug('Request done', {'id':xhr.id})

    xhr.body = xhr.responseText
    if(options.json) {
      try        { xhr.body = JSON.parse(xhr.responseText) }
      catch (er) { return options.callback(er, xhr)        }
    }

    options.callback(null, xhr, xhr.body)
  }

} // request

request.withCredentials = false;
request.DEFAULT_TIMEOUT = DEFAULT_TIMEOUT;

//
// defaults
//

request.defaults = function(options, requester) {
  var def = function (method) {
    var d = function (params, callback) {
      if(typeof params === 'string')
        params = {'uri': params};
      else {
        params = JSON.parse(JSON.stringify(params));
      }
      for (var i in options) {
        if (params[i] === undefined) params[i] = options[i]
      }
      return method(params, callback)
    }
    return d
  }
  var de = def(request)
  de.get = def(request.get)
  de.post = def(request.post)
  de.put = def(request.put)
  de.head = def(request.head)
  return de
}

//
// HTTP method shortcuts
//

var shortcuts = [ 'get', 'put', 'post', 'head' ];
shortcuts.forEach(function(shortcut) {
  var method = shortcut.toUpperCase();
  var func   = shortcut.toLowerCase();

  request[func] = function(opts) {
    if(typeof opts === 'string')
      opts = {'method':method, 'uri':opts};
    else {
      opts = JSON.parse(JSON.stringify(opts));
      opts.method = method;
    }

    var args = [opts].concat(Array.prototype.slice.apply(arguments, [1]));
    return request.apply(this, args);
  }
})

//
// CouchDB shortcut
//

request.couch = function(options, callback) {
  if(typeof options === 'string')
    options = {'uri':options}

  // Just use the request API to do JSON.
  options.json = true
  if(options.body)
    options.json = options.body
  delete options.body

  callback = callback || noop

  var xhr = request(options, couch_handler)
  return xhr

  function couch_handler(er, resp, body) {
    if(er)
      return callback(er, resp, body)

    if((resp.statusCode < 200 || resp.statusCode > 299) && body.error) {
      // The body is a Couch JSON object indicating the error.
      er = new Error('CouchDB error: ' + (body.error.reason || body.error.error))
      for (var key in body)
        er[key] = body[key]
      return callback(er, resp, body);
    }

    return callback(er, resp, body);
  }
}

//
// Utility
//

function noop() {}

function getLogger() {
  var logger = {}
    , levels = ['trace', 'debug', 'info', 'warn', 'error']
    , level, i

  for(i = 0; i < levels.length; i++) {
    level = levels[i]

    logger[level] = noop
    if(typeof console !== 'undefined' && console && console[level])
      logger[level] = formatted(console, level)
  }

  return logger
}

function formatted(obj, method) {
  return formatted_logger

  function formatted_logger(str, context) {
    if(typeof context === 'object')
      str += ' ' + JSON.stringify(context)

    return obj[method].call(obj, str)
  }
}

// Return whether a URL is a cross-domain request.
function is_crossDomain(url) {
  var rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/

  // jQuery #8138, IE may throw an exception when accessing
  // a field from window.location if document.domain has been set
  var ajaxLocation
  try { ajaxLocation = location.href }
  catch (e) {
    // Use the href attribute of an A element since IE will modify it given document.location
    ajaxLocation = document.createElement( "a" );
    ajaxLocation.href = "";
    ajaxLocation = ajaxLocation.href;
  }

  var ajaxLocParts = rurl.exec(ajaxLocation.toLowerCase()) || []
    , parts = rurl.exec(url.toLowerCase() )

  var result = !!(
    parts &&
    (  parts[1] != ajaxLocParts[1]
    || parts[2] != ajaxLocParts[2]
    || (parts[3] || (parts[1] === "http:" ? 80 : 443)) != (ajaxLocParts[3] || (ajaxLocParts[1] === "http:" ? 80 : 443))
    )
  )

  //console.debug('is_crossDomain('+url+') -> ' + result)
  return result
}

// MIT License from http://phpjs.org/functions/base64_encode:358
function b64_enc (data) {
    // Encodes string using MIME base64 algorithm
    var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc="", tmp_arr = [];

    if (!data) {
        return data;
    }

    // assume utf8 data
    // data = this.utf8_encode(data+'');

    do { // pack three octets into four hexets
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);

        bits = o1<<16 | o2<<8 | o3;

        h1 = bits>>18 & 0x3f;
        h2 = bits>>12 & 0x3f;
        h3 = bits>>6 & 0x3f;
        h4 = bits & 0x3f;

        // use hexets to index into b64, and append result to encoded string
        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
    } while (i < data.length);

    enc = tmp_arr.join('');

    switch (data.length % 3) {
        case 1:
            enc = enc.slice(0, -2) + '==';
        break;
        case 2:
            enc = enc.slice(0, -1) + '=';
        break;
    }

    return enc;
}
    return request;
//UMD FOOTER START
}));
//UMD FOOTER END

},{}]},{},[1]);
