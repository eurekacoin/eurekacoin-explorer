'use strict';

angular.module('insight.contracts')
	.factory('ContractsInfo',
		function($resource) {
			return $resource(window.apiPrefix + '/contracts/:contractAddressStr/info');
		})
	.factory('Contracts',
	function(Bitcorelib, Opcodes, Networks) {

		var CONTRACT_CALL = 194;
		var CONTRACT_CREATE = 193;

		return {
			getBitAddressFromContractAddress: function (contractAddress) {

				var network = Networks.getCurrentNetwork(),
					networkId = network.pubkeyhash.toString(16),
					checksum = Bitcorelib.crypto.Hash.sha256sha256(new Bitcorelib.deps.Buffer(networkId + contractAddress, 'hex')),
					hexBitAddress = networkId + contractAddress + checksum.toString('hex').slice(0, 8);

				return Bitcorelib.encoding.Base58.encode(new Bitcorelib.deps.Buffer(hexBitAddress, 'hex'));

			},
			getContractOpcodesString: function (hex) {

				var contractCode = new Bitcorelib.deps.Buffer(hex, 'hex'),
					ops = [];

				for (var index = 0; index < contractCode.length; index++) {
					var currentOp = Opcodes.lookupOpcode(contractCode[index], true);
					// record the program counter
					currentOp.pc = index;
					ops.push(currentOp);
					// handle PUSH inline data
					if (currentOp.name.slice(0, 4) === 'PUSH') {
						// load inline data
						var pushDataLength = contractCode[index] - 0x5f;
						var pushData = contractCode.slice(index + 1, index + pushDataLength + 1);

						currentOp.pushData = pushData;

						// skip read of inline data
						index += pushDataLength;
					}
				}

				var opcodesStr = '';

				for(var i = 0; i < ops.length; i++) {

					if ((ops[i]['pushData'])) {
						opcodesStr += (' ' + ops[i]['name'] + ((ops[i]['pushData']) ? (' 0x' + ops[i]['pushData'].toString('hex')) : ''));
					} else {
						opcodesStr += (' ' + ops[i]['name'] );
					}

				}

				return opcodesStr;

			},
			getContractBytecode: function (hex) {

				try {

					var script = Bitcorelib.Script(hex);

					if (script.chunks && script.chunks.length) {

						for(var k=0; k < script.chunks.length; k++) {

							if (script.chunks[k] && script.chunks[k]['opcodenum'] && [CONTRACT_CALL, CONTRACT_CREATE].indexOf(script.chunks[k]['opcodenum']) !== -1) {

								switch (script.chunks[k]['opcodenum']) {
									case  CONTRACT_CALL:
										return { 
											code: script.chunks[k - 2]['buf'].toString('hex'),
											type: 'Call' 
									};
									case CONTRACT_CREATE:
										return { 
											code: script.chunks[k - 1]['buf'].toString('hex'),
											type: 'Create' 
										};
								}

							}

						}

					}

				} catch(e) {

				}

				return null;
			},
			getContractAddressByHex: function (txid, voutNum, hex) {

				try {

					var script = Bitcorelib.Script(hex);

					if (script.chunks && script.chunks.length) {

						for(var k=0; k < script.chunks.length; k++) {

							if (script.chunks[k] && script.chunks[k]['opcodenum'] && [CONTRACT_CALL, CONTRACT_CREATE].indexOf(script.chunks[k]['opcodenum']) !== -1) {

								switch (script.chunks[k]['opcodenum']) {
									case CONTRACT_CALL:
									case CONTRACT_CREATE:
										return this.getContractAddress(txid, voutNum);
								}

							}

						}

					}

				} catch(e) {

				}

				return null;
			},
			getContractAddress: function (txId, num) {
				var reverseTxId = txId.match(/.{2}/g).reverse().join(""),
					buf = new Bitcorelib.deps.Buffer(4);

				buf.writeUInt32LE(num, 0);

				var nHex = buf.toString('hex'),
					addr = reverseTxId + nHex,
					bufferAddress = Bitcorelib.crypto.Hash.sha256ripemd160(new Bitcorelib.deps.Buffer(addr, 'hex'));

				return bufferAddress.toString('hex');
			}
		}
	})
	.factory('StorageByAddress', function($resource, $window) {

		return $resource($window.apiPrefix + '/contracts/:address/info', {
			address: '@address'
		},
		{
			get: {
				method: 'GET',
				interceptor: {
					response: function (res) {
						return res.data;
					},
					responseError: function (res) {
						if (res.status === 404) {
							return res;
						}
					}
				}
			}
		});
	})
	.factory('ERC20ContractInfo', function($resource, $window) {

		return $resource($window.apiPrefix + '/erc20/:address',
		{
			get: {
				method: 'GET',
				interceptor: {
					response: function (res) {
						return res.data;
					},
					responseError: function (res) {
						if (res.status === 404) {
							return res;
						}
					}
				}
			}
		});
	});

