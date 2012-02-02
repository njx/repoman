/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global define: false, $: false, base64: false */

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
    
    function sendRequest(path, settings) {
        settings = settings || {};
        settings.beforeSend = function (xhr) {
            // TODO: this doesn't actually work, because JSONP doesn't send headers.
            xhr.setRequestHeader("Authorization", "Basic " + base64.encode(_username + ":" + _password));
        };
        settings.dataType = "jsonp";
        return $.ajax("https://api.github.com" + path, settings);
    }
    
    function sendIssueRequest(user, repo, params) {
        return sendRequest(constructUriPath(['repos', user, repo, 'issues']), {
            data: params
        });
    }
    
    exports.setUserInfo = setUserInfo;
    exports.sendIssueRequest = sendIssueRequest;
    return exports;
}());
