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
  QDR.ListController = function($scope, QDRService, QDRChartService, dialogService, localStorage, $location, $element, $rootScope) {

    QDR.log.debug("started List controller");
    if (!angular.isDefined(QDRService.schema))
        return;
    $scope.isChartsPage = function () {
        return $location.path() == "/charts";
    };
    $scope.mySelections = [];
    $scope.selectedAction = localStorage['QDRSelectedAction'];
    $scope.selectedNode = localStorage['QDRSelectedNode'];
    $scope.selectedNodeId = localStorage['QDRSelectedNodeId'];
    $scope.selectedRecordName = localStorage['QDRSelectedRecordName'];
    //QDR.log.debug("fetched selectedAction as " + $scope.selectedAction);
    //QDR.log.debug("fetched selectedNode as " + $scope.selectedNode);


    var excludedEntities = ["management", "org.amqp.management", "operationalEntity", "entity", "configurationEntity", "dummy"];
    
    $scope.navs = [];
    var navs = [];
    for (var entity in QDRService.schema.entityTypes) {
        if (excludedEntities.indexOf(entity) == -1) {
            navs.push( {
                href: entity,
                title: angular.isDefined(entity.description) ? entity.description : '',
                name: QDRService.humanify(entity),
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
    $scope.$watch('selectedRecordName', function(newValue, oldValue) {
        if (newValue != oldValue) {
            localStorage['QDRSelectedRecordName'] = $scope.selectedRecordName;
            QDR.log.debug("saving selectedRecordName as " + $scope.selectedRecordName);
        }
    })

    $scope.tableRows = [];
    //$scope.schema = QDRService.schema;
    $scope.gridDef = undefined;
    var selectedRowIndex = 0;

    var updateTableData = function (entity) {
        QDRService.getNodeInfo($scope.selectedNodeId, entity, [], function (nodeName, entity, response) {
            QDR.log.debug("got results for  " + nodeName);
            //console.dump(response);

            var records = response.results;
            var ent = QDRService.schema.entityTypes[$scope.selectedEntity];
            var tableRows = [];
            for (var i=0; i<records.length; ++i) {
                var record = records[i];
                var row = {};
                var attributeNames = response.attributeNames;
                var nameIndex = attributeNames.indexOf("name");
                var rowName;
                if (nameIndex > -1) {
                    rowName = record[nameIndex];
                } else {
                    QDR.log.debug("response attributeNames did not contain a name field");
                    console.dump(response.attributeNames);
                    return;
                }
                if (rowName == $scope.selectedRecordName)
                    selectedRowIndex = i;
                for (var j=0; j<attributeNames.length; ++j) {
                    var col = attributeNames[j];
                    row[col] = {value: record[j], type: undefined};
                    if (ent) {
                        var att = ent.attributes[col];
                        if (att) {
                            row[col] = {value: record[j], type: att.type};
                        }
                    }
                }
                tableRows.push(row);
            }
            setTimeout(selectRow, 0, tableRows);
        });
    };

    // tableRows are the records that were returned, this populates the left hand table on the page
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
    $scope.selectedEntity = undefined;
    for (var i=0; i<$scope.navs.length; ++i) {
        if ($scope.selectedAction === $scope.navs[i].href) {
            $scope.selectedEntity = $scope.navs[i].entity;
            break;
        }
    }
    if (!angular.isDefined($scope.selectedEntity)) {
        $scope.selectedAction = $scope.navs[0].href;
        $scope.selectedEntity = $scope.navs[0].entity;
    }
    var savedCharts = angular.fromJson(localStorage['QDRListCharts']);
    var getCurrentSavedCharts = function () {
        if (angular.isDefined(savedCharts)) {
            if (angular.isDefined(savedCharts[$scope.selectedEntity])) {
                //graphFields = savedCharts[$scope.selectedEntity];
            }
        } else {
            savedCharts = {};
        }
    }
    getCurrentSavedCharts();

    QDR.log.debug("using entity of " + $scope.selectedEntity);
    var stop = undefined;

    var cellTemplate = '<div class="ngCellText" ng-class="col.colIndex()"><span ng-cell-text>{{row.getProperty(col.field)}}</span></div>';
    var gridCols = [
        { field: 'name',
          displayName: '',
          cellTemplate: '<div class="ngCellText" ng-class="col.colIndex()"><span ng-cell-text>{{row.getProperty(col.field).value}}</span></div>'
        }
    ];
    // the table on the left of the page contains the name field for each record that was returned
    $scope.gridDef = {
        data: 'tableRows',
        columnDefs: gridCols,
        headerRowHeight:0,
        selectedItems: $scope.mySelections,
        multiSelect: false,
        afterSelectionChange: function (rowItem) {
            //QDR.log.debug("afterSelectionChange called");
            if (rowItem.selected && angular.isDefined(rowItem.orig))  {
                // if the selectedRowIndex has changed, reset the graphs
                //if (rowItem.rowIndex != selectedRowIndex) {
                //    $scope.reset(false);
                //    doRender();
                //}
                selectedRowIndex = rowItem.rowIndex;
                $scope.selectedRecordName = $scope.mySelections[0].name.value;
                var details = [];
                // for each field in the new row, add a row in the details grid
                for (var name in rowItem.entity) {
                    details.push( { attributeName: QDRService.humanify(name),
                                    attributeValue: pretty(rowItem.entity[name].value),
                                    type: rowItem.entity[name].type,
                                    name: name,
                                    rawValue: rowItem.entity[name].value} )
                }
                setTimeout(updateDetails, 10, details);
            }
        }
    };

    var pretty = function(v) {

        if (!isNaN(parseFloat(v)) && isFinite(v))
            return formatComma(v);
        return v;
    }
    var formatComma = d3.format(",");
    $scope.detailFields = [];
    updateDetails = function (details) {
        $scope.detailFields = details;
        $scope.$apply();
    }

    var detailCols = [
         {
            width: '50%',
             field: 'attributeName',
             displayName: 'Attribute',
             cellTemplate: '<div class="listAttrName">{{row.entity[col.field]}}<i ng-click="addToGraph(row.entity)" ng-class="{\'active\': isFieldGraphed(row.entity), \'icon-bar-chart\': row.entity.type == \'integer\' }"></i></div>'
         },
         {
            width: '50%',
             field: 'attributeValue',
             displayName: 'Value'
         }
    ];

    $scope.isFieldGraphed = function(rowEntity) {
        return QDRChartService.isAttrCharted($scope.selectedNodeId, "." + $scope.selectedEntity, $scope.selectedRecordName, rowEntity.name);
    }

    $scope.addToGraph = function(rowEntity) {
        var chart = QDRChartService.registerChart($scope.selectedNodeId, "." + $scope.selectedEntity, $scope.selectedRecordName, rowEntity.name, 1000);
        doDialog("template-from-script.html", chart);
        $scope.reset(false);
    }

    // the table on the right of the page contains a row for each field in the selected record in the table on the left
    $scope.details = {
        data: 'detailFields',
        columnDefs: detailCols,
        enableColumnResize: true,
        multiSelect: false,
        beforeSelectionChange: function() {
              return false;
        }
    };

    updateTableData("." + $scope.selectedEntity);
    stop = setInterval(updateTableData, 5000, "." + $scope.selectedEntity);

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
        //if ($scope.charts) {
        //    $scope.charts.empty();
        //    $scope.charts = null;
        //}
        /*
        d3.select(".horizon")
            .call(horizon.remove)
            .remove();
            */
        if (all) {
        }
    };

    /*********************************
    chart
    **********************************/


    var doRender = Core.throttled(render, 200);
    QDR.log.debug("calling throttled doRender");
    //doRender();
    function render() {

        var width = 594;
        var charts = $element.find('#graph');

        if (!charts || Object.keys(graphFields).length == 0 || $scope.mySelections.length == 0 ||
            !$scope.isChartsPage())
         {
            setTimeout(doRender, 500);
            Core.$apply($scope);
            //QDR.log.debug("delaying initializing of graph until data arrives");
            return;
        }

        width = charts.width();
        $scope.charts = charts;
        $scope.updateRate = 1000;

        QDR.log.debug("width: " + width);

        var context = cubism.context().serverDelay($scope.updateRate).clientDelay($scope.updateRate).step($scope.updateRate).size(width);
        $scope.context = context;
        var horizon = context.horizon();

        function findDataFor(start, step, name, fieldIndex) {
            var stop = start + step;
            var lastVal = NaN;
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
                callback(null, values);
            }, name)
        }

        horizon.metric(list_metric);
        //horizon.colors(["#08519c","#3182bd","#6baed6","#bdd7e7","#bae4b3","#74c476","#31a354","#006d2c"]);
        horizon.colors(["#f0f0ff","#c0c0dd"]);
        //horizon.height(50);
        //QDR.log.debug("horizon scale is");
        //console.dump(horizon.scale());

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

    function doDialog(template, chart) {

        // The data for the dialog
        var model = {
            chart: chart,
        };

        // jQuery UI dialog options
        var options = {
            autoOpen: false,
            modal: true,
            width: 600,
            position: {my: "top", at: "top", of: ".qdrList"},

            show: {
                    effect: "fade",
                    duration: 200
                  },
                  hide: {
                    effect: "fade",
                    duration: 200
                  },
            resizable: false,
            close: function(event, ui) {
                //QDR.log.debug("Predefined close");
                if (!chart.dashboard) {
                    QDRChartService.unRegisterChart(chart);     // remove the chart
                    delete model.chart;
                }
                if (model.updateTimer) {
                    clearTimeout(model.updateTimer);
                }
                delete model.dialogSvgChart;
                delete model.updateTimer;
            }
        };

        // Open the dialog using template from script
        dialogService.open("myDialog", template, model, options).then(
            function(result) {
                QDR.log.debug("Close");
                QDR.log.debug(result);
            },
            function(error) {
                QDR.log.debug("Cancelled");
            }
        );

    };

  };

  QDR.ListChartController = function($element, $scope, QDRService, QDRChartService, dialogService, localStorage, $location, $element, $rootScope) {
        var dialogSvgChart = null;
        var updateTimer = null;
        $scope.svgDivId = "dialogChart";    // the div id for the svg chart

        $scope.okClick = function () {
            dialogService.cancel("myDialog");
        };

        $scope.showChartsPage = function () {
            dialogService.close("myDialog");
            $location.path("/charts");
        };

        $scope.addChartsPage = function () {
            var chart = $scope.model.chart;
            QDRChartService.addDashboard(chart);
        };

        $scope.delChartsPage = function () {
            var chart = $scope.model.chart;
            QDRChartService.delDashboard(chart);
        };

        $scope.isOnChartsPage = function () {
            var chart = $scope.model.chart;
            return chart.dashboard;
        }

        var showChart = function () {
            // the chart divs are generated by angular and aren't available immediately
            var div = angular.element("#" + $scope.svgDivId);
            if (!div.width()) {
                setTimeout(showChart, 100);
                return;
            }
            dialogSvgChart = new QDRChartService.AreaChart($scope.model.chart, $location.$$path);
            $scope.model.dialogSvgChart = dialogSvgChart;
            updateDialogChart();
        }
        showChart();

        var updateDialogChart = function () {
            if (dialogSvgChart)
                dialogSvgChart.tick($scope.svgDivId);
            updateTimer = setTimeout(updateDialogChart, 1000);
            $scope.model.updateTimer = updateTimer;
        }

  };

  return QDR;

} (QDR || {}));
