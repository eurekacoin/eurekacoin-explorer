'use strict';

angular.module('insight.contracts').controller('ContractsController',
    function($scope, $rootScope, $routeParams, $location,$q, Global, Address, getSocket, ContractsInfo, Transaction, Contracts) {
        $scope.global = Global;

        var addrStr;

        try {
            addrStr = Contracts.getBitAddressFromContractAddress($routeParams.contractAddressStr);
        } catch (e) {

            $rootScope.flashMessage = 'Invalid Address: ' + $routeParams.contractAddressStr;
            $location.path('/');

            return false;

        }

        var socket = getSocket($scope);

        var _startSocket = function() {
            socket.on('bitcoind/addresstxid', function(data) {
                if (data.address === addrStr) {
                    $rootScope.$broadcast('tx', data.txid);
                    var base = document.querySelector('base');
                    var beep = new Audio(base.href + '/sound/transaction.mp3');
                    beep.play();
                }
            });
            socket.emit('subscribe', 'bitcoind/addresstxid', [addrStr]);
        };

        var _stopSocket = function () {
            socket.emit('unsubscribe', 'bitcoind/addresstxid', [addrStr]);
        };

        socket.on('connect', function() {
            _startSocket();
        });

        $scope.$on('$destroy', function(){
            _stopSocket();
        });

        $scope.params = $routeParams;

        $scope.findOne = function() {

            $rootScope.contractAddressStr = $routeParams.contractAddressStr;

            $q.all([ContractsInfo.get({
                contractAddressStr: $routeParams.contractAddressStr
            }).$promise, Address.get({
                addrStr: addrStr
            }).$promise]).then(function(values) {

                var info = values[0],
                    address = values[1];

                $rootScope.flashMessage = null;
                $rootScope.titleDetail = $routeParams.contractAddressStr.substring(0, 7) + '...';

                $scope.info = info;
                $scope.opcodesStr = Contracts.getContractOpcodesString(info.code);
                $scope.bitAddress = addrStr;
                $scope.address = address;

            }).catch(function (e) {

                if (e.status === 400) {
                    $rootScope.flashMessage = 'Invalid Address: ' + $routeParams.addrStr;
                } else if (e.status === 503) {
                    $rootScope.flashMessage = 'Backend Error. ' + e.data;
                } else {
                    $rootScope.flashMessage = 'Address Not Found';
                }

                $location.path('/');

            });

        };

    });