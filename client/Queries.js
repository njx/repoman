/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global Backbone: false, _: false, Handlebars: false, $: false */

var Queries = (function () {
    "use strict";
    
    var exports = {};
    
    // We use this to make sure that focus gets set properly once query views have been created.
    var FocusManager = (function () {
        var currentFocus = null;
        
        var refreshFocus = function () {
            currentFocus.focus().select();
        };
            
        var setFocus = function (editor) {
            currentFocus = editor;
            refreshFocus();
        };
        
        return {
            refreshFocus: refreshFocus,
            setFocus: setFocus
        };
    }());
    
    var Query = Backbone.Model.extend({
        initialize: function () {
            this.bindChildrenEvent();
            this.on("change:children", this.bindChildrenEvent, this);
        },
        
        bindChildrenEvent: function () {
            if (this.get("children")) {
                this.get("children").on("all", function () {
                    this.trigger("childrenChanged");
                }, this);
            }
        },
        
        getPropertyPath: function (modelOrObject, propertyPath) {
            var properties = propertyPath.split("."),
                curObject = modelOrObject;
            properties.forEach(function (property) {
                if (curObject) {
                    if (curObject instanceof Backbone.Model) {
                        curObject = curObject.get(property);
                    } else {
                        curObject = curObject[property];
                    }
                }
            });
            return curObject;
        },
    
        valueMatches: function (actual, desired, matchType) {
            if (desired === "null") {
                desired = null;
            } else if (desired === "undefined") {
                desired = undefined;
            }
            if (actual === null || actual === undefined) {
                return actual === desired;
            } else if (desired === null || desired === undefined) {
                return false;
            } else {
                if (matchType === "regexp") {
                    return new RegExp(desired).test(actual);
                } else if (matchType === "substring") {
                    return actual.toLowerCase().indexOf(desired.toLowerCase()) !== -1;
                } else {
                    return actual.toLowerCase() === desired.toLowerCase();
                }
            }
        },

        queryMatches: function (query, issue) {
            var result = false, self = this;
            
            switch (query.get("type")) {
            case "and":
                result = query.get("children").all(function (queryChild) {
                    return self.queryMatches(queryChild, issue);
                });
                break;
            case "or":
                result = query.get("children").any(function (queryChild) {
                    return self.queryMatches(queryChild, issue);
                });
                break;
            case "is":
                result = this.valueMatches(
                    this.getPropertyPath(issue, query.get("property")),
                    query.get("value"),
                    query.get("matchType")
                );
                break;
            case "contains":
                var value = this.getPropertyPath(issue, query.get("property"));
                result = value && _.some(value, function (item) {
                    return self.valueMatches(
                        self.getPropertyPath(item, query.get("matchProperty")),
                        query.get("value"),
                        query.get("matchType")
                    );
                });
                break;
            case "incomplete":
                result = true;
                break;
            }
            
            if (query.get("negated")) {
                result = !result;
            }
            return result;
        },
    
        matches: function (issue) {
            return this.queryMatches(this, issue);
        },
        
        getLabel: function () {
            if (this.get("type") === "incomplete") {
                return "";
            }
            return (this.get("negated") ? "!(" : "") + this.get("property") + " " + this.get("type") + (this.get("negated") ? ")" : "");
        },
        
        getValue: function () {
            if (this.get("value") === null) {
                return "null";
            } else {
                return this.get("value");
            }
        },
        
        validate: function (attrs) {
            // Check if we're going to change from incomplete to complete. If so, send an event.
            if (this.get("type") === "incomplete" && attrs.type !== "incomplete") {
                this.trigger("completing", this);
            }
        }
    });
    
    var Queries = Backbone.Collection.extend({
        model: Query,
        
        initialize: function () {
            this.on("completing", this.completing, this);
        },
        
        completing: function (model) {
            // Add a new incomplete item after the given model, so the user has a place to type.
            var index = this.indexOf(model);
            if (index !== -1) {
                this.add(new Query({type: "incomplete"}), {at: index + 1});
            }
        }
    });
    
    var QueryLeafView = Backbone.View.extend({
        className: "query-leaf",
        
        events: {
            "click .query-delete": "deleteModel",
            "click .query-leaf-value": "editValue",
            "keypress input": "maybeCommit"
        },
        
        initialize: function () {
            this.template = Handlebars.compile($("#t-query-leaf").html());
            this.mode = "view";
            this.model.on("destroy", this.remove, this);
        },
        
        render: function () {
            this.$el.html(
                this.template({
                    label: this.model.get("type") === "incomplete" ? "" : this.model.getLabel(),
                    value: this.model.getValue(),
                    complete: this.model.get("type") !== "incomplete"
                })
            );
            if (this.model.get("type") === "incomplete") {
                this.$el.removeClass("complete").addClass("incomplete");
            } else {
                this.$el.removeClass("incomplete").addClass("complete");
            }
            this.$el.addClass("clearfix");
            return this;
        },
        
        deleteModel: function () {
            this.model.destroy();
        },
        
        editValue: function () {
            if (this.mode !== "edit") {
                this.mode = "edit";
                this.editor = $(this.make("input", {
                    "type": "text",
                    "value": this.model.getValue()
                }));
                this.$(".query-value").empty().append(this.editor);
                FocusManager.setFocus(this.editor);
            }
        },
        
        commitEdit: function () {
            if (this.mode === "edit") {
                // TODO: move these heuristics into Suggestions
                var queryStr = this.editor.val();
                var negated = false;
                if (queryStr && queryStr.charAt(0) === "!") {
                    negated = true;
                    queryStr = queryStr.slice(1);
                }
                var parts = queryStr.split(/\=+/);
                parts.forEach(function (value, index) {
                    parts[index] = value.trim();
                });
                
                // Special cases
                if (parts[0] === "label") {
                    parts[0] = "labels";
                } else if (parts[0] === "milestone") {
                    parts[0] = "milestone.title";
                } else if (parts[0] === "assignee") {
                    parts[0] = "assignee.login";
                } else if (parts[0] === "pull_request") {
                    parts[0] = "pull_request.html_url";
                }
                
                this.model.set("type", (parts[0] === "labels" ? "contains" : "is"));
                this.model.set("property", parts[0]);
                if (parts[0] === "labels") {
                    this.model.set("matchProperty", "name");
                } else if (parts[0] === "title" || parts[0] === "body") {
                    this.model.set("matchType", "substring");
                }
                
                if (parts[1]) {
                    this.model.set("value", parts[1]);
                } else {
                    // If no value, assume they just want to check if it's set (or not).
                    negated = !negated;
                    this.model.set("value", null);
                }
                this.model.set("negated", negated);
                this.mode = "view";
                this.render();
            }
        },
        
        maybeCommit: function (event) {
            if (event.keyCode === 13) {
                this.commitEdit();
            }
        }
    });
    
    var QueryView = Backbone.View.extend({
        className: "query",
        
        initialize: function () {
            this.model.on("change", this.render, this);
            this.model.on("destroy", this.remove, this);
            if (this.model.get("children")) {
                this.model.get("children").on("all", this.render, this);
            }
        },
        
        render: function () {
            this.$el.empty().addClass("clearfix");
            this.renderQuery(this.model);
            return this;
        },
        
        addView: function (query) {
            var newView = new QueryLeafView({model: query}).render();
            this.$el.append(newView.el);
            if (query.get("type") === "incomplete") {
                newView.editValue();
            }
        },
        
        renderQuery: function (query) {
            var self = this;
            switch (query.get("type")) {
            case "and":
            case "or":
                var first = true;
                query.get("children").each(function (childQuery) {
                    if (first) {
                        first = false;
                    } else {
                        self.$el.append("<div class='query-punctuation clearfix'>" +
                                        (query.get("type") === "and" ? "&amp;&amp;" : "||") +
                                        "</div>");
                    }
                    self.addView(childQuery);
                });
                break;

            case "is":
            case "contains":
            case "incomplete":
                self.addView(query);
                break;
            }
        }
    });
    
    exports.Query = Query;
    exports.Queries = Queries;
    exports.QueryView = QueryView;
    exports.FocusManager = FocusManager;
    return exports;
}());
