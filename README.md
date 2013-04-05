A better interface to github issues.

To run the server, you will need to generate a self-signed certificate and
private key. Info on how to do so is here:

http://www.akadia.com/services/ssh_test_certificate.html

Create a "keys" folder next to index.js, and name the files:
    server-cert.pem -- certificate
    server-key.pem -- private key (unencrypted)

You'll also need to install [Node](http://nodejs.org).

Once that's done, just cd into the repoman root folder and do `node index.js`, then hit 
https://localhost:8080/ from a web browser.

By default, the GitHub API rate limit for unauthenticated requests is 60 per hour. If
you want to use the higher 5000-per-hour rate limit, register an OAuth app with GitHub,
and create a "config.json" file next to index.js that contains your app's client_id 
and client_secret.

The config.json API may also contain:
* hostname - name of the host we're running on
* securePort - port to listen on for https
* redirectPort - http port to redirect to securePort from