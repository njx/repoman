/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, Backbone, _, Handlebars, $ */

define(function (require, exports, module) {
    "use strict";
    
    var Suggestions = require("Suggestions");
    
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
            "click .query-leaf-value.mode-view": "editValue",
            "change input": "maybeHandleChange",
            "keypress input": "maybeCommit"
        },
        
        initialize: function () {
            this.template = Handlebars.compile($("#t-query-leaf").html());
            this.mode = "view";
            this.model.on("destroy", this.remove, this);
            this.gotChange = false;
            this.processedChange = false;
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
            var self = this;
            if (this.mode !== "edit") {
                this.mode = "edit";
                this.$(".query-leaf-value").removeClass("mode-view").addClass("mode-edit");
                this.editor = $(this.make("input", {
                    "type": "text",
                    "value": this.model.getValue(),
                    "autocomplete": "off",
                    "placeholder": "label, user, milestone, ..."
                }));
                Suggestions.attach(this.editor);
                this.$(".query-value").empty().append(this.editor);
                FocusManager.setFocus(this.editor);
            }
        },
        
        maybeHandleChange: function () {
            // This is kind of a gross hack. The Bootstrap typeahead plugin triggers a "change"
            // event on the text input field when the user clicks on an item in the list. However,
            // the act of clicking on the item first causes the text input's own native change
            // event to fire before the list receives the click. If we were to commit the edit
            // immediately on the first change event, we'd destroy the editor and the typeahead
            // before it gets the chance to handle the click. So, instead, we wait a bit after
            // receiving a change event to see if we get another one, and let the last one win.
            if (this.gotChange) {
                // Either this is the second change, or we timed out. If we haven't already,
                // go ahead and commit.
                if (!this.processedChange) {
                    this.gotChange = false;
                    this.processedChange = true;
                    this.commitEdit();
                }
            } else {
                this.gotChange = true;
                setTimeout(this.maybeHandleChange.bind(this), 500);
            }
        },
        
        commitEdit: function () {
            var queryStr = this.editor.val();
            if (this.mode === "edit") {
                // TODO: move these heuristics into Suggestions
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
                    parts[0] += ".title";
                } else if (parts[0] === "assignee" || parts[0] === "user") {
                    parts[0] += ".login";
                } else if (parts[0] === "pull_request") {
                    parts[0] += ".html_url";
                }
                
                var attrs = {
                    type: (parts[0] === "labels" ? "contains" : "is"),
                    property: parts[0]
                };
                
                if (parts[0] === "labels") {
                    attrs.matchProperty = "name";
                } else if (parts[0] === "title" || parts[0] === "body") {
                    attrs.matchType = "substring";
                }
                
                if (parts[1]) {
                    attrs.value = parts[1];
                } else {
                    // If no value, assume they just want to check if it's set (or not).
                    negated = !negated;
                    attrs.value = null;
                }
                attrs.negated = negated;
                this.model.set(attrs);
                this.mode = "view";
                this.editor = null;
                this.gotChange = this.processedChange = false;
                this.$(".query-leaf-value").removeClass("mode-edit").addClass("mode-view");
                this.render();
            }
        },
        maybeCommit: function (e) {
            if (e.keyCode === 13) {
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
});
