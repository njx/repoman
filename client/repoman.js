/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global $: false, _: false, Spinner: false, Handlebars: false, GithubService: false, Models: false, Queries: false */

$(document).ready(function () {
    "use strict";
    
    var issuesTemplate = Handlebars.compile($("#t-issues-summary").html());
    var repos = new Models.Repos();
//    var query = new Queries.Query({
//        type: "is",
//        property: "state",
//        value: "open"
//    });
    var query = new Queries.Query({
        type: "and",
        children: new Queries.Queries([
            new Queries.Query({
                type: "is",
                property: "state",
                value: "open"
            }),
            new Queries.Query({
                type: "incomplete"
            })
        ])
    });
    
    // TODO: factor into IssuesView module
    function refreshIssues() {
        // TODO: instead of waiting for everything to load, add headings immediately with
        // spinners, then fill as data comes in
        $("#spinner").show();
        var spinner = new Spinner({color: "#fff", width: 4}).spin($("#spinner").get(0));
        var promises = [];
        repos.each(function (repo) {
            promises.push(repo.fetchIssues());
        });
        $.when.apply(window, promises).then(function () {
            spinner.stop();
            $("#spinner").hide();
            $("#issues-container").empty();
            var results = Array.prototype.slice.call(arguments);
            repos.each(function (repo) {
                var foundResult = _.find(results, function (result) { return result.repo === repo; });
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
                            issues: _.map(issues, function (issue) { return issue.toJSON(); }),
                            numIssues: issues.length
                        }
                    ));
                }
            });
        });
    }
    
    function init() {
        repos.add(new Models.Repo({user: "adobe", repo: "brackets"}));
        repos.add(new Models.Repo({user: "adobe", repo: "brackets-app"}));
        repos.add(new Models.Repo({user: "adobe", repo: "CodeMirror2"}));
        
        $("#login-form").submit(function (event) {
            event.preventDefault();
            
            GithubService.setUserInfo($("#login-username").val(), $("#login-password").val());
            $(".container").css({
                "margin-top": "10px",
                "min-height": "100%"
            });
            $("#login-page").hide();
            $("#issues-page").show();

            $("#query-view").append(new Queries.QueryView({model: query}).render().el);
            Queries.FocusManager.refreshFocus();
            query.on("all", function () {
                refreshIssues();
            });
        
            repos.on("all", function () {
                refreshIssues();
            });
            
            refreshIssues();
        });
        
        $("#login-username").focus();
    }
    
    init();
});
