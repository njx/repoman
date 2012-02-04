/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global $: false, _: false, Handlebars: false, GithubService: false, Models: false */

$(document).ready(function () {
    'use strict';
    
    var issuesTemplate = Handlebars.compile($("#t-issues-summary").html());
    var repos = new Models.Repos();
    var issues = new Models.Issues();
    
    function refreshIssues() {
        // TODO: instead of waiting for everything to load, add headings immediately with
        // spinners, then fill as data comes in
        var promises = [];
        repos.each(function (repo) {
            promises.push(repo.fetchIssues());
        });
        $.when.apply(window, promises).then(function () {
            $("#issues-page").empty();
            var results = Array.prototype.slice.call(arguments);
            repos.each(function (repo) {
                var foundResult = _.find(results, function (result) { return result.repo === repo; });
                $("#issues-page").append(issuesTemplate(
                    {
                        repo: repo.getFullName(),
                        issues: (foundResult ? foundResult.issues.toJSON() : [])
                    }
                ));
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
            $(".page-header").css("margin-top", "10px");
            $("#login-page").fadeOut(250);
            $("#issues-page").fadeIn(250);
            refreshIssues();
        });
        
        repos.on("all", function () {
            refreshIssues();
        });
        
        $("#login-username").focus();
    }
    
    init();
});
