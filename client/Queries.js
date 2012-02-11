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
                if (curObject instanceof Backbone.Model) {
                    curObject = curObject.get(property);
                } else {
                    curObject = curObject[property];
                }
            });
            return curObject;
        },
    
        valueMatches: function (actual, desired, isRegexp) {
            return isRegexp ? new RegExp(desired).test(actual) : actual === desired;
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
            return this.get("property") + " " + this.get("type");
        },
        
        getValue: function () {
            return this.get("value");
        }
    });
    
    var Queries = Backbone.Collection.extend({
        model: Query
    });
    
    var QueryLeafView = Backbone.View.extend({
        events: {
            "click .query-delete": "deleteModel",
            "click": "editLabel",
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
                    label: this.model.getLabel(),
                    value: this.model.getValue()
                })
            );
            return this;
        },
        
        deleteModel: function () {
            this.model.destroy();
        },
        
        editLabel: function () {
            if (this.mode != "edit") {
                this.mode = "edit";
                this.editor = $(this.make("input", { 
                    "type": "text", 
                    "value": this.model.getValue()
                }));
                this.$(".query-value").empty().append(this.editor);
            }
        },
        
        commitEdit: function () {
            if (this.mode == "edit") {
                this.model.set("value", this.editor.val());
                this.editor = null;
                this.$(".query-value").text(this.model.getValue());
                this.mode = "view";
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
                this.$el.append(new QueryLeafView({model: query}).render().el);
                break;
                    
            case "incomplete":
                // TODO: ***
                break;
            }
        }
    });
    
    exports.Query = Query;
    exports.Queries = Queries;
    exports.QueryView = QueryView;
    return exports;
}());
