/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global require: true */

(function () {
    "use strict";
        
    var https = require("https"),
        http = require("http"),
        fs = require("fs"),
        mime = require("mime"),
        url = require("url");
    
    var serverOptions = {
        key: fs.readFileSync("keys/server-key.pem"),
        cert: fs.readFileSync("keys/server-cert.pem")
    };
    
    var GITHUB_API = "api.github.com";
    
    var config;
    
    if (fs.existsSync("config.json")) {
        config = JSON.parse(fs.readFileSync("config.json"));
    }
    
    config.hostname = config.hostname || "localhost";
    
    function handleReq(request, response) {
        var matches = /^\/api(\/.*)$/.exec(request.url);
        if (matches && matches[1]) {
            request.headers.host = GITHUB_API;
            request.headers.accept = "application/vnd.github.v3+json";
            var reqOptions = {
                host: GITHUB_API,
                path: matches[1],
                headers: request.headers
            };
            if (config) {
                reqOptions.path += (reqOptions.path.indexOf("?") === -1 ? "?" : "&") +
                    "client_id=" + config.client_id +
                    "&client_secret=" + config.client_secret;
            }
            var proxy_request = https.request(reqOptions);
            proxy_request.addListener('response', function (proxy_response) {
                proxy_response.addListener('data', function (chunk) {
                    response.write(chunk, 'binary');
                });
                proxy_response.addListener('end', function () {
                    response.end();
                });
                response.writeHead(proxy_response.statusCode, proxy_response.headers);
            });
            request.addListener('data', function (chunk) {
                proxy_request.write(chunk, 'binary');
            });
            request.addListener('end', function () {
                proxy_request.end();
            });
        } else {
            var pathname = url.parse(request.url).pathname;
            if (pathname === "/") {
                pathname = "/index.html";
            }
            pathname = "client" + pathname;

            var content;
            try {
                content = fs.readFileSync(pathname);
            } catch (e) {
                response.writeHead(404);
                response.end();
            }

            if (content !== undefined) {
                response.writeHead(200, {"Content-Type": mime.lookup(pathname)});
                response.write(content);
                response.end();
            }
        }
    }
    
    if (config.securePort) {
        console.log("listening on https://" + config.hostname + ":" + config.securePort);
        https.createServer(serverOptions, handleReq).listen(config.securePort);
    
        // Redirect HTTP to HTTPS
        http.createServer(function (req, res) {
            res.writeHead(301, {
                'Content-Type': 'text/plain',
                'Location': 'https://' + config.hostname + req.url
            });
            res.end('Redirecting to SSL\n');
        }).listen(config.insecurePort);
    } else {
        console.log("listening on http://" + config.hostname + ":" + config.insecurePort);
        http.createServer(handleReq).listen(config.insecurePort);
    }

}());