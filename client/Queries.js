/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global Backbone: false, _: false, Handlebars: false, $: false */

var Queries = (function () {
    "use strict";
    
    var exports = {};
    
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
    
        valueMatches: function (actual, desired, isRegexp) {
            return (actual !== null && isRegexp) ? new RegExp(desired).test(actual) : actual === desired;
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
                    query.get("isRegexp")
                );
                break;
            case "contains":
                var value = this.getPropertyPath(issue, query.get("property"));
                result = value && _.some(value, function (item) {
                    return self.valueMatches(
                        self.getPropertyPath(item, query.get("matchProperty")),
                        query.get("value"),
                        query.get("isRegexp")
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
            return this.get("property") + " " + this.get("type");
        },
        
        getValue: function () {
            return this.get("value") || "";
        }
    });
    
    var Queries = Backbone.Collection.extend({
        model: Query
    });
    
    var QueryLeafView = Backbone.View.extend({
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
                    completeness: this.model.get("type") === "incomplete" ? "incomplete" : "complete"
                })
            );
            if (this.model.get("type") === "incomplete") {
                // TODO: this doesn't set focus if we aren't in the DOM yet, as on first render
                this.editValue();
            }
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
                this.editor.focus().select();
            }
        },
        
        commitEdit: function () {
            if (this.mode === "edit") {
                var parts = this.editor.val().split("==");
                parts.forEach(function (value, index) {
                    parts[index] = value.trim();
                });
                if (parts.length === 2) {
                    // TODO: generalize these hardcoded heuristics somehow
                    if (parts[0] === "label") {
                        parts[0] = "labels";
                    }
                    this.model.set("type", (parts[0] === "labels" ? "contains" : "is"));
                    this.model.set("property", parts[0]);
                    if (parts[0] === "labels") {
                        this.model.set("matchProperty", "name");
                    }
                    this.model.set("value", parts[1]);
                } else {
                    this.model.set("value", parts[0]);
                }
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
            this.$el.empty();
            this.renderQuery(this.model);
            return this;
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
                        self.$el.append("<div class='query-punctuation'>" +
                                        (query.get("type") === "and" ? "&amp;&amp;" : "||") +
                                        "</div>");
                    }
                    self.$el.append(new QueryView({model: childQuery}).render().el);
                });
                break;

            case "is":
            case "contains":
            case "incomplete":
                this.$el.append(new QueryLeafView({model: query}).render().el);
                break;
            }
        }
    });
    
    exports.Query = Query;
    exports.Queries = Queries;
    exports.QueryView = QueryView;
    return exports;
}());
