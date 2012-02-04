/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global Backbone: false, _: false, Handlebars: false, $: false */

var _sampleQuery = {
    type: "and",
    children: [
        {
            type: "is",
            property: "assignee.user",
            value: "peterflynn"
        },
        {
            type: "is",
            property: "status",
            value: "open"
        },
        {
            negated: true,
            type: "contains",
            property: "labels",
            matchProperty: "name",
            value: "fixed but not closed"
        },
        {
            type: "incomplete",
            value: "spr"
        }
    ]
};

var Queries = (function () {
    "use strict";
    
    var exports = {};

    function queryMatches(query, issue) {
        var result = false;
        
        switch (query.type) {
        case "and":
            result = _.every(query.children, function (queryChild) {
                queryMatches(queryChild, issue);
            });
            break;
        case "or":
            result = _.some(query.children, function (queryChild) {
                queryMatches(queryChild, issue);
            });
            break;
        case "is":
            result = (issue.get(query.property) === query.value);
            break;
        case "contains":
            var value = issue.get(query.property);
            result = value && _.some(value, function (item) {
                return item[query.matchProperty] === query.value;
            });
            break;
        }
        
        if (query.negated) {
            result = !result;
        }
        return result;
    }
    
    var Query = Backbone.Model.extend({
        // Attributes: query
        
        matches: function (issue) {
            return queryMatches(this.get("query"), issue);
        }
    });
    
    var QueryView = Backbone.View.extend({
        className: "query",
        
        render: function () {
            this.$el.empty();
            this.renderQuery(this.model.get("query"));
            return this;
        },
        
        renderQuery: function (query) {
            switch (query.type) {
                case "and":
                case "or":
                    
                    break;
                case "is":
                    break;
                case "contains":
                    break;
            }
        }
    });
    
    var QueryLeafView = Backbone.View.extend({
        template: Handlebars.compile($("#t-query-leaf").html()),
        
        render: function () {
            // ***
            
            return this;
        }
    });
    
    exports.Query = Query;
    exports.QueryView = QueryView;
    return exports;
}());
