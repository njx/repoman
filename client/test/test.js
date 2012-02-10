/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global test: false, ok: false, Models: false, Queries: false */

(function () {
    "use strict";

    var issue = new Models.Issue({
        "labels": [
            {
                "url": "https://api.github.com/repos/sample/myapp/labels/medium+priority",
                "color": "d7e102",
                "name": "medium priority"
            },
            {
                "url": "https://api.github.com/repos/sample/myapp/labels/sprint+3",
                "color": "0b02e1",
                "name": "sprint 3"
            },
            {
                "url": "https://api.github.com/repos/sample/myapp/labels/John+Doe",
                "color": "800080",
                "name": "John Doe"
            }
        ],
        "number": 210,
        "url": "https://api.github.com/repos/sample/myapp/issues/210",
        "body": "1) Create a directory \"testdir\" containing the file \"foo.txt\"\r\n2) Launch the app, click the Open button, and choose \"testdir\"\r\n3) In the app, edit the bar.txt file. \r\n4) Using Explorer/Finder, delete bar.txt\r\n5) return to app\r\n6) Choose \"keep changes in Editor\" when prompted about external edits\r\n7) Choose File > Save\r\n\r\nResult:\r\nError dialog: \"Error saving file\". There is no \"save as\", so it's not easy to retain the file edits\r\n\r\nExpected:\r\nSave should create a new file with the same name and location of the deleted file. ",
        "milestone": null,
        "html_url": "https://github.com/repos/sample/issues/210",
        "updated_at": "2012-02-07T06:23:49Z",
        "comments": 2,
        "state": "open",
        "closed_at": null,
        "user": {
            "url": "https://api.github.com/users/johndoe",
            "gravatar_id": "123abcd",
            "avatar_url": "https://secure.gravatar.com/avatar/123abcd?d=https://a248.e.akamai.net/assets.github.com%2Fimages%2Fgravatars%2Fgravatar-140.png",
            "login": "johndoe",
            "id": 1184639
        },
        "pull_request": {
            "diff_url": null,
            "html_url": null,
            "patch_url": null
        },
        "assignee": null,
        "title": "Error when trying to save dirty file after it has been deleted on disk",
        "id": 3116520,
        "created_at": "2012-02-06T23:48:34Z"
    });
    
    // TODO: Rewrite all queries to be models with attributes and submodels
    
    test("simple property query", function () {
        var query = new Queries.Query({
            type: "is",
            property: "state",
            value: "open"
        });
        ok(query.matches(issue), "state == open matches");
    });
    
    test("negated query", function () {
        var query = new Queries.Query({
            negated: true,
            type: "is",
            property: "state",
            value: "open"
        });
        ok(!query.matches(issue), "state != open does not match");
        
        query.set("value", "closed");
        ok(query.matches(issue), "state != closed does match");
    });
    
    test("dot property query", function () {
        var query = new Queries.Query({
            type: "is",
            property: "user.login",
            value: "johndoe"
        });
        ok(query.matches(issue), "user.login == johndoe matches");
    });
    
    test("and query", function () {
        var query = new Queries.Query({
            type: "and",
            children: new Queries.Queries([
                new Queries.Query({
                    type: "is",
                    property: "state",
                    value: "open"
                }),
                new Queries.Query({
                    type: "is",
                    property: "user.login",
                    value: "johndoe"
                })
            ])
        });
        ok(query.matches(issue), "state == open && user.login == johndoe");
        
        query.get("children").at(1).set("negated", true);
        query.get("children").at(1).set("value", "janesmith");
        ok(query.matches(issue), "state == open && user.login != janesmith");
    });
    
    test("or query", function () {
        var query = new Queries.Query({
            type: "or",
            children: new Queries.Queries([
                new Queries.Query({
                    type: "is",
                    property: "state",
                    value: "open"
                }),
                new Queries.Query({
                    type: "is",
                    property: "user.login",
                    value: "janesmith"
                })
            ])
        });
        ok(query.matches(issue), "state == open || user.login == janesmith");
        
        query.get("children").at(0).set("value", "closed");
        ok(!query.matches(issue), "state == closed || user.login == janesmith does not match");
    });
    
    test("contains query", function () {
        var query = new Queries.Query({
            type: "contains",
            property: "labels",
            matchProperty: "name",
            value: "medium priority"
        });
        ok(query.matches(issue), "contains label with name == medium priority");
        
        query.set("value", "high priority");
        ok(!query.matches(issue), "does not contain label with name == high priority");
    });
    
    test("regexp query", function () {
        var query = new Queries.Query({
            type: "is",
            property: "body",
            value: "containing.*file",
            isRegexp: true
        });
        ok(query.matches(issue), "body matches containing.*file");
        
        query.set("value", "argle.*bargle");
        ok(!query.matches(issue), "body does not match argle.*bargle");
    });
    
    /*
    var sampleQuery = {
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
                type: "is",
                property: "body",
                value: "containing.*file",
                isRegexp: true
            }
        ]
    };
    */
}());
