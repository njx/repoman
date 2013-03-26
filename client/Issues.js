/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, Backbone, _, $ */

define(function (require, exports, module) {
    "use strict";
    
    // TODO: is there any real value to using Backbone models here, given that
    // issues are static once loaded?
    
    var Issue = Backbone.Model.extend({});
    
    var Issues = Backbone.Collection.extend({
        model: Issue
    });
    
    exports.Issue = Issue;
    exports.Issues = Issues;
});
