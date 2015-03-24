/**
 * @module QDR
 */
var QDR = (function (QDR) {

  /**
   * @method SettingsController
   * @param $scope
   * @param QDRServer
   *
   * Controller that handles the QDR settings page
   */

  /**
   * @function NavBarController
   *
   * @param $scope
   * @param workspace
   *
   * The controller for this plugin's navigation bar
   *
   */
   
   QDR.TopoTabsController = function($scope, QDRService, $location) {
   
   		QDR.log.debug("started QDR.TopoTabsController with location: " + $location.url());
   
   		$scope.states = [
   			{
                   content: '<i class="icon-comments"></i> General',
                   title: "General router stats",
                   name: 'general',
                   isValid: function (QDRService) { return true; } //QDRService.isConnected(); }
   			},
   			{
   				content: '<i class="icon-cogs"></i> Connections',
   				title: "Router connections",
   				description: "Show the connections for the highlighted router",
                   name: 'connections',
   				isValid: function (QDRService) { return true; }
   			},
   			{
   				content: '<i class="icon-star-empty"></i> Nodes',
   				title: "Router nodex",
   				description: "Show the nodes for the highlighted router",
                   name: 'nodes',
   				isValid: function (QDRService) { return true; }
   			  }
   		];
           $scope.currentTab = $scope.states[0].name;
   
   		$scope.isValid = function(whichTab) {
   		  return whichTab.isValid(QDRService);
   		};
   
   		$scope.isActive = function(whichTab) {
               return whichTab.name === $scope.currentTab;
   		};
   		
   		$scope.setActive = function(whichTab) {
   		    $scope.currentTab = whichTab.name;
   		};
   };
     	
     	
    QDR.currentAttributes = [];
    QDR.connAttributes = [];
    QDR.topoForm = "general";

	QDR.TopologyFormController = function($scope, localStorage, $location) {
		QDR.log.debug("started QDR.TopologyFormController with location: " + $location.url());

        $scope.attributes = QDR.currentAttributes;
        $scope.connAttributes = QDR.connAttributes;

        var generalCellTemplate = '<div class="ngCellText"><span title="{{row.entity.description}}">{{row.entity.attributeName}}</span></div>';
        
		$scope.update = function () {
		};
		$scope.isGeneral = function () {
    	    return QDR.topoForm == 'general';
		};
		$scope.isConnections = function () {
    	    return QDR.topoForm == 'connections';
		};

        $scope.topoGridOptions = {
            selectedItems: [],
            data: 'attributes',
            displayFooter: true,
            displaySelectionCheckbox: false,
            canSelectRows: false,
            enableSorting: false,
            showSelectionCheckbox: false,
            enableRowClickSelection: false,
            multiSelect: false,
            sortInfo: {
              sortBy: 'nothing!!!',
              ascending: true
            },
            columnDefs: [
            {
                field: 'attributeName',
                displayName: 'Attribute',
                cellTemplate: generalCellTemplate
            },
            {
                field: 'attributeValue',
                displayName: 'Value'
            }
            ]
        };
        $scope.topoConnOptions = angular.copy($scope.topoGridOptions);
        $scope.topoConnOptions.data = 'connAttributes';
	};

    QDR.TopologyController = function($scope, $rootScope, QDRService, localStorage, $location) {

		QDR.log.debug("started QDR.TopologyController with location: " + $location.url());
        $scope.schema = "Not connected";

		$scope.update = function () {
			//QDR.log.debug("topology controller update called for scope variable");
		};

		// set up SVG for D3
	    var width, height;
	    var tpdiv = $('#topology');
	    var colors = {'inter-router': "#EAEAEA", 'normal': "#F0F000", 'on-demand': '#00F000'};
	    var gap = 5;
	    var radii = {'inter-router': 25, 'normal': 15, 'on-demand': 15};
	    var radius = 25;
	    var radiusNormal = 15;
	    width = tpdiv.width() - gap;
	    height = $(document).height() - gap;

	    var svg;
		var force;
		var animate = false; // should the force graph organize itself when it is displayed
		var path;
		var savedKeys = [];
	    // mouse event vars
	    var selected_node = null,
	        selected_link = null,
	        mousedown_link = null,
	        mousedown_node = null,
	        mouseup_node = null;

	    // set up initial nodes and links
	    //  - nodes are known by 'id', not by index in array.
	    //  - reflexive edges are indicated on the node (as a bold black circle).
	    //  - links are always source < target; edge directions are set by 'left' and 'right'.
		var nodes = [];
		var links = [];

		var aNode = function (id, name, nodeType, nodeIndex, x, y, resultIndex) {
			return {   key: id,
				name: name,
				nodeType: nodeType,
				reflexive: false,
				x: x,
				y: y,
				id: nodeIndex,
				resultIndex: resultIndex
			};
		};


        var initForm = function (attributes, results, entityType, formFields) {
        
            while(formFields.length > 0) {
                // remove all existing attributes
                    formFields.pop();
            }

            for (var i=0; i<attributes.length; ++i) {
                var name = attributes[i];
                var val = results[i];
                var desc = "";
                if (entityType.attributes[name])
                    if (entityType.attributes[name].description)
                        desc = entityType.attributes[name].description;

                formFields.push({'attributeName': name, 'attributeValue': val, 'description': desc});
            }
        }

		var initForceGraph = function () {
            QDR.log.debug("initForceGraph called");
			nodes = [];
			links = [];

			svg = d3.select('#topology')
				.append('svg')
				.attr("id", "SVG_ID")
				.attr('width', width)
				.attr('height', height);
			// mouse event vars
			selected_node = null;
			selected_link = null;
			mousedown_link = null;
			mousedown_node = null;
			mouseup_node = null;

			// initialize the list of nodes
			var nodeIndex = 0;
			var yInit = 10;
			var nodeCount = Object.keys(QDRService.topology._nodeInfo).length;
			for (var id in QDRService.topology._nodeInfo) {
				var name = QDRService.nameFromId(id);
                // if we have any new nodes, animate the force graph to position them
				var position = angular.fromJson(localStorage[name]);
				if (!angular.isDefined(position)) {
				    animate = true;
				    position = {x: width / 4 + ((width / 2)/nodeCount) * nodeIndex,
                				y: height / 2 + yInit};
				}
				nodes.push( aNode(id, name, "inter-router", nodeIndex, position.x, position.y) );
				yInit *= -1;
				QDR.log.debug("adding node " + nodeIndex);
				nodeIndex++;
			}

			// initialize the list of links
			var source = 0;
			var client = 1;
			for (var id in QDRService.topology._nodeInfo) {
				var onode = QDRService.topology._nodeInfo[id];
				var conns = onode['.connection'].results;
				var attrs = onode['.connection'].attributeNames;

				for (var j = 0; j < conns.length; j++) {
                    var role = valFor(attrs, conns[j], "role");
					if (role == "inter-router") {
						var target = getNodeIndex(conns[j][0]);
						var linkIndex = getLink(source, target);
						if (valFor(attrs, conns[j], "dir") == "out")
						    links[linkIndex].right = true;
						else
						    links[linkIndex].left = true;
					} else if (role == "normal" || role == "on-demand") {
						// not a router, but an external client
						QDR.log.debug("found an external client for " + id);
						var name = QDRService.nameFromId(id) + "." + client;
						QDR.log.debug("external client name is  " + name + " and the role is " + role);
						var parent = getNodeIndex(QDRService.nameFromId(id));
						QDR.log.debug("external client parent is " + parent);

                        // if we have any new clients, animate the force graph to position them
                        var position = angular.fromJson(localStorage[name]);
                        if (!angular.isDefined(position)) {
                            animate = true;
                            position = {x: nodes[parent].x + 40 + Math.sin(Math.PI/2 * client),
                                        y: nodes[parent].y + 40 + Math.cos(Math.PI/2 * client)};
                        }
						QDR.log.debug("adding node " + nodeIndex);
						nodes.push(	aNode(id, name, role, nodeIndex, position.x, position.y, j) );
						// nopw add a link
						QDR.log.debug("adding link between nodes " + nodeIndex + " and " + parent);
						getLink(nodeIndex, parent);

						nodeIndex++;
						client++;
					}
				}
				source++;
			}
/*
        {
            ".router": {
                "results": [
                    [4, "router/QDR.X", 1, "0", 3, 60, 60, 9, "QDR.X", 30, "interior", "org.apache.qpid.dispatch.router", 3, 8, "router/QDR.X"]
                ],
                "attributeNames": ["raIntervalFlux", "name", "helloInterval", "area", "helloMaxAge", "mobileAddrMaxAge", "remoteLsMaxAge", "addrCount", "routerId", "raInterval", "mode", "type", "nodeCount", "linkCount", "identity"]
            },
           ".connection": {
                "results": [
                    ["QDR.B", "connection/0.0.0.0:20002", "operational", "0.0.0.0:20002", "inter-router", "connection/0.0.0.0:20002", "ANONYMOUS", "org.apache.qpid.dispatch.connection", "out"],
                    ["QDR.A", "connection/0.0.0.0:20001", "operational", "0.0.0.0:20001", "inter-router", "connection/0.0.0.0:20001", "ANONYMOUS", "org.apache.qpid.dispatch.connection", "out"],
                    ["b2de2f8c-ef4a-4415-9a23-000c2f86e85d", "connection/localhost:33669", "operational", "localhost:33669", "normal", "connection/localhost:33669", "ANONYMOUS", "org.apache.qpid.dispatch.connection", "in"]
                ],
                "attributeNames": ["container", "name", "state", "host", "role", "identity", "sasl", "type", "dir"]
           },
        }
*/
            $scope.schema = QDRService.schema;
			// add a row for each attribute in .router attributeNames array
			for (var id in QDRService.topology._nodeInfo) {
				var onode = QDRService.topology._nodeInfo[id];

                initForm(onode['.connection'].attributeNames, onode['.connection'].results[0], QDRService.schema.entityTypes.connection, QDR.connAttributes);
                initForm(onode['.router'].attributeNames, onode['.router'].results[0], QDRService.schema.entityTypes.router, QDR.currentAttributes);
                
				break;
			}
			// init D3 force layout
			force = d3.layout.force()
				.nodes(nodes)
				.links(links)
				.size([width, height])
				.linkDistance(function(d) { return d.source.nodeType === 'inter-router' ? 150 : 50 })
				.charge(-1800)
				.friction(.10)
				.gravity(0.0001)
				.on('tick', tick)
				.start()

			// define arrow markers for graph links
			svg.append('svg:defs').append('svg:marker')
				.attr('id', 'end-arrow')
				.attr('viewBox', '0 -5 10 10')
				.attr('refX', 6)
				.attr('markerWidth', 3)
				.attr('markerHeight', 3)
				.attr('orient', 'auto')
				.append('svg:path')
				.attr('d', 'M 0 -5 L 10 0 L 0 5 z')
				.attr('fill', '#000');

			svg.append('svg:defs').append('svg:marker')
				.attr('id', 'start-arrow')
				.attr('viewBox', '0 -5 10 10')
				.attr('refX', 6)
				.attr('markerWidth', 3)
				.attr('markerHeight', 3)
				.attr('orient', 'auto')
				.append('svg:path')
				.attr('d', 'M 10 -5 L 0 0 L 10 5 z')
				.attr('fill', '#000');

			// handles to link and node element groups
			path = svg.append('svg:g').selectAll('path'),
			circle = svg.append('svg:g').selectAll('g');
            
			force.on('end', function() {
				QDR.log.debug("force end called");
				circle
					.attr('cx', function(d) {
						localStorage[d.name] = angular.toJson({x: d.x, y: d.y});
						return d.x; });
			});

			// app starts here
			restart(false);
    	    force.start();
		}

        // called when we mouseover a node
        // we need to update the table
		function updateNodeForm (d) {
			//QDR.log.debug("update form info for ");
			//console.dump(d);
			var onode = QDRService.topology._nodeInfo[d.key];
			if (onode) {
				var nodeResults = onode['.router'].results[0];
				var nodeAttributes = onode['.router'].attributeNames;

                //convert parallel arrays into array of objects
                //var nv = [].map.call(nodeAttributes,
                //    function (attr, idx) { return {attributeName: attr, attributeValue: nodeResults[idx]}});

                for (var i=0; i<QDR.currentAttributes.length; ++i) {
                    var idx = nodeAttributes.indexOf(QDR.currentAttributes[i].attributeName);
                    if (idx > -1) {
                        if (QDR.currentAttributes[i].attributeValue != nodeResults[idx]) {
                            // highlight the changed data
                            QDR.currentAttributes[i].attributeValue = nodeResults[idx];

                        }
                    }
                }
			}
		}

		function updateConnForm (d) {
			var onode = QDRService.topology._nodeInfo[d.key];
			if (onode) {
				var nodeResults = onode['.connection'].results[d.resultIndex];
				var nodeAttributes = onode['.connection'].attributeNames;

                for (var i=0; i<QDR.connAttributes.length; ++i) {
                    //var val = valFor(aAr, vAr, key) {

                    var idx = nodeAttributes.indexOf(QDR.connAttributes[i].attributeName);
                    if (idx > -1) {
                        if (QDR.connAttributes[i].attributeValue != nodeResults[idx]) {
                            // highlight the changed data
                            QDR.connAttributes[i].attributeValue = nodeResults[idx];

                        }
                    }
                }
			}
		}

        function getNodeIndex (_id) {
            var nodeIndex = 0;
            for (var id in QDRService.topology._nodeInfo) {
                if (id.split("/")[3] == _id) return nodeIndex;
                nodeIndex++
            }
            QDR.log.debug("unable to fine nodeIndex for " + _id);
            return 0;
        }

        function getLink (_source, _target) {
            for (var i=0; i < links.length; i++) {
                if (links[i].source == _source && links[i].target == _target) return i;
				// same link, just reversed
                if (links[i].source == _target && links[i].target == _source) {
                	links[i].source = _source;
                	links[i].target = _target;
                	var lval = links[i].left;
                	links[i].left = links[i].right;
                	links[i].right = lval;
                 	return i;
				}
            }
            var link = {
                source: _source,
                target: _target,
                left: false,
                right: false
            };
            return links.push(link) - 1;
        }


	    function resetMouseVars() {
	        mousedown_node = null;
	        mouseup_node = null;
	        mousedown_link = null;
	    }

	    // update force layout (called automatically each iteration)
	    function tick() {
	        // draw directed edges with proper padding from node centers
	        path.attr('d', function (d) {
				//QDR.log.debug("in tick for d");
				//console.dump(d);
	            var deltaX = d.target.x - d.source.x,
	                deltaY = d.target.y - d.source.y,
	                dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
	                normX = deltaX / dist,
	                normY = deltaY / dist,
	                sourcePadding = d.left ? radius + 2 + 5 : radius + 2,
	                targetPadding = d.right ? radius + 2 + 5 : radius + 2,
	                sourcePadding = 0,
	                targetPadding = 0,
	                sourceX = d.source.x + (sourcePadding * normX),
	                sourceY = d.source.y + (sourcePadding * normY),
	                targetX = d.target.x - (targetPadding * normX),
	                targetY = d.target.y - (targetPadding * normY);
	            return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
	        });

	        circle.attr('transform', function (d) {
	            return 'translate(' + d.x + ',' + d.y + ')';
	        });
	        if (!animate) {
	            animate = true;
	            force.stop();
	        }
	    }

/*
".router.node": {
    "results": [
        ["QDR.A", null],
        ["QDR.B", null],
        ["QDR.D", "QDR.A"],
        ["QDR.C", "QDR.A"],
        ["QDR.Y", "QDR.A"]
    ],
    "attributeNames": ["routerId", "nextHop"]
}
*/

        // given an attribute name array, find the value at the same index in the values array
        function valFor(aAr, vAr, key) {
            var idx = aAr.indexOf(key);
            if ((idx > -1) && (idx < vAr.length)) {
                return vAr[idx];
            }
            return null;
        }

        // highlight the paths between the selected node and the hovered node
        function findNextHopNode(from, d) {
            // d is the node that the mouse is over
            // from is the selected_node ....
            if (!from)
                return null;

            if (from == d)
                return selected_node;

            //QDR.log.debug("finding nextHop from: " + from.name + " to " + d.name);
            var sInfo = QDRService.topology._nodeInfo[from.key];

            if (!sInfo) {
                QDR.log.debug("unable to find topology node info for " + from.key);
                return null;
            }

            // find the hovered name in the selected name's .router.node results
            var aAr = sInfo['.router.node'].attributeNames;
            var vAr = sInfo['.router.node'].results;
            for (var hIdx=0; hIdx<vAr.length; ++hIdx) {
                var addrT = valFor(aAr, vAr[hIdx], "routerId" );
                if (addrT == d.name) {
                    //QDR.log.debug("found " + d.name + " at " + hIdx);
                    var nextHop = valFor(aAr, vAr[hIdx], "nextHop");
                    //QDR.log.debug("nextHop was " + nextHop);
                    return (nextHop == null) ? nodeFor(addrT) : nodeFor(nextHop);
                }
            }
            return null;
        }

        function nodeFor(name) {
            for (var i=0; i<nodes.length; ++i) {
                if (nodes[i].name == name)
                    return nodes[i];
            }
            return null;
        }

        function linkFor(source, target) {
            for (var i=0; i<links.length; ++i) {
                if ((links[i].source == source) && (links[i].target == target))
                    return links[i];
                if ((links[i].source == target) && (links[i].target == source))
                    return links[i];
            }
            QDR.log.debug("failed to find a link between ");
            console.dump(source);
            QDR.log.debug(" and ");
            console.dump(target);
            return null;
        }
	    // update graph (called when needed)
	    function restart(start) {
	        circle.call(force.drag);
	        svg.classed('ctrl', true);

	        // path (link) group
	        path = path.data(links);

			// update existing links
  			path.classed('selected', function(d) { return d === selected_link; })
  			    .classed('highlighted', function(d) { return d.highlighted; } )
    			.attr('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
    			.attr('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; });

			// add new links
			path.enter().append('svg:path')
				.attr('class', 'link')
				.classed('selected', function(d) { return d === selected_link; })
				.attr('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
				.attr('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; })
				.on('mousedown', function(d) {
				  if(d3.event.ctrlKey) return;

				  // select link
				  mousedown_link = d;
				  if(mousedown_link === selected_link) 
				    selected_link = null;
				  else 
				    selected_link = mousedown_link;
				  selected_node = null;
				  mousedown_node = null;
				  restart();
				});

	        // remove old links
	        path.exit().remove();


	        // circle (node) group
	        // NB: the function arg is crucial here! nodes are known by id, not by index!
	        circle = circle.data(nodes, function (d) {
	            return d.id;
	        });

	        // update existing nodes (reflexive & selected visual states)
	        circle.selectAll('circle')
	            .style('fill', function (d) {
	            	sColor = colors[d.nodeType];
	            return (d === selected_node) ? d3.rgb(sColor).brighter().toString() : d3.rgb(sColor);
	        })
	            .classed('reflexive', function (d) {
	            return d.reflexive;
	        });

	        // add new nodes
	        var g = circle.enter().append('svg:g');

	        g.append('svg:circle')
	            .attr('class', 'node')
	            .attr('r', function (d) {
	            	return radii[d.nodeType];
	            })
	            .style('fill', function (d) {
	                sColor = colors[d.nodeType];
	                return (d === selected_node) ? d3.rgb(sColor).brighter().toString() : d3.rgb(sColor);
	            })
	            .style('stroke', function (d) {
	                sColor = colors[d.nodeType];
	                return d3.rgb(sColor).darker().toString();
	            })
	            .classed('reflexive', function (d) {
	            return d.reflexive;
	            })
	            .on('mouseover', function (d) {
                    if (d.nodeType === 'inter-router') {
				        //QDR.log.debug("showing general form");
                        QDR.topoForm = "general";
				        updateNodeForm(d);
				    } else if (d.nodeType === 'normal' || d.nodeType === 'on-demand') {
				        //QDR.log.debug("showing connections form");
                        QDR.topoForm = "connections";
                        updateConnForm(d);
				    }
				    $scope.$apply();
				        
	                if (d === mousedown_node) 
	                    return;
	                if (d === selected_node) 
	                    return;
	                if (!selected_node) {
	                    return;
	                }
	                // enlarge target node
	                d3.select(this).attr('transform', 'scale(1.1)');
                    // highlight the next-hop route from the selected node to this node
                    mousedown_node = null;
                    setTimeout(nextHop, 1, selected_node, d);
	            })
	            .on('mouseout', function (d) {
	                //if (!mousedown_node || d === mousedown_node) return;
	                // unenlarge target node
	                d3.select(this).attr('transform', '');
                    for (var i=0; i<links.length; ++i) {
                        links[i]['highlighted'] = false;
                    }
                    //QDR.topoForm = "";
			        $scope.$apply();
                    restart();
	            })
	            .on('mousedown', function (d) {
	                if (d3.event.ctrlKey)
	                    return;
				    //QDR.log.debug("onmouse down past ctrlKey");
	                // select node
	                mousedown_node = d;
	                if (mousedown_node === selected_node)
	                    selected_node = null;
	                else
	                    selected_node = mousedown_node;
	                selected_link = null;
                    for (var i=0; i<links.length; ++i) {
                        links[i]['highlighted'] = false;
                    }
	                restart(false);
	            })
	            .on('mouseup', function (d) {
	                if (!mousedown_node)
	                    return;
	                // check for drag-to-self
	                mouseup_node = d;
	                if (mouseup_node === mousedown_node) {
	                    resetMouseVars();
	                    return;
	                }
	                mousedown_node = null;

	                // unenlarge target node
	                d3.select(this).attr('transform', '');
	            });

	        // show node IDs
	        g.append('svg:text')
	            .attr('x', 0)
	            .attr('y', 4)
	            .attr('class', 'id')
	            .text(function (d) {
	            return (d.nodeType === 'normal' || d.nodeType == 'on-demand') ? d.name.slice(-1) : d.name;
	        });

	        // remove old nodes
	        circle.exit().remove();

	        if (!mousedown_node || !selected_node)
	            return;

            if (!start)
                return;
	        // set the graph in motion
	        //QDR.log.debug("mousedown_node is " + mousedown_node);
	        force.start();

	    }

        function nextHop(thisNode, d) {
            if ((thisNode) && (thisNode != d)) {
                var target = findNextHopNode(thisNode, d);
                //QDR.log.debug("highlight link from node ");
                 //console.dump(nodeFor(selected_node.name));
                 //console.dump(target);
                if (target) {
                    var hlLink = linkFor(nodeFor(thisNode.name), target);
                    //QDR.log.debug("need to highlight");
                    //console.dump(hlLink);
                    if (hlLink)
                        hlLink['highlighted'] = true;
                    else
                        target = null;
                }
                setTimeout(nextHop, 1, target, d);
            }
            restart();
        }


	    function mousedown() {
	        // prevent I-bar on drag
	        //d3.event.preventDefault();

	        // because :active only works in WebKit?
	        svg.classed('active', true);
	    }

	    function mousemove() {
	        if (!mousedown_node) return;

	        restart();
	    }

	    function mouseup() {
	        // because :active only works in WebKit?
	        svg.classed('active', false);

	        // clear mouse event vars
	        resetMouseVars();
	    }

        QDRService.addUpdatedAction("topology", function() {
            //QDR.log.debug("Topology controller was notified that the model was updated");
            if (hasChanged()) {
                QDR.log.info("svg graph changed")
                saveChanged();
                // TODO: update graph nodes instead of rebuilding entire graph
                d3.select("#SVG_ID").remove();
                animate = true;
                initForceGraph();
                if ($location.path().startsWith("/topology"))
                    Core.notification('info', "Qpid dispatch router topology changed");

            } else {
                //QDR.log.debug("no changes")
            }
        });

		function hasChanged () {
			if (Object.keys(QDRService.topology._nodeInfo).length != savedKeys.length)
				return true;
			for (var key in QDRService.topology._nodeInfo) {
				if (savedKeys.indexOf(key) == -1) {
					//QDR.log.debug("could not find " + key + " in ");
					//console.dump(savedKeys);
					return true;
				}
			}
			return false;
		};
		function saveChanged () {
			savedKeys = Object.keys(QDRService.topology._nodeInfo);
			QDR.log.debug("saving current keys");
			console.dump(savedKeys);
		};
		// we are about to leave the page, save the node positions
		$rootScope.$on('$locationChangeStart', function(event, newUrl, oldUrl) {
			QDR.log.debug("locationChangeStart");
			nodes.forEach( function (d) {
	           localStorage[d.name] = angular.toJson({x: d.x, y: d.y});
			});

		});
		// When the DOM element is removed from the page,
        // AngularJS will trigger the $destroy event on
        // the scope
        $scope.$on("$destroy", function( event ) {
   			QDR.log.debug("scope on destroy");
            QDRService.delUpdatedAction("topology");
			d3.select("#SVG_ID").remove();
        });
        
		initForceGraph();
		saveChanged();

  };

  return QDR;
}(QDR || {}));
