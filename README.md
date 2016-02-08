# dispatch-standalone
Monitor qpid dispatch router using http (does not require a web server that supports java .war files)

It does however require a web server. Create a dispatch/ directory under your web server's webapps/ directory and copy all the files there. Then load the dispatch/index.html file in a browser.

To install the web console:
- install and setup apache tomcat
- under apache tomcat directory create a webapps dir if it doesn't already exist
- under the the webapps dir, create a dispatch dir
- copy contents of the github repository's dispatch dir to dispatch/*

To run the web console:
- start apache tomcat web server
- in a browser, navigate to http://<host>:8080/dispatch/
- connect to a websockets proxy
