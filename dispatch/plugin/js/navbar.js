/**
 * @module QDR
 */
var QDR = (function (QDR) {

  /**
   * @property breadcrumbs
   * @type {{content: string, title: string, isValid: isValid, href: string}[]}
   *
   * Data structure that defines the sub-level tabs for
   * our plugin, used by the navbar controller to show
   * or hide tabs based on some criteria
   */
  QDR.breadcrumbs = [
    {
      content: '<i class="icon-comments"></i> Main',
      title: "Connect to Router",
      isValid: function (QDRService) { return false; }, //QDRService.isConnected(); },
      href: "#/main"
    },
    {
        content: '<i class="icon-cogs"></i> Connect',
        title: "Connect to a router",
        isValid: function (QDRService) { return true; },
        href: "#/connect"
    },
    {
        content: '<i class="icon-star-empty"></i> Topology',
        title: "View router network topology",
        isValid: function (QDRService) { return QDRService.isConnected(); },
        href: "#/topology"
      },
    {
        content: '<i class="icon-list "></i> List',
        title: "View router nodes as a list",
        isValid: function (QDRService) { return QDRService.isConnected(); },
        href: "#/list"
      }
  ];
  /**
   * @function NavBarController
   *
   * @param $scope
   * @param workspace
   *
   * The controller for this plugin's navigation bar
   *
   */
  QDR.NavBarController = function($scope, QDRService, $location) {

    if (($location.path().startsWith("/main") || $location.path().startsWith("/topology") )
    && !QDRService.isConnected()) {
      $location.path("/connect");
    }

    if (($location.path().startsWith("/main") || $location.path().startsWith("/connect") )
    && QDRService.isConnected()) {
      $location.path("/topology");
    }

    $scope.breadcrumbs = QDR.breadcrumbs;

    $scope.isValid = function(link) {
      return link.isValid(QDRService);
    };

    $scope.isActive = function(href) {
        return href.split("#")[1] == $location.path();
    };
  };

  return QDR;

} (QDR || {}));
