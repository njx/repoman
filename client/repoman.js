/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, $, _, Spinner, Handlebars */

define(function (require, exports, module) {
    "use strict";
    
    var Models = require("Models"),
        Queries = require("Queries"),
        GithubService = require("GithubService"),
        Suggestions = require("Suggestions");
    
    var issuesTemplate = Handlebars.compile($("#t-issues-summary").html()),
        repos = new Models.Repos(),
        query = new Queries.Query({
            type: "and",
            children: new Queries.Queries([
                new Queries.Query({
                    type: "is",
                    property: "pull_request.html_url",
                    value: null
                }),
                new Queries.Query({
                    type: "incomplete"
                })
            ])
        }),
        resultCache,
        refreshing = false;
    
    // From http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
    function hexToRgb(hex) {
        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });
    
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    function textColorFor(bgColor) {
        var rgb = hexToRgb(bgColor);
        rgb.r /= 255;
        rgb.g /= 255;
        rgb.b /= 255;
        var l = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b);
    
        if (l > 0.5) {
            return "#666";
        } else {
            return "#fff";
        }
    }
    
    function addLabelColors(issue) {
        var labels = issue.get("labels");
        if (labels) {
            labels.forEach(function (label) {
                if (label.color) {
                    label.text_color = textColorFor(label.color);
                }
            });
            issue.set("labels", labels);
        }
        return issue;
    }
    
    function updateQueryResults() {
        if (!resultCache) {
            if (!refreshing) {
                refreshIssues();
            }
        } else {
            $("#issues-container").empty();
            repos.each(function (repo) {
                var foundResult = _.find(resultCache, function (result) { return result.repo === repo; });
                var issues = [];
                if (foundResult) {
                    issues = foundResult.issues.filter(
                        function (issue) {
                            return (query ? query.matches(issue) : true);
                        }
                    );
                }
                if (issues.length > 0) {
                    $("#issues-container").append(issuesTemplate(
                        {
                            repo: repo.getFullName(),
                            issues: _.map(issues, function (issue) { return addLabelColors(issue).toJSON(); }),
                            numIssues: issues.length
                        }
                    ));
                }
            });
        }
    }
    
    // TODO: factor into IssuesView module
    function refreshIssues() {
        // TODO: instead of waiting for everything to load, add headings immediately with
        // spinners, then fill as data comes in
        refreshing = true;
        $("#spinner").show();
        var spinner = new Spinner({color: "#fff", width: 4}).spin($("#spinner").get(0));
        var promises = [];
        repos.each(function (repo) {
            promises.push(repo.fetchIssues());
        });
        $.when.apply(window, promises).then(function () {
            spinner.stop();
            $("#spinner").hide();
            resultCache = Array.prototype.slice.call(arguments);
            refreshing = false;
            updateQueryResults();
        });
    }
    
    function login(username, password) {
        GithubService.setUserInfo(username, password);
        
        $("#query-view").append(new Queries.QueryView({model: query}).render().el);
        Queries.FocusManager.refreshFocus();
        query.on("all", function () {
            updateQueryResults();
        });
    
        repos.on("all", function () {
            refreshIssues();
        });
        $(".query-refresh").on("click", function () {
            refreshIssues();
        });
        
        refreshIssues();
    }
    
    function init() {
        Suggestions.setRepos(repos);
        
        repos.add(new Models.Repo({user: "adobe", repo: "brackets"}));
        repos.add(new Models.Repo({user: "adobe", repo: "brackets-shell"}));
        
        // Turn off login for now. Don't need it for searching public repos.
        login();
        
//        $("#login-form").submit(function (event) {
//            event.preventDefault();
//            login($("#login-username").val(), $("#login-password").val());
//        });
//        
//        $("#login-username").focus();
    }
    
    init();
});
