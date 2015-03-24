/**
 * @module QDR
 */
var QDR = (function(QDR) {

  /**
   * @method ListController
   * @param $scope
   * @param QDRService
   *
   * Controller for the main interface
   */
  QDR.ListController = function($element, $scope, QDRService, localStorage, $location, $element, $rootScope) {

    QDR.log.debug("started List controller");
    if (!angular.isDefined(QDRService.schema))
        return;
    $scope.mySelections = [];
    $scope.selectedAction = localStorage['QDRSelectedAction'];
    $scope.selectedNode = localStorage['QDRSelectedNode'];
    $scope.selectedNodeId = localStorage['QDRSelectedNodeId'];
    //QDR.log.debug("fetched selectedAction as " + $scope.selectedAction);
    //QDR.log.debug("fetched selectedNode as " + $scope.selectedNode);

    var excludedEntities = ["management", "org.amqp.management", "operationalEntity", "entity", "configurationEntity", "dummy"];
    
    var humanify = function (s) {
        var t = s.charAt(0).toUpperCase() + s.substr(1).replace(/[A-Z]/g, ' $&');
        return t.replace(".", " ");
    }
    $scope.navs = [];
    var navs = [];
    for (var entity in QDRService.schema.entityTypes) {
        if (excludedEntities.indexOf(entity) == -1) {
            navs.push( {
                href: entity,
                title: angular.isDefined(entity.description) ? entity.description : '',
                name: humanify(entity),
                entity: entity}
             );
        }
    }
    $scope.navs = navs;
    if (!angular.isDefined($scope.selectedAction)) {
        $scope.selectedAction = $scope.navs[0].href;
        //QDR.log.debug("defaulted selectedAction to " + $scope.selectedAction);
    }

    $scope.nodes = QDRService.nodeList().sort(function (a, b) { return a.name.toLowerCase() > b.name.toLowerCase()});
    if (!angular.isDefined($scope.selectedNode)) {
        QDR.log.debug("selectedNode was " + $scope.selectedNode);
        if ($scope.nodes.length > 0) {
            $scope.selectedNode = $scope.nodes[0].name;
            $scope.selectedNodeId = $scope.nodes[0].id;
            QDR.log.debug("forcing selectedNode to " + $scope.selectedNode);
        }
    }

    $scope.isActionActive = function(name) {
        //QDR.log.debug("isActionActive(" + name + ")  selectedAction is " + $scope.selectedAction);
        return $scope.selectedAction === name;
    };
    $scope.isNodeSelected = function (id) {
        return $scope.selectedNodeId === id;
    };
    
    $scope.selectNode = function(node) {
        QDR.log.debug("setting selectedNode to " + node.name);
        $scope.selectedNode = node.name;
        $scope.selectedNodeId = node.id;
        QDR.log.debug("location is " + $location.url());
        $location.search('n', node.name);
    };
    $scope.selectAction = function(action) {
        $scope.selectedAction = action;
        $location.search('a', action);
        //QDR.log.debug("selectAction called with " + action + "  location is now " + $location.url());
    };

    $scope.$watch('selectedAction', function(newValue, oldValue) {
      if (newValue !== oldValue) {
        localStorage['QDRSelectedAction'] = $scope.selectedAction;
        //QDR.log.debug("saving selectedAction as " + $scope.selectedAction + " newValue is " + newValue);
      }
    })
    $scope.$watch('selectedNode', function(newValue, oldValue) {
      if (newValue !== oldValue) {
        localStorage['QDRSelectedNode'] = $scope.selectedNode;
        localStorage['QDRSelectedNodeId'] = $scope.selectedNodeId;
        QDR.log.debug("saving selectedNode as " + $scope.selectedNode + " newValue is " + newValue);
      }
    })

    $scope.tableRows = [];
    //$scope.schema = QDRService.schema;
    $scope.gridDef = undefined;
    var graphData = {};
    var graphFields = {};
    var selectedRowIndex = 0;

    var updateTableData = function (entity, select) {
        QDRService.getNodeInfo($scope.selectedNodeId, entity, [], function (nodeName, entity, response) {
            QDR.log.debug("got results for  " + nodeName);
            //console.dump(response);

            var records = response.results;
            var millis = new Date().getTime();
            graphData[millis] = {};
            var ent = QDRService.schema.entityTypes[selectedEntity];
            var tableRows = [];
            for (var i=0; i<records.length; ++i) {
                var record = records[i];
                var row = {};
                var attributeNames = response.attributeNames;
                var nameIndex = attributeNames.indexOf("name");
                var rowName;
                if (nameIndex > -1) {
                    rowName = record[nameIndex];
                    graphData[millis][rowName] = [];
                } else {
                    QDR.log.debug("response attributeNames did not contain a name field");
                    console.dump(response.attributeNames);
                    return;
                }
                for (var j=0; j<attributeNames.length; ++j) {
                    var col = attributeNames[j];
                    row[col] = {value: record[j], type: undefined};
                    if (ent) {
                        var att = ent.attributes[col];
                        if (att) {
                            if (att.type === 'integer') {
                                graphData[millis][rowName].push(record[j]);
                                //graphFields[humanify(col)] = true; // just creating the key, the value doesn't matter
                            }
                            row[col] = {value: record[j], type: att.type};
                        }
                    }
                }
                tableRows.push(row);
            }
            setTimeout(selectRow, 0, tableRows);
        });
    };

    var selectRow = function (tableRows) {
        while ($scope.tableRows.length) {
            $scope.tableRows.pop();
        }
        //QDR.log.debug("tablerows is now");
        //console.dump(tableRows);
        $scope.tableRows = tableRows;
        // must apply scope here to update the tableRows before selecting the row
        $scope.$apply();
        $scope.gridDef.selectRow(selectedRowIndex, true);
    }
    var selectedEntity;
    for (var i=0; i<$scope.navs.length; ++i) {
        if ($scope.selectedAction === $scope.navs[i].href) {
            selectedEntity = $scope.navs[i].entity;
            break;
        }
    }
    if (!angular.isDefined(selectedEntity)) {
        $scope.selectedAction = $scope.navs[0].href;
        selectedEntity = $scope.navs[0].entity;
    }
    var savedCharts = angular.fromJson(localStorage['QDRListCharts']);
    var getCurrentSavedCharts = function () {
        if (angular.isDefined(savedCharts)) {
            if (angular.isDefined(savedCharts[selectedEntity]))
                graphFields = savedCharts[selectedEntity];
        } else {
            savedCharts = {};
        }

    }
    getCurrentSavedCharts();

    QDR.log.debug("using entity of " + selectedEntity);
    var stop = undefined;

    var cellTemplate = '<div class="ngCellText" ng-class="col.colIndex()"><span ng-cell-text>{{row.getProperty(col.field)}}</span></div>';
    var gridCols = [
        { field: 'name',
          displayName: '',
          cellTemplate: '<div class="ngCellText" ng-class="col.colIndex()"><span ng-cell-text>{{row.getProperty(col.field).value}}</span></div>'
        }
    ];
    $scope.detailFields = [];
    $scope.gridDef = {
        data: 'tableRows',
        columnDefs: gridCols,
        headerRowHeight:0,
        selectedItems: $scope.mySelections,
        multiSelect: false,
        afterSelectionChange: function (rowItem) {
            if (rowItem.selected && angular.isDefined(rowItem.orig))  {
                // if the selectedRowIndex has changed, reset the graphs
                if (rowItem.rowIndex != selectedRowIndex) {
                    $scope.reset(false);
                    doRender();
                }
                selectedRowIndex = rowItem.rowIndex;
                var details = [];
                // for each field in the new row, add a row in the details grid
                for (var name in rowItem.entity) {
                    details.push( {attributeName: humanify(name), attributeValue: rowItem.entity[name].value, type: rowItem.entity[name].type} )
                }
                setTimeout(updateDetails, 10, details);
            }
        }
    };

    updateDetails = function (details) {
        $scope.detailFields = details;
        $scope.$apply();
    }

    var detailCols = [
         {
            width: '50%',
             field: 'attributeName',
             displayName: 'Attribute',
             cellTemplate: '<div class="listAttrName">{{row.entity[col.field]}}<i ng-click="addToGraph(row.entity)" ng-class="{\'active\': isFieldGraphed(row.entity), \'icon-signal\': row.entity.type == \'integer\' }"></i></div>'
         },
         {
            width: '50%',
             field: 'attributeValue',
             displayName: 'Value'
         }
    ];

    $scope.isFieldGraphed = function(rowEntity) {
        return angular.isDefined(graphFields[rowEntity.attributeName]);
    }

    $scope.addToGraph = function(rowEntity) {
        if (angular.isDefined(graphFields[rowEntity.attributeName])) {
            delete graphFields[rowEntity.attributeName];
        } else {
            graphFields[rowEntity.attributeName] = true;
        }
        $scope.reset(false);
        doRender();
        savedCharts[selectedEntity] = graphFields;
    	localStorage['QDRListCharts'] = angular.toJson(savedCharts);
    }

    $scope.details = {
        data: 'detailFields',
        columnDefs: detailCols,
        enableColumnResize: true,
        multiSelect: false,
        beforeSelectionChange: function() {
              return false;
        }
    };

    updateTableData("." + selectedEntity, true);
    stop = setInterval(updateTableData, 5000, "." + selectedEntity, false);

    QDRService.addUpdatedAction("list", function() {
        //QDR.log.debug("List controller was notified that the model was updated");
    });

    $scope.$on("$destroy", function( event ) {
        QDR.log.debug("scope destroyed for qdrList");
        $scope.reset(true);
        if (angular.isDefined(stop)) {
            clearInterval(stop);
            stop = undefined;
        };
        QDRService.delUpdatedAction("list");
    });

    $scope.reset = function (all) {
        if ($scope.context) {
            $scope.context.stop();
            $scope.context = null;
        }
        if ($scope.charts) {
            $scope.charts.empty();
            $scope.charts = null;
        }
        /*
        d3.select(".horizon")
            .call(horizon.remove)
            .remove();
            */
        if (all) {
            graphData = {};
            graphFields = {};
        }
    };

    /*********************************
    chart
    **********************************/


    var doRender = Core.throttled(render, 200);
    QDR.log.debug("calling throttled doRender");
    doRender();
    function render() {

        var width = 594;
        var charts = $element.find('#graph');
        if (charts) {
            width = charts.width();
        }
        $scope.charts = charts;
        $scope.updateRate = 1000;

        if (Object.keys(graphFields).length == 0 || $scope.mySelections.length == 0) {
            setTimeout(doRender, 500);
            Core.$apply($scope);
            QDR.log.debug("delaying initializing of graph until data arrives");
            return;
        }

        var context = cubism.context().serverDelay($scope.updateRate).clientDelay($scope.updateRate).step($scope.updateRate).size(width);
        $scope.context = context;
        var horizon = context.horizon();

        function findDataFor(start, step, name, fieldIndex) {
            var stop = start + step;
            var lastVal = Number.Nan;
            for (var milli in graphData) {
                // for requests that are before the data recording was started, return Nan
                if (stop < milli)
                    return lastVal;
                lastVal = graphData[milli][name][fieldIndex];
                if (milli >= start && milli < stop)
                    break;
            }
            // time falls within a range we have, or is past the last data we have
            return lastVal;
        }
        function findFieldIndex(field) {
            var valueIndex = 0;
            for (var i=0; i<$scope.detailFields.length; ++i) {
                if ($scope.detailFields[i].type === "integer") {
                    if ($scope.detailFields[i].attributeName === field)
                        return valueIndex;
                    ++valueIndex;
                }
            }
            return -1;
        }

        function list_metric(field) {
            return context.metric(function(start, stop, step, callback) {
                var values = [];
                var fieldIndex = findFieldIndex(field);
                if (fieldIndex < 0)
                    return;
                var selName = $scope.mySelections[0].name.value;

                // convert start & stop to milliseconds
                start = +start;
                stop = +stop;

                while (start < stop) {
                    // find the graphData for the timestamp that is between start and start+step
                    values.push(findDataFor(start, step, selName, fieldIndex));
                    start += step;
                }
                if (field == 'Deliveries Transit') {
                    QDR.log.debug("graph values for deliveries");
                    console.dump(values);
                    QDR.log.debug("with field of " + field + " and fieldIndex of " + fieldIndex);
                }
                callback(null, values);
            }, name)
        }

        horizon.metric(list_metric);
        //horizon.height(50);
        QDR.log.debug("horizon scale is");
        console.dump(horizon.scale());

        d3.select("#graph").selectAll(".horizon")
            .data(Object.keys(graphFields))
            .enter()
            .append("div")
            .attr("class", "horizon")
            .call(horizon);

        // set rule
        d3.select("#body").append("div")
          .attr("class", "rule")
          .call(context.rule());

        // set focus
        context.on("focus", function(i) {
            d3.selectAll(".value")
                .style( "right", i == null ? null : context.size() - i + "px");
        });

        // set axis
        d3.select("#graph")
            .append("div")
            .attr("class", "axis")
            .append("g")
            .call(context.axis());
    }

  };

  return QDR;

} (QDR || {}));
