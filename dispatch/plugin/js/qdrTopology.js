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
    QDR.topoFormSelected = "";

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

        $scope.isSelected = function () {
            return (QDR.topoFormSelected != "");
        }

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

		QDR.log.debug("started QDR.TopologyController with location.url: " + $location.url());
		QDR.log.debug("started QDR.TopologyController with window.location.pathname : " + window.location.pathname);
		var urlPrefix = window.location.pathname;
        $scope.schema = "Not connected";

		$scope.update = function () {
			//QDR.log.debug("topology controller update called for scope variable");
		};
		$scope.ology = "topo";

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
		var savedKeys = {};
	    // mouse event vars
	    var selected_node = null,
	        selected_link = null,
	        mousedown_link = null,
	        mousedown_node = null,
	        mouseup_node = null;

	    // set up initial nodes and links
	    //  - nodes are known by 'id', not by index in array.
	    //  - selected edges are indicated on the node (as a bold red circle).
	    //  - links are always source < target; edge directions are set by 'left' and 'right'.
		var nodes = [];
		var links = [];

		var aNode = function (id, name, nodeType, nodeIndex, x, y, resultIndex) {
			return {   key: id,
				name: name,
				nodeType: nodeType,
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
                var linkReslts = onode['.router.link'].results;
                var linkAttrs = onode['.router.link'].attributeNames;

				for (var j = 0; j < conns.length; j++) {
                    var role = QDRService.valFor(attrs, conns[j], "role");
                    var dir = QDRService.valFor(attrs, conns[j], "dir");
					if (role == "inter-router") {
						var connId = QDRService.valFor(attrs, conns[j], "container");
						var target = getNodeIndex(connId);
						if (target == -1) {
							var roleIndex = attrs.indexOf("role");
							conns[j][roleIndex] = "normal";
							j--;	// do over
							continue;
						}
						getLink(source, target, dir);
					} else if (role == "normal" || role == "on-demand") {
						// not a router, but an external client
						//QDR.log.debug("found an external client for " + id);
						var name = QDRService.nameFromId(id) + "." + client;
						//QDR.log.debug("external client name is  " + name + " and the role is " + role);
						var parent = getNodeIndex(QDRService.nameFromId(id));
						//QDR.log.debug("external client parent is " + parent);

                        // if we have any new clients, animate the force graph to position them
                        var position = angular.fromJson(localStorage[name]);
                        if (!angular.isDefined(position)) {
                            animate = true;
                            position = {x: nodes[parent].x + 40 + Math.sin(Math.PI/2 * client),
                                        y: nodes[parent].y + 40 + Math.cos(Math.PI/2 * client)};
                        }
						//QDR.log.debug("adding node " + nodeIndex);
						nodes.push(	aNode(id, name, role, nodeIndex, position.x, position.y, j) );
						// now add a link
						getLink(parent, nodeIndex, dir);
						nodeIndex++;
						client++;
					}
				}
				source++;
			}
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
				.linkDistance(function(d) { return d.target.nodeType === 'inter-router' ? 150 : 65 })
				.charge(-1800)
				.friction(.10)
				.gravity(0.0001)
				.on('tick', tick)
				.start()

			svg.append("svg:defs").selectAll('marker')
				.data(["end-arrow"])      // Different link/path types can be defined here
				.enter().append("svg:marker")    // This section adds in the arrows
				.attr("id", String)
				.attr("viewBox", "0 -5 10 10")
				//.attr("refX", 25)
				.attr("markerWidth", 4)
				.attr("markerHeight", 4)
				.attr("orient", "auto")
				.append("svg:path")
				.attr('d', 'M 0 -5 L 10 0 L 0 5 z')

			svg.append("svg:defs").selectAll('marker')
				.data(["start-arrow"])      // Different link/path types can be defined here
				.enter().append("svg:marker")    // This section adds in the arrows
				.attr("id", String)
				.attr("viewBox", "0 -5 10 10")
				.attr("refX", 5)
				.attr("markerWidth", 4)
				.attr("markerHeight", 4)
				.attr("orient", "auto")
				.append("svg:path")
				.attr('d', 'M 10 -5 L 0 0 L 10 5 z');

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

        var initGlobe = function () {
			d3.select(window)
				.on("mousemove", mousemove)
				.on("mouseup", mouseup);

			var width = 960,
				height = 500;

			var proj = d3.geo.orthographic()
				.scale(220)
				.translate([width / 2, height / 2])
				.clipAngle(90);

			var path = d3.geo.path().projection(proj).pointRadius(1.5);

			var links = [],
				arcLines = [];

			var graticule = d3.geo.graticule();
			var svg = d3.select("#geology").append("svg")
						.attr("width", width)
						.attr("height", height)
						.on("mousedown", mousedown);

			queue()
				.defer(d3.json, "plugin/data/world-110m.json")
				.defer(d3.json, "plugin/data/places1.json")
				.await(ready);

			function ready(error, world, places) {
			  var ocean_fill = svg.append("defs").append("radialGradient")
					.attr("id", "ocean_fill")
					.attr("cx", "75%")
					.attr("cy", "25%");
				  ocean_fill.append("stop").attr("offset", "5%").attr("stop-color", "#fff");
				  ocean_fill.append("stop").attr("offset", "100%").attr("stop-color", "#eef");

			  var globe_highlight = svg.append("defs").append("radialGradient")
					.attr("id", "globe_highlight")
					.attr("cx", "75%")
					.attr("cy", "25%");
				  globe_highlight.append("stop")
					.attr("offset", "5%").attr("stop-color", "#ffd")
					.attr("stop-opacity","0.6");
				  globe_highlight.append("stop")
					.attr("offset", "100%").attr("stop-color", "#ba9")
					.attr("stop-opacity","0.1");

			  var globe_shading = svg.append("defs").append("radialGradient")
					.attr("id", "globe_shading")
					.attr("cx", "55%")
					.attr("cy", "45%");
				  globe_shading.append("stop")
					.attr("offset","30%").attr("stop-color", "#fff")
					.attr("stop-opacity","0")
				  globe_shading.append("stop")
					.attr("offset","100%").attr("stop-color", "#505962")
					.attr("stop-opacity","0.2")

			  var drop_shadow = svg.append("defs").append("radialGradient")
					.attr("id", "drop_shadow")
					.attr("cx", "50%")
					.attr("cy", "50%");
				  drop_shadow.append("stop")
					.attr("offset","20%").attr("stop-color", "#000")
					.attr("stop-opacity",".5")
				  drop_shadow.append("stop")
					.attr("offset","100%").attr("stop-color", "#000")
					.attr("stop-opacity","0")

			  svg.append("ellipse")
				.attr("cx", 440).attr("cy", 450)
				.attr("rx", proj.scale()*.90)
				.attr("ry", proj.scale()*.25)
				.attr("class", "noclicks")
				.style("fill", "url("+urlPrefix+"#drop_shadow)");

			  svg.append("circle")
				.attr("cx", width / 2).attr("cy", height / 2)
				.attr("r", proj.scale())
				.attr("class", "noclicks")
				.style("fill", "url("+urlPrefix+"#ocean_fill)");

			  svg.append("path")
				.datum(topojson.object(world, world.objects.land))
				.attr("class", "land noclicks")
				.attr("d", path);

			  svg.append("path")
				.datum(graticule)
				.attr("class", "graticule noclicks")
				.attr("d", path);

			  svg.append("circle")
				.attr("cx", width / 2).attr("cy", height / 2)
				.attr("r", proj.scale())
				.attr("class","noclicks")
				.style("fill", "url("+urlPrefix+"#globe_highlight)");

			  svg.append("circle")
				.attr("cx", width / 2).attr("cy", height / 2)
				.attr("r", proj.scale())
				.attr("class","noclicks")
				.style("fill", "url("+urlPrefix+"#globe_shading)");

			  svg.append("g").attr("class","points")
				  .selectAll("text").data(places.features)
				.enter().append("path")
				  .attr("class", "point")
				  .attr("d", path);

				svg.append("g").attr("class","labels")
					.selectAll("text").data(places.features)
				  .enter().append("text")
				  .attr("class", "label")
				  .text(function(d) { return d.properties.NAME })

				position_labels();

			  // spawn links between cities as source/target coord pairs
			  places.features.forEach(function(a, i) {
				places.features.forEach(function(b, j) {
				  if (j > i) {	// avoid duplicates
					links.push({
					  source: a.geometry.coordinates,
					  target: b.geometry.coordinates
					});
				  }
				});
			  });

			  // build geoJSON features from links array
			  links.forEach(function(e,i,a) {
				var feature =   { "type": "Feature", "geometry": { "type": "LineString", "coordinates": [e.source,e.target] }}
				arcLines.push(feature)
			  })

			  svg.append("g").attr("class","arcs")
				.selectAll("path").data(arcLines)
				.enter().append("path")
				  .attr("class","arc")
				  .attr("d",path)
			  refresh();
			}

			function position_labels() {
			  var centerPos = proj.invert([width/2,height/2]);

			  var arc = d3.geo.greatArc();

			  svg.selectAll(".label")
				.attr("transform", function(d) {
				  var loc = proj(d.geometry.coordinates),
					x = loc[0],
					y = loc[1];
				  var offset = x < width/2 ? -5 : 5;
				  return "translate(" + (x+offset) + "," + (y-2) + ")"
				})
				.style("display",function(d) {
				  var d = arc.distance({source: d.geometry.coordinates, target: centerPos});
				  return (d > 1.57) ? 'none' : 'inline';
				})

			}

			function refresh() {
			  svg.selectAll(".land").attr("d", path);
			  svg.selectAll(".point").attr("d", path);
			  svg.selectAll(".graticule").attr("d", path);
			  svg.selectAll(".arc").attr("d", path);
			  position_labels();
			}

			// modified from http://bl.ocks.org/1392560
			var m0, o0;
			o0 = angular.fromJson(localStorage["QDR.rotate"]);
			if (o0)
				proj.rotate(o0);

			function mousedown() {
			  m0 = [d3.event.pageX, d3.event.pageY];
			  o0 = proj.rotate();
			  d3.event.preventDefault();
			}
			function mousemove() {
			  if (m0) {
				var m1 = [d3.event.pageX, d3.event.pageY]
				  , o1 = [o0[0] + (m1[0] - m0[0]) / 6, o0[1] + (m0[1] - m1[1]) / 6];
				o1[1] = o1[1] > 30  ? 30  :
						o1[1] < -30 ? -30 :
						o1[1];
				proj.rotate(o1);
				refresh();
			  }
			}
			function mouseup() {
			  if (m0) {
				mousemove();
				m0 = null;
				localStorage["QDR.rotate"] = angular.toJson(proj.rotate());
			  }
			}
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
            QDR.topoForm = "general";
            $scope.$apply();
		}

		function updateConnForm (d, resultIndex) {
			var onode = QDRService.topology._nodeInfo[d.key];
			if (onode) {
				var nodeResults = onode['.connection'].results[resultIndex];
				var nodeAttributes = onode['.connection'].attributeNames;

                for (var i=0; i<QDR.connAttributes.length; ++i) {
                    var idx = nodeAttributes.indexOf(QDR.connAttributes[i].attributeName);
                    if (idx > -1) {
                    	try {
                        if (QDR.connAttributes[i].attributeValue != nodeResults[idx]) {
                            // highlight the changed data
                            QDR.connAttributes[i].attributeValue = nodeResults[idx];

                        }
                        } catch (err) {
                        }
                    }
                }
			}
             QDR.topoForm = "connections";
            $scope.$apply();
		}

        function getNodeIndex (_id) {
            var nodeIndex = 0;
            for (var id in QDRService.topology._nodeInfo) {
                if (QDRService.nameFromId(id) == _id) return nodeIndex;
                nodeIndex++
            }
            QDR.log.debug("unable to fine nodeIndex for " + _id);
            return -1;
        }

        function getLink (_source, _target, dir) {
            for (var i=0; i < links.length; i++) {
                if (links[i].source == _source && links[i].target == _target) {
                	return i;
                }
				// same link, just reversed
                if (links[i].source == _target && links[i].target == _source) {
                	return -i;
				}
            }

            QDR.log.debug("creating new link (" + (links.length) + ") between " + nodes[_source].name + " and " + nodes[_target].name);
            var link = {
                source: _source,
                target: _target,
                left: dir != "out",
                right: dir == "out"
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
	                normY = deltaY / dist;
	                var sourcePadding, targetPadding;
	                if (d.target.nodeType == "inter-router") {
						//                       right arrow  left line start
						sourcePadding = d.left ? radius + 8  : radius;
						//                      left arrow      right line start
						targetPadding = d.right ? radius + 16 : radius;
	                } else {
						sourcePadding = d.left ? radiusNormal + 18  : radiusNormal;
						targetPadding = d.right ? radiusNormal + 16 : radiusNormal;
	                }
	                var sourceX = d.source.x + (sourcePadding * normX),
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
                var addrT = QDRService.valFor(aAr, vAr[hIdx], "routerId" );
                if (addrT == d.name) {
                    //QDR.log.debug("found " + d.name + " at " + hIdx);
                    var nextHop = QDRService.valFor(aAr, vAr[hIdx], "nextHop");
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
            // the selected node was a client/broker
            //QDR.log.debug("failed to find a link between ");
            //console.dump(source);
            //QDR.log.debug(" and ");
            //console.dump(target);
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
  			    .classed('highlighted', function(d) { return d.highlighted; } );

			// add new links
			path.enter().append('svg:path')
				.attr('class', 'link')
				.attr('marker-start', function(d) { return d.left ? 'url('+urlPrefix+'#start-arrow)' : ''; })
				.attr('marker-end', function(d) { return d.right ? 'url('+urlPrefix+'#end-arrow)' : ''; })

	            .on('mouseover', function (d) {
				  if(d3.event.ctrlKey) return;
				        //QDR.log.debug("showing connections form");
					var resultIndex = 0; // the connection to use
                    var left = d.left ? d.target : d.source;
					// right is the node that the arrow points to, left is the other node
					var right = d.left ? d.source : d.target;
					var onode = QDRService.topology._nodeInfo[left.key];
					// loop through all the connections for left, and find the one for right
					if (!onode)
						return;
                    // update the info dialog for the link the mouse if over
                    if (!selected_node && !selected_link) {
                        for (resultIndex=0; resultIndex < onode['.connection'].results.length; ++resultIndex) {
                            var conn = onode['.connection'].results[resultIndex];
                            /// find the connection whose container is the right's name
                            var name = QDRService.valFor(onode['.connection'].attributeNames, conn, "container");
                            if (name == right.name) {
                                break;
                            }
                        }
                        // did not find connection. this is a connection to a non-interrouter node
                        if (resultIndex === onode['.connection'].results.length) {
                            // use the non-interrouter node's connection info
                            left = d.target;
                            resultIndex = left.resultIndex;
                        }
                        updateConnForm(left, resultIndex);
                    }

					// select link
					mousedown_link = d;
					selected_link = mousedown_link;
					//selected_node = null;
					//mousedown_node = null;
					restart();
				})
	            .on('mouseout', function (d) {
					if(d3.event.ctrlKey) return;
				        //QDR.log.debug("showing connections form");
					// select link
					selected_link = null;
					//selected_node = null;
					//mousedown_node = null;
					restart();
				});

	        // remove old links
	        path.exit().remove();


	        // circle (node) group
	        // NB: the function arg is crucial here! nodes are known by id, not by index!
	        circle = circle.data(nodes, function (d) {
	            return d.id;
	        });

	        // update existing nodes selected visual states)
	        circle.selectAll('circle')
	            .style('fill', function (d) {
	            	var sColor = colors[d.nodeType];
	                return (d === selected_node) ? d3.rgb(sColor).brighter().toString() : d3.rgb(sColor);})
	            .classed('selected', function (d) {
	                return (d === selected_node)}
	        );

	        // add new nodes
	        var g = circle.enter().append('svg:g');

	        g.append('svg:circle')
	            .attr('class', 'node')
	            .attr('r', function (d) {
	            	return radii[d.nodeType];
	            })
	            .style('fill', function (d) {
	                var sColor = colors[d.nodeType];
	                return (d === selected_node) ? d3.rgb(sColor).brighter().toString() : d3.rgb(sColor);
	            })
	            .style('stroke', function (d) {
	                var sColor = colors[d.nodeType];
	                return d3.rgb(sColor).darker().toString();
	            })
	            .on('mouseover', function (d) {
					if (!selected_node) {
                        if (d.nodeType === 'inter-router') {
                            //QDR.log.debug("showing general form");
                            updateNodeForm(d);
                        } else if (d.nodeType === 'normal' || d.nodeType === 'on-demand') {
                            //QDR.log.debug("showing connections form");
                            updateConnForm(d, d.resultIndex);
                        }
					}

	                if (d === mousedown_node) 
	                    return;
	                //if (d === selected_node)
	                //    return;
	                // enlarge target node
	                d3.select(this).attr('transform', 'scale(1.1)');
                    // highlight the next-hop route from the selected node to this node
                    mousedown_node = null;

	                if (!selected_node) {
	                    return;
	                }
                    setTimeout(nextHop, 1, selected_node, d);
	            })
	            .on('mouseout', function (d) {
	                //if (!mousedown_node || d === mousedown_node) return;
	                // unenlarge target node
	                d3.select(this).attr('transform', '');
                    for (var i=0; i<links.length; ++i) {
                        links[i]['highlighted'] = false;
                    }
                    restart();
	            })
	            .on('mousedown', function (d) {
	                if (d3.event.ctrlKey)
	                    return;
	                mousedown_node = d;
	                if (mousedown_node === selected_node) {
	                    selected_node = null;
       	                QDR.topoFormSelected = "";
	                }
	                else {
	                    selected_node = mousedown_node;
                        if (d.nodeType === 'inter-router') {
                            //QDR.log.debug("showing general form");
                            updateNodeForm(d);
           	                QDR.topoFormSelected = "general";
                        } else if (d.nodeType === 'normal' || d.nodeType === 'on-demand') {
                            //QDR.log.debug("showing connections form");
                            updateConnForm(d, d.resultIndex);
           	                QDR.topoFormSelected = "connections";
                        }
	                }
	                selected_link = null;
                    for (var i=0; i<links.length; ++i) {
                        links[i]['highlighted'] = false;
                    }
                    $scope.$apply();
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
/*
	    function mousemove() {
	        if (!mousedown_node) return;

	        restart();
	    }
*/
/*
	    function mouseup() {
	        // because :active only works in WebKit?
	        svg.classed('active', false);

	        // clear mouse event vars
	        resetMouseVars();
	    }
*/
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
			if (Object.keys(QDRService.topology._nodeInfo).length != Object.keys(savedKeys).length)
				return true;
			for (var key in QDRService.topology._nodeInfo) {
                // if this node isn't in the saved node list
                if (!savedKeys.hasOwnProperty(key))
                    return true;
                // if the number of connections for this node chaanged
                if (QDRService.topology._nodeInfo[key]['.connection'].results.length != savedKeys[key]) {
					QDR.log.debug("number of connections changed for " + key);
					QDR.log.debug("QDRService.topology._nodeInfo[key]['.connection'].results.length");
					console.dump(QDRService.topology._nodeInfo[key]['.connection'].results.length);
					QDR.log.debug("savedKeys[key]");
					console.dump(savedKeys[key]);
                    return true;
                }
			}
			return false;
		};
		function saveChanged () {
            savedKeys = {};
            // save the number of connections per node
		    for (var key in QDRService.topology._nodeInfo) {
		        savedKeys[key] = QDRService.topology._nodeInfo[key]['.connection'].results.length;
		    }
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
            QDRService.stopUpdating();
            QDRService.delUpdatedAction("topology");
			d3.select("#SVG_ID").remove();
        });

		initForceGraph();
		saveChanged();
        QDRService.startUpdating();

initGlobe();
  };

  return QDR;
}(QDR || {}));
