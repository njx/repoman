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