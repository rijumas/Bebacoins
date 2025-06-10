const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const path = require("path");

const app = express(); // <-- Esto va primero

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public"))); // <-- Ahora es seguro usar app


// Configuración del nodo
const RPC_USER = "rijumas";
const RPC_PASSWORD = "Wakandaforever_1";
const RPC_PORT = 8332;
const RPC_URL = `http://127.0.0.1:${RPC_PORT}/`;

async function callRPC(method, params = []) {
    try {
        const response = await axios.post(
            RPC_URL,
            {
                jsonrpc: "1.0",
                id: "1",
                method,
                params,
            },
            {
                auth: {
                    username: RPC_USER,
                    password: RPC_PASSWORD,
                },
            }
        );
        return response.data.result;
    } catch (error) {
        // Mejora: lanzar directamente para manejarlo más arriba
        throw error.response?.data?.error || error;
    }
}

app.get("/balance", async (req, res) => {
    try {
        const balance = await callRPC("getbalances");
        res.json({
            available: balance.mine.trusted,
            pending: balance.mine.untrusted_pending,
            immature: balance.mine.immature
        });
    } catch (error) {
        res.status(500).json({ error });
    }
});


app.get("/address", async (req, res) => {
    try {
        const address = await callRPC("getnewaddress", ["", "bech32"]);
        res.json({ address });
    } catch (error) {
        res.status(500).json({ error });
    }
});

app.get("/transactions", async (req, res) => {
    try {
        const count = parseInt(req.query.count) || 10; // default: 10 transacciones
        const skip = parseInt(req.query.skip) || 0;
        const txs = await callRPC("listtransactions", ["*", count, skip]);
        res.json({ transactions: txs });
    } catch (error) {
        res.status(500).json({ error });
    }
});


app.post("/send", async (req, res) => {
    const {
        address,
        amount,
        comment = "",
        comment_to = "",
        subtractfeefromamount = false,
        replaceable = false,
        conf_target = null,
        estimate_mode = "unset",
        avoid_reuse = false,
        fee_rate = null,
        verbose = false
    } = req.body;

    if (!address || !amount) {
        return res.status(400).json({ error: "Se requiere 'address' y 'amount'" });
    }

    if (fee_rate !== null && conf_target !== null) {
        return res.status(400).json({
            error: "No puedes especificar ambos: 'conf_target' y 'fee_rate'."
        });
    }

    const params = [
        address,
        amount,
        comment,
        comment_to,
        subtractfeefromamount,
        replaceable,
    ];

    // completar hasta el parámetro 10
    // si se especifica fee_rate
    if (fee_rate !== null) {
        // necesitamos dejar conf_target, estimate_mode, avoid_reuse como null
        params.push(null); // conf_target
        params.push(null); // estimate_mode
        params.push(null); // avoid_reuse
        params.push(fee_rate); // fee_rate
        params.push(verbose); // verbose
    } else {
        // usamos conf_target y estimate_mode
        params.push(conf_target); // conf_target (puede ser null)
        params.push(estimate_mode); // estimate_mode
        params.push(avoid_reuse); // avoid_reuse
        params.push(null); // fee_rate
        params.push(verbose); // verbose
    }


    try {
        const txid = await callRPC("sendtoaddress", params);
        res.json({ txid });
    } catch (error) {
        res.status(500).json({ error });
    }
});

app.listen(3000, () => {
    console.log("Backend listening on port 3000");
});

