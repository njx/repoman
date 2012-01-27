var GithubService = (function() {
    var exports = {};
    var _username, _password;

    function setUserInfo(username, password) {
        _username = username;
        _password = password;
    }
    
    function constructUriPath(parts) {
        var encodedParts = [];
        parts.forEach(function(part) {
            encodedParts.push(encodeURIComponent(part));
        });
        return "/" + parts.join("/");
    }
    
    function sendRequest(path, settings) {
        settings = settings || {};
        settings.beforeSend = function(xhr) {
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
})();
