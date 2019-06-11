'use strict';

angular.module('insight.networks')
	.factory('Networks',
		function(Constants, EurekaCoinCoreLib) {
			return {
				getCurrentNetwork: function () {
					return EurekaCoinCoreLib.Networks.get(Constants.NETWORK);
				}
			}
		});