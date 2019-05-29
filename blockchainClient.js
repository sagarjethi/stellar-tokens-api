const sdk = require('stellar-sdk');
sdk.Network.usePublicNetwork();
//sdk.Network.use(new sdk.Network('Integration Test Network ; zulucrypto'))

const server = new sdk.Server('https://horizon.stellar.org');

//https://horizon-testnet.stellar.org


// get a list of transactions that occurred in ledger number
export const getBlockTransactions = (blockNumber) => {
	return new Promise(async (resolve) => {

		try {
			let historyPage = await server.payments()
				.forLedger(blockNumber)
				.call()

			const trxs = [];

			let hasNext = true
			while (hasNext) {
				if (historyPage.records.length <= 0) {
					hasNext = false
				} else {
					historyPage.records.map(record => {
						if (record.type == "payment" || record.type == "create_account") {
							const _payload = {
								from: record.from,
								to: record.to,
								amount: record.amount,
								assetType: record.asset_type,
								assetCode: record.asset_code,
								hash: record.transaction_hash,
							};

							trxs.push(_payload)
						}
					});
					historyPage = await historyPage.next()
				}
			}

			resolve(trxs)
		} catch (exe) {
			console.log(exe);
			resolve([]);
		}

	});
};

// get a list of transactions that occurred for address
export const getAccountTransactions = (accountAddress) => {
	return new Promise(async (resolve) => {
		try {
			let historyPage = await server.payments()
				.forAccount(accountAddress)
				.call()

			const trxs = [];

			let hasNext = true
			while (hasNext) {
				if (historyPage.records.length <= 0) {
					hasNext = false
				} else {
					historyPage.records.map(record => {
						if (record.type == "payment" || record.type == "create_account") {
							const _payload = {
								from: record.from,
								to: record.to,
								amount: record.amount,
								assetType: record.asset_type,
								assetCode: record.asset_code,
								hash: record.transaction_hash,
							};

							trxs.push(_payload)
						}
					});
					historyPage = await historyPage.next()
				}
			}

			resolve(trxs)
		} catch (exe) {
			console.log(exe);
			resolve([]);
		}
	});
};

// get a list of balance for all assets
export const listBalances = (accountAddress) => {
	return new Promise(async (resolve) => {
		const account = await server.loadAccount(accountAddress);

		const bals = [];
		account.balances.map((balance) => {
			const _payload = {
				assetType: balance.asset_type,
				assetCode: balance.asset_code,
				amount: balance.balance
			};
			bals.push(_payload);
		})

		resolve(bals);
	});
};

// get a list of transactions that occurred for address
export const generateAddress = () => {
	return new Promise((resolve) => {
		const keyPair = sdk.Keypair.random();

		// TODO fund this account

		resolve({
			privateKey: keyPair.secret(),
			publicKey: keyPair.publicKey()
		});
	});
};


// send transactions
export const sendTransaction = (sourceAddress, sourceAddressPrivateKey, destinationAddress, amount, asset = "tokenname", issuer = "address") => {
	return new Promise(async (resolve) => {
		const account = await server.loadAccount(sourceAddress);
		const fee = await server.fetchBaseFee();

		// check if destination has transactions
		const trxs = await getAccountTransactions(destinationAddress);
		if (trxs.length > 0) {
			// make normal transfer
			const _transaction = new sdk.TransactionBuilder(account, { fee })
				.addOperation(
					// this operation funds the new account with XLM
					sdk.Operation.payment({
						destination: destinationAddress,
						asset: asset == "native" ? sdk.Asset.native() : new sdk.Asset(asset, issuer),
						amount: String(amount)
					})
				)
				.setTimeout(60)
				.build();

			sdk.Network.usePublicNetwork();
			// sign the transaction
			_transaction.sign(sdk.Keypair.fromSecret(sourceAddressPrivateKey));

			try {
				const transactionResult = await server.submitTransaction(_transaction);
				resolve(transactionResult)
			} catch (err) {
				console.error(err.response.data, err.response.data.extras.result_codes.operations);
				resolve({ error: err.response.data.extras.result_codes.operations });
			}
		} else if (asset == "native") {
			// make createAccount transfer
			const _transaction = new sdk.TransactionBuilder(account, { fee })
				.addOperation(
					// this operation funds the new account with XLM
					sdk.Operation.createAccount({
						destination: destinationAddress,
						startingBalance: String(amount)
					})
				)
				.setTimeout(60)
				.build();

			sdk.Network.usePublicNetwork();
			// sign the transaction
			_transaction.sign(sdk.Keypair.fromSecret(sourceAddressPrivateKey));

			try {
				const transactionResult = await server.submitTransaction(_transaction);
				resolve(transactionResult)
			} catch (err) {
				console.error(err.response.data, err.response.data.extras.result_codes.operations);
				resolve({ error: err.response.data.extras.result_codes.operations });
			}
		} else {
			resolve({ error: "Non native trxs can not be sent to new address. Please consider doing a XLM trx first." });
		}

	});
};


export const createTrust = (destinationAddress, destinationAddressPrivateKey, asset = "tokenname", issuer = "address") => {
	return new Promise(async (resolve) => {
		const account = await server.loadAccount(destinationAddress);
		const fee = await server.fetchBaseFee();

		const _transaction = new sdk.TransactionBuilder(account, { fee })
			.addOperation(
				// this operation funds the new account with XLM
				sdk.Operation.changeTrust({
					asset: new sdk.Asset(asset, issuer),
				})
			)
			.setTimeout(60)
			.build();

		sdk.Network.usePublicNetwork();
		// sign the transaction
		_transaction.sign(sdk.Keypair.fromSecret(destinationAddressPrivateKey));

		try {
			const transactionResult = await server.submitTransaction(_transaction);
			resolve(transactionResult)
		} catch (err) {
			console.error(err.response.data, err.response.data.extras.result_codes.operations);
			resolve({ error: err.response.data.extras.result_codes.operations });
		}
	});
}
