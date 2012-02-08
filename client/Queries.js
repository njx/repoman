/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global Backbone: false, _: false, Handlebars: false, $: false */

// TODO: add way to do textual (regexp?) search within a value

var Queries = (function () {
    "use strict";
    
    var exports = {};
    
    function getPropertyPath(modelOrObject, propertyPath) {
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
    }
    
    function valueMatches(actual, desired, isRegexp) {
        return isRegexp ? new RegExp(desired).test(actual) : actual === desired;
    }

    function queryMatches(query, issue) {
        var result = false;
        
        // TODO: handle dot path for property
        switch (query.type) {
        case "and":
            result = query.get("children").all(function (queryChild) {
                return queryMatches(queryChild, issue);
            });
            break;
        case "or":
            result = query.get("children").all(function (queryChild) {
                return queryMatches(queryChild, issue);
            });
            break;
        case "is":
            result = valueMatches(getPropertyPath(issue, query.get("property")),
                                  query.get("value"), query.get("isRegexp"));
            break;
        case "contains":
            var value = getPropertyPath(issue, query.get("property"));
            result = value && _.some(value, function (item) {
                return valueMatches(getPropertyPath(item, query.get("matchProperty")),
                                    query.get("value"), query.get("isRegexp"));
            });
            break;
        }
        
        if (query.get("negated")) {
            result = !result;
        }
        return result;
    }
    
    var Query = Backbone.Model.extend({
        // Attributes: query
        
        matches: function (issue) {
            return queryMatches(this, issue);
        }
    });
    
    var QueryLeafView = Backbone.View.extend({
        template: Handlebars.compile($("#t-query-leaf").html()),
        
        render: function () {
            // ***
            
            return this;
        }
    });
    
    var QueryView = Backbone.View.extend({
        className: "query",
        
        render: function () {
            this.$el.empty();
            this.renderQuery(this.model);
            return this;
        },
        
        renderQuery: function (query) {
            switch (query.get("type")) {
            case "and":
            case "or":
                // TODO: ***
                break;

            case "is":
            case "contains":
                this.$el.append(new QueryLeafView({model: query}));
                break;
            case "incomplete":
                // TODO: ***
                break;
            }
        }
    });
    
    exports.Query = Query;
    exports.QueryView = QueryView;
    return exports;
}());
