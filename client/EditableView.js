/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, Backbone, _, Handlebars, $ */

define(function (require, exports, module) {
    "use strict";
    
    var FocusManager = require("FocusManager");
    
    // Children must:
    // -- call EditableView.prototype.initialize from initialize
    // -- implement commitEdit (and call this.finishEdit() when done)
    // -- implement getDisplayValue() on model
    // -- set this.placeholder (optional)
    var EditableView = Backbone.View.extend({
        initialize: function () {
            this.mode = "view";
            this.model.on("destroy", this.remove, this);
            this.$el
                .on("click", ".delete", this.deleteModel.bind(this))
                .on("click", this.editValue.bind(this))
                .on("keypress", "input", this.maybeCommit.bind(this));
        },
        
        deleteModel: function (e) {
            e.stopPropagation();
            this.model.destroy();
        },
        
        editValue: function () {
            if (this.mode !== "edit") {
                this.mode = "edit";
                this.editor = $(this.make("input", {
                    "type": "text",
                    "value": this.model.getDisplayValue(),
                    "autocomplete": "off",
                    "placeholder": this.placeholder
                }));
                this.$el.find(".editable-value").empty().append(this.editor);
                FocusManager.setFocus(this.editor);
            }
        },
        
        finishEdit: function () {
            this.mode = "view";
            this.editor = null;
            this.render();
        },
        
        maybeCommit: function (e) {
            if (e.keyCode === 13) {
                this.commitEdit();
            }
        }
    });
    
    exports.EditableView = EditableView;
});