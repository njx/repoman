/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, Backbone, _, $, Handlebars */

define(function (require, exports, module) {
    "use strict";
    
    var GithubService = require("GithubService"),
        Issues = require("Issues"),
        EditableView = require("EditableView").EditableView;

    var Repo = Backbone.Model.extend({
        // Attributes: user, repo
        
        getDisplayValue: function () {
            return this.getFullName();
        },
        
        getFullName: function () {
            if (!this.isValid()) {
                return "";
            } else {
                return this.get("user") + "/" + this.get("repo");
            }
        },
        
        isValid: function () {
            return !!(this.get("user") && this.get("repo"));
        },
        
        fetchIssues: function () {
            var self = this;
            var result = new $.Deferred();
            GithubService.sendRepoInfoRequest(this.get("user"), this.get("repo"), "issues")
                .progress(function (incr) {
                    result.notify(incr);
                })
                .done(function (response) {
                    var issues = new Issues.Issues();
                    _.each(response, function (issue) {
                        issues.add(new Issues.Issue(issue));
                    });
                    result.resolve({repo: self, issues: issues});
                })
                .fail(function () {
                    result.reject();
                });
            return result.promise();
        }
    });
    
    var RepoView = EditableView.extend({
        className: "repo",
        
        initialize: function () {
            this.template = Handlebars.compile($("#t-repo").html());
            this.placeholder = "user/repo";
            this.model.on("change", this.render, this);
            
            EditableView.prototype.initialize.apply(this, arguments);
        },
        
        render: function () {
            this.$el.html(
                this.template({
                    value: this.model.getDisplayValue()
                })
            );
            
            if (!this.model.get("user") || !this.model.get("repo")) {
                this.editValue();
            }
            return this;
        },

        commitEdit: function () {
            // TODO: don't accept edit if value is invalid
            var parts = this.editor.val().split("/");
            this.model.set({
                user: parts[0],
                repo: parts[1]
            });
            this.finishEdit();
        }
    });
    
    var Repos = Backbone.Collection.extend({
        model: Repo
    });
    
    var ReposView = Backbone.View.extend({
        className: "repos",
        
        initialize: function () {
            this.collection.on("all", this.render, this);
        },

        render: function () {
            var self = this;
            this.$el.empty().append("<span class='repo-view-label'>Search in:</span>");
            this.collection.each(function (model) {
                self.$el.append(new RepoView({model: model}).render().el);
            });
            
            var addButton = $("<span class='add-button'/>")
                .click(function () {
                    self.collection.add(new Repo());
                })
                .appendTo(this.$el);
            return this;
        }
    });
    
    exports.Repo = Repo;
    exports.Repos = Repos;
    exports.ReposView = ReposView;
});