# dispatch-standalone
Monitor qpid dispatch router using http (does not require a web server that supports java .war files)

It does however require a web server. Create a dispatch/ directory under your web server's webapps/ directory and copy all the files there. Then load the dispatch/index.html file in a browser.

To install this on a clean system:
- install qpid-proton with javascript bindings
- install qpid-dispatch
- install node.js
- start a network of dispatch routers
- start a node.js proxy

On the system that hosts the web console:
- install and setup apache tomcat
- under apache tomcat directory create a webapps dir if it doesn't already exist
- under the the webapps dir, create a dispatch dir
- copy contents of github repository dispatch dir to dispatch/*

To run the web console:
- start apache tomcat web server
- in a browser, navigate to http://localhost:8080/dispatch/
- connect to node.js proxy

Notes:
To install the javascript bindings with proton you can either build them with proton or just copy 