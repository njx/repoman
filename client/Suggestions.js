/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, Backbone, _, Handlebars, $ */

define(function (require, exports, module) {
    "use strict";
    
    var GithubService = require("GithubService"),
        StringMatch = require("lib/StringMatch");

    var repos, items, initDeferred, stringMatcher = new StringMatch.StringMatcher();
    
    function getItems(repo, itemType, queryNames, itemField, result) {
        return GithubService.sendRepoInfoRequest(repo.get("user"), repo.get("repo"), itemType)
            .done(function (items) {
                items.forEach(function (item) {
                    queryNames.forEach(function (queryName) {
                        result.push(queryName + "=" + item[itemField]);
                    });
                });
            });
    }
    
    function initItems(force) {
        if (!initDeferred || force) {
            initDeferred = new $.Deferred();
            var result = ["pull_request", "assignee=null"],
                promises = [];
            
            repos.each(function (repo) {
                promises.push(getItems(repo, "labels", ["label"], "name", result));
                promises.push(getItems(repo, "contributors", ["assignee", "user"], "login", result));
                promises.push(getItems(repo, "milestones", ["milestone"], "title", result));
            });
            
            $.when.apply(window, promises).then(function () {
                result.sort();
                result = _.uniq(result, true);
                items = result;
                initDeferred.resolve();
            });
        }
        
        return initDeferred.promise();
    }
    
    function setRepos(r) {
        repos = r;
        repos.on("all", function () {
            initItems(true);
        });
    }
    
    function matcher(item) {
        var query = this.query;
        if (query.charAt(0) === "!") {
            query = query.slice(1);
        }
        return stringMatcher.match(item, query) ? true : false;
    }
    
    function sorter(results) {
        // TODO: kind of inefficient to have to run these through the matcher again,
        // but the bootstrap autocompleter doesn't let us cache the match info on
        // the items themselves
        var query = this.query;
        if (query.charAt(0) === "!") {
            query = query.slice(1);
        }
        var infos = results.map(function (result) {
            return stringMatcher.match(result, query);
        });
        StringMatch.multiFieldSort(infos, { matchGoodness: 0, label: 1 });
        return infos.map(function (info) {
            return info.label;
        });
    }
    
    function highlighter(item) {
        // TODO: kind of inefficient to have to run these through the matcher again,
        // but the bootstrap autocompleter doesn't let us cache the match info on
        // the items themselves
        var query = this.query, negated = false;
        if (query.charAt(0) === "!") {
            query = query.slice(1);
            negated = true;
        }
        var matchInfo = stringMatcher.match(item, query);
        if (!matchInfo) {
            // shouldn't happen, but just return the original string
            return item;
        }
        
        var stringRanges = matchInfo.stringRanges,
            displayName = "";

        // Put the path pieces together, highlighting the matched parts
        stringRanges.forEach(function (range) {
            if (range.matched) {
                displayName += "<span class='match-highlight'>";
            }
            
            var rangeText = range.text;
            displayName += rangeText
                .replace(/&/g, "&amp;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            
            if (range.matched) {
                displayName += "</span>";
            }
        });
        if (negated) {
            displayName = "<span class='match-highlight'>!</span>" + displayName;
        }
        return displayName;
    }
    
    function source(query, process) {
        if (!items) {
            initItems().done(function () {
                process(items);
            });
        } else {
            return items;
        }
    }
    
    function updater(item) {
        if (this.query.charAt(0) === "!") {
            return "!" + item;
        } else {
            return item;
        }
    }
    
    function attach($input) {
        $input.typeahead({
            source: source,
            matcher: matcher,
            sorter: sorter,
            highlighter: highlighter,
            updater: updater
        });
    }
    
    exports.attach = attach;
    exports.setRepos = setRepos;
});
