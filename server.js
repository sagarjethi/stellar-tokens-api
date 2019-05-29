//Develop by: sagarjethi
//ledgerfoundation.org
const express = require("express");
const bodyParser = require("body-parser");
const moment = require("moment");

let cors = require("cors");

global.__base = __dirname;

const app = express();
const server = require("http").createServer(app);

import * as blockchainClient from "./blockchainClient";

const logRequest = (req, res, next) => {
	const app = req.app;
	let ip = "Unknown";
	try {
		ip = req.headers && req.headers["x-forwarded-for"] && req.headers["x-forwarded-for"].split(",").pop() || req.connection && req.connection.remoteAddress || req.socket && req.socket.remoteAddress || req.connection && req.connection.socket && req.connection.socket.remoteAddress;
	} catch (exe) {
		// fail silently
	}

	req.headers["ip-address"] = ip || "Unknown";
	if (!req.originalUrl.includes("/kue-api") && req.method != "OPTIONS") {
		console.log("REQUEST", `${moment().format("DD/MM/YY HH:mm:ss")} => ${req.method} from ${req.originalUrl} where ip is ${ip}`);
		res.on("finish", () => {
			if (app.queueClient) app.queueClient.push({ ...req.headers, requestUrl: req.originalUrl, statusCode: res.statusCode, contentLength: res.get("Content-Length") || 0 });
			console.log("REQUEST_FINISH", `${moment().format("DD/MM/YY HH:mm:ss")} => ${res.statusCode} for ${req.originalUrl} having ${res.statusMessage}; ${res.get("Content-Length") || 0}b sent`);
		});
	}

	// pass middleware
	next();
};

// Middleware
app.use(cors());
app.use(logRequest);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// handle routes
app.get("/listBlockTransactions/:blockNumber", async (req, res, next) => {
	if (req.params.blockNumber) {
		const transactions = await blockchainClient.getBlockTransactions(req.params.blockNumber)
		res.status(200).json({ result: transactions });
	} else {
		res.status(400).json({ result: false });
	}
});

app.get("/listAccountTransactions/:accountAddress", async (req, res, next) => {
	if (req.params.accountAddress) {
		const transactions = await blockchainClient.getAccountTransactions(req.params.accountAddress)
		res.status(200).json({ result: transactions });
	} else {
		res.status(400).json({ result: false });
	}
});

app.get("/listBalances/:accountAddress", async (req, res, next) => {
	if (req.params.accountAddress) {
		const transactions = await blockchainClient.listBalances(req.params.accountAddress)
		res.status(200).json({ result: transactions });
	} else {
		res.status(400).json({ result: false });
	}
});

app.post("/sendTransaction", async (req, res, next) => {
	if (req.body.sourceAddress && req.body.sourceAddressPrivateKey && req.body.destinationAddress && req.body.amount) {
		const transaction = await blockchainClient.sendTransaction(req.body.sourceAddress, req.body.sourceAddressPrivateKey, req.body.destinationAddress, req.body.amount, req.body.asset, req.body.issuer)
		res.status(200).json({ result: transaction });
	} else {
		res.status(400).json({ result: false });
	}
});

app.post("/createTrust", async (req, res, next) => {
	if (req.body.destinationAddress && req.body.destinationAddressPrivateKey) {
		const transaction = await blockchainClient.createTrust(req.body.destinationAddress, req.body.destinationAddressPrivateKey, req.body.asset, req.body.issuer)
		res.status(200).json({ result: transaction });
	} else {
		res.status(400).json({ result: false });
	}
});

app.get("/generateAddress", async (req, res, next) => {
	const addresses = await blockchainClient.generateAddress()
	console.log("key pairs", addresses);
	res.status(200).json({ result: addresses });
});

server.listen("9000", "0.0.0.0", async () => {
	console.log("APP", `Server running on port "9000" and on host "0.0.0.0"`);
	process.on("unhandledRejection", (reason, promise) => {
		console.log("APP_ERROR", `Uncaught error in ${String(reason)}`, promise);
	});
});
