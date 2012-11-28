/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global $: false, base64: false */

var GithubService = (function () {
    'use strict';
    
    var exports = {};
    var _username, _password;

    function setUserInfo(username, password) {
        _username = username;
        _password = password;
    }
    
    function constructUriPath(parts) {
        var encodedParts = [];
        parts.forEach(function (part) {
            encodedParts.push(encodeURIComponent(part));
        });
        return "/" + parts.join("/");
    }
    
    function accumulatePages(uri, settings, results, deferred) {
        var xhr;
        
        deferred = deferred || $.Deferred();
        results = results || [];
        xhr = $.ajax(uri, settings)
            .done(function (data) {
                results.push(data);
                
                var link = xhr.getResponseHeader("Link"), match;
                if (link && (match = link.match(/<([^>]*)>; rel="next"/)) !== null) {
                    accumulatePages(match[1], settings, results, deferred);
                } else {
                    deferred.resolve(results);
                }
            })
            .fail(function () {
                deferred.reject();
            });
        
        return deferred.promise();
    }
    
    function sendRequest(path, settings) {
        var result = $.Deferred();
        settings = settings || {};
        settings.beforeSend = function (xhr) {
            xhr.setRequestHeader("Authorization", "Basic " + base64.encode(_username + ":" + _password));
        };
        settings.dataType = "json";
        return accumulatePages("https://localhost:8080/api" + path, settings);
    }
    
    function sendIssueRequest(user, repo, params) {
        var result = $.Deferred();
        params = params || {};
        // TODO: get all pages, or figure out some other pagination strategy
        params.per_page = params.per_page || 100;
        sendRequest(constructUriPath(['repos', user, repo, 'issues']), {
            data: params
        }).done(function (allResponses) {
            var flattened = [];
            allResponses.forEach(function (response) {
                Array.prototype.push.apply(flattened, response);
            });
            result.resolve(flattened);
        }).fail(function () {
            result.reject();
        });
        return result.promise();
    }
    
    exports.setUserInfo = setUserInfo;
    exports.sendIssueRequest = sendIssueRequest;
    return exports;
}());
