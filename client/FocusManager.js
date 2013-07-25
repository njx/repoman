/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, Backbone, _, Handlebars, $ */

define(function (require, exports, module) {
    // We use this to make sure that focus gets set properly once query views have been created.
    var currentFocus = null;
    
    var refreshFocus = exports.refreshFocus = function () {
        currentFocus.focus().select();
    };
        
    exports.setFocus = function (editor) {
        currentFocus = editor;
        refreshFocus();
    };    
});