/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, Backbone, _, $ */

define(function (require, exports, module) {
    "use strict";
    
    var GithubService = require("GithubService");

    // TODO: is there any real value to using Backbone models here, given that
    // they're static once loaded?
    
    var Issue = Backbone.Model.extend({});
    
    var Issues = Backbone.Collection.extend({
        model: Issue
    });
    
    var Repo = Backbone.Model.extend({
        // Attributes: user, repo
        
        getFullName: function () {
            return this.get("user") + "/" + this.get("repo");
        },
        
        fetchIssues: function () {
            var self = this;
            var result = new $.Deferred();
            GithubService.sendRepoInfoRequest(this.get("user"), this.get("repo"), "issues")
                .progress(function (incr) {
                    result.notify(incr);
                })
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
    
    exports.Repo = Repo;
    exports.Repos = Repos;
    exports.Issue = Issue;
    exports.Issues = Issues;
});
