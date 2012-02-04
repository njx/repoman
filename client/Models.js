/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global Backbone: false */

var Models = (function () {
    'use strict';

    var exports = {};
    
    // TODO: is there any real value to using Backbone models here, given that
    // they're static once loaded?
    
    var Repo = Backbone.Model.extend({
        // Attributes: user, repo
        
        getFullName: function () {
            return this.get("user") + "/" + this.get("repo");
        },
        
        fetchIssues: function () {
            var self = this;
            var result = new $.Deferred();
            GithubService.sendIssueRequest(this.get("user"), this.get("repo"))
                .done(function (response) {
                    var issues = new Issues();
                    _.each(response, function (issue) {
                        issues.add(new Issue(issue));
                    });
                    result.resolve({repo: self, issues: issues});
                })
                .fail(function () {
                    result.reject();
                });
            return result.promise();
        }
    });
    
    var Repos = Backbone.Collection.extend({
        model: Repo
    });
    
    var Issue = Backbone.Model.extend({});
    
    var Issues = Backbone.Collection.extend({
        model: Issue
    });
    
    exports.Repo = Repo;
    exports.Repos = Repos;
    exports.Issue = Issue;
    exports.Issues = Issues;
    return exports;
}());
