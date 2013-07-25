/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, $, _, Spinner, Handlebars */

define(function (require, exports, module) {
    "use strict";
    
    var Repos = require("Repos"),
        Queries = require("Queries"),
        GithubService = require("GithubService"),
        Suggestions = require("Suggestions");
    
    var issuesTemplate = Handlebars.compile($("#t-issues-summary").html()),
        repos = new Repos.Repos(),
        query,
        queryView,
        resultCache,
        queryResultsInvalid = false,
        refreshing = false;
    
    function makeDefaultQuery() {
        return new Queries.Query({
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
        });
    }
    
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
    
    // TODO: factor into IssuesView module
    function updateQueryResults(doPushState) {
        if (doPushState) {
            var saveQuery = _.extend({}, query.toJSONDeep());
            // TODO: change-repos
//            saveQuery.repos = repos.filter(function (repo) { return repo.isValid(); })
//                .map(function (repo) { return repo.getFullName(); });
            history.pushState({}, document.title, location.pathname + "?" + $.param(saveQuery));
        }
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
        queryResultsInvalid = false;
    }
    
    function refreshIssues(doPushState) {
        var hasValidRepo = repos.some(function (repo) {
            return repo.isValid();
        });
        if (!hasValidRepo) {
            // All repos deleted. Just update the query results (to clear them).
            resultCache = [];
            updateQueryResults();
            return;
        }
        
        // TODO: instead of waiting for everything to load, add headings immediately with
        // spinners, then fill as data comes in
        refreshing = true;
        $("#spinner").show();
        var spinner = new Spinner({color: "#fff", width: 4, radius: 12}).spin($("#spinner").get(0));
        var promises = [], fetched = 0;
        repos.each(function (repo) {
            if (repo.isValid()) {
                var promise = repo.fetchIssues();
                promises.push(promise);
                promise.progress(function (incr) {
                    fetched += incr;
                    $("#spinner .issue-progress").text(fetched);
                });
            } else {
                delete resultCache.repo;
            }
        });
        $.when.apply(window, promises).then(function () {
            spinner.stop();
            $("#spinner").hide();
            resultCache = Array.prototype.slice.call(arguments);
            refreshing = false;
            updateQueryResults(doPushState);
        });
    }
    
    function createQueryModel(root) {
        if (root.children) {
            root.children = new Queries.Queries(_.map(root.children, function (child) {
                return createQueryModel(child);
            }));
        }
        return new Queries.Query(root);
    }
    
    function invalidateQueryResults() {
        if (!queryResultsInvalid) {
            queryResultsInvalid = true;
            setTimeout(function () {
                updateQueryResults(true);
            }, 50);
        }
    }
    
    function setNewQuery() {
        if (query) {
            // TODO: dumb
            query.off("all");
        }
        if (queryView) {
            queryView.remove();
        }
        queryView = new Queries.QueryView({model: query});
        $("#query-view").append(queryView.render().el);
        query.on("all", function () {
            invalidateQueryResults();
        });
    }
    
    function updateQueryFromURL() {
        var queryStr = location.search;
        if (queryStr) {
            if (queryStr.charAt(0) === "?") {
                queryStr = queryStr.slice(1);
            }
            var params = $.deparam(queryStr, true);
            // TODO: change-repos
//            if (params.repos) {
//                repos.reset(params.repos.map(function (repo) {
//                    var parts = repo.split("/");
//                    return new Repos.Repo({ user: parts[0], repo: parts[1] });
//                }));
//            }
            query = createQueryModel(params);
        } else {
            query = makeDefaultQuery();
        }
        setNewQuery();
        updateQueryResults(false);
    }
    
    function refreshViews() {
        // Hide the query view if we have no valid repos
        if (!repos.some(function (repo) { return repo.isValid(); })) {
            $(".query-container").hide();
        } else {
            $(".query-container").show();
        }
    }
    
    function login(username, password) {
        GithubService.setUserInfo(username, password);

        repos.on("all", function () {
            if (repos.length === 0) {
                // If they delete the last repo, add a new blank one.
                repos.add(new Repos.Repo());
            }
            refreshViews();
            refreshIssues(true);
        });
        $(".query-refresh").on("click", function () {
            refreshIssues();
        });
        
        $(window).on("popstate", function () {
            updateQueryFromURL();
        });
        
        // $("#repos-view").append(new Repos.ReposView({collection: repos}).render().el);
        
        updateQueryFromURL();
        Queries.FocusManager.refreshFocus();
        refreshViews();
    }
    
    function init() {
        Suggestions.setRepos(repos);
        
        // TODO: change-repos
        // Add an empty repo so the user can set which repo to search.
        // repos.add(new Repos.Repo());
        repos.add(new Repos.Repo({user: "adobe", repo: "brackets"}));
        repos.add(new Repos.Repo({user: "adobe", repo: "brackets-shell"}));        
        
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
