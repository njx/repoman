/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global define: false, $: false, Handlebars: false, GithubService: false */

$(document).ready(function () {
    'use strict';
    
    var issuesTemplate = Handlebars.compile($("#t-issues-summary").html());
    
    $("#login-form").submit(function (event) {
        event.preventDefault();
        
        GithubService.setUserInfo($("#login-username").val(), $("#login-password").val());
        $("#login-page").hide(250);
        $("#issues-page").show(250);
        GithubService.sendIssueRequest("adobe", "brackets")
            .done(function (response) {
                alert(JSON.stringify(response.data));
            });
    });
});