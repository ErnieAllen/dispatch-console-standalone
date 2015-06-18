# dispatch-standalone
Monitor qpid dispatch router using http (does not require a web server that supports java .war files)

It does however require a web server. Create a dispatch/ directory under your web server's webapps/ directory and copy all the files there. Then load the dispatch/index.html file in a browser.

To install this on a clean system:
- install qpid-proton with javascript bindings (1)
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
(1) To install the javascript bindings with proton you can either build them with proton or just expand the pre-built node_modules.tar.gz into the rh-qpid-proton/examples/javascript/messenger dir.
If you choose to build them with proton, you'll need to install emscripten before you run cmake for proton.

To start a network of routers, unzip the config_6.tar.gz from the git repository. Modify the ./startall script to point to your dispatch router build. Run startall

To start the node.js proxy:
cd ~/rh-qpid-proton/examples/javascript/messenger
node proxy.js &
This will start the proxy listening to ws traffic on port 5673 and translating it to tcp on port 5672. The QDR.X router is listening on port 5672.

To connect to the dispatch router network from the web console:
- In a browser navigate to http://localhost:8080/dispatch/
- On the connect page, the address should be the address of machine that the node.js proxy is running on. The port is 5673.


