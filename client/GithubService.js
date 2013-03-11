/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global define, $, base64 */

define(function (require, exports, module) {
    'use strict';
    
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
                    var url = match[1].replace("https://api.github.com", "/api");
                    accumulatePages(url, settings, results, deferred);
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
            if (_username && _password) {
                xhr.setRequestHeader("Authorization", "Basic " + base64.encode(_username + ":" + _password));
            }
        };
        settings.dataType = "json";
        return accumulatePages("/api" + path, settings);
    }
    
    function sendRepoInfoRequest(user, repo, infoType, params) {
        var result = $.Deferred();
        params = params || {};
        // TODO: get all pages, or figure out some other pagination strategy
        params.per_page = params.per_page || 100;
        sendRequest(constructUriPath(['repos', user, repo, infoType]), {
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
    exports.sendRepoInfoRequest = sendRepoInfoRequest;
});
