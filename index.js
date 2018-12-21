let express = require('express');
let app = express();
let http = require('http');
let server = http.Server(app);
let morgan = require('morgan');
let mongoose = require("mongoose");
let Schema = mongoose.Schema;
let path = require("path");
let fs = require("fs");
let rfs = require("rotating-file-stream");
let config = require("./config");
let util = require("./util")
let port = process.env.PORT || config.port || 3012;


app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
        res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PUT");
        res.header("Access-Control-Allow-Headers", "X-Requested-With, Accept, Content-Type, Origin");
        res.header("Access-Control-Request-Headers", "X-Requested-With, Accept, Content-Type, Origin");
        return res.sendStatus(200);
    } else {
        return next();
    }
});

app.use(function (req, res, next) {
    req.realAddress = req.header("x-real-ip") || req.realAddress;
    res.header("X-Spiget-Server", config.server.name || "default");
    next();
});

app.use("/.well-known", express.static(".well-known"));

// create a rotating write stream
let accessLogStream = rfs('access.log', {
    interval: '1d', // rotate daily
    path: path.join(__dirname, 'log'),
    compress: "gzip"
})

// setup the logger
app.use(morgan('combined', {stream: accessLogStream}))
morgan.token('remote-addr', function (req) {
    return req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
});


// mongoose.plugin(util.idPlugin);
mongoose.plugin(util.paginatePlugin);
require("./db/db")(mongoose, config);

app.get("/", function (req, res) {
    res.redirect("/v2");
});

app.get("/health.json", function (req, res) {
    res.json({"status": "I'm healthy, yay!"});
});

app.get("/v2", function (req, res) {
    res.redirect("/v2/status");
});

app.use("/v2/status", require("./routes/status")(express, config));
app.use("/v2/resources", require("./routes/resources")(express, config));
app.use("/v2/authors", require("./routes/authors")(express, config));
app.use("/v2/categories", require("./routes/categories")(express, config));
app.use("/v2/reviews", require("./routes/reviews")(express, config));
app.use("/v2/search", require("./routes/search")(express, config));

app.use(function (err, req, res, next) {
    console.error(err);
    res.status(500).json({
        error: "Unexpected Exception",
        msg: "Unexpected Exception. Please report this to https://github.com/SpiGetOrg/RestAPI/issues"
    })
})

function exitHandler(err) {
    if (err) {
        console.log("\n\n\n\n\n\n\n\n");
        console.log(err);
        console.log("\n\n\n");
    }
    process.exit();
}


server.listen(port, function () {
    console.log('listening on *:' + port);
});

process.on("exit", exitHandler);
process.on("SIGINT", exitHandler);
process.on("uncaughtException", exitHandler);