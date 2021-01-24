const AppName = 'Omni WebSocket 1.0.0 =';
const WebSocketServer = require('ws').Server;
const Http = require('http');
const File = require('fs');
const Url = require('url');
const Pi = require('./pillar.js');

const httpPort = 8080;
const wssPort = 775;

var clientIncrement = 1;
var groups = [];
var httpParams = {};

/**
 * 
 * SSL CONNECTION
const Http = require('https');
const pkey = File.readFileSync('/etc/letsencrypt/live/test.galileu.space/privkey.pem');
const pcert = File.readFileSync('/etc/letsencrypt/live/test.galileu.space/fullchain.pem');

const wss = new WebSocketServer({
    server: Http.createServer({ key: pkey, cert: pcert }).listen(wssPort)
});

httpParams = { key: pkey, cert: pcert };
*/

const wss = new WebSocketServer({
    server: Http.createServer(httpParams).listen(wssPort)
});

Http.createServer(httpParams, function (req, res) {
    const _url = Url.parse(req.url, true);

    if (_url.pathname == '/group/send') {
        if (_url.query.name == null || _url.query.name.length == 0) {
            res.write(JSON.stringify({ status: 'error', description: 'Parameter group name not defined' }));
            res.end();
            return;
        }

        if (_url.query.message == null || _url.query.message.length == 0) {
            res.write(JSON.stringify({ status: 'error', description: 'Parameter group name not defined' }));
            res.end();
            return;
        }

        try {
            sendToGroup(groups[_url.query.name], JSON.parse(_url.query.message));
        } catch (error) {
            res.write(JSON.stringify({
                status: 'error',
                message: error
            }));
            res.end();
            return;
        }

        res.write(JSON.stringify({
            status: 'ok',
            message: 'Message sended'
        }));
        res.end();

        return;
    }

    if (_url.pathname == '/group/clients') {
        if (_url.query.name == null) {
            res.write(JSON.stringify({ status: 'error', description: 'Parameter group name not defined' }));
            res.end();
            return;
        }

        if (_url.query.name.length == 0) {
            res.write(JSON.stringify({ status: 'error', description: 'Parameter group name not defined' }));
            res.end();
            return;
        }

        let group = groups[_url.query.name];
        if (group == null) {
            group = {};
        }

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.write(JSON.stringify(group));
        res.end();

        return;
    }

    if (_url.pathname == '/clients/all') {
        var clients = [];

        wss.clients.forEach(client => {
            if (client.readyState == client.OPEN) {
                clients.push({
                    id: client.id,
                    name: client.name,
                    group: client.group
                });
            }
        });

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.write(JSON.stringify(clients));
        res.end();

        return;
    }

    res.write(AppName);
    res.end();
}).listen(httpPort);

wss.on('connection', function (client) {
    client.id = clientIncrement++;

    client.on('message', function (payload) {
        var message = JSON.parse(payload);

        if (message.type == 'omni.listen') {
            if (message.group == null) return;
            client.group = message.group;

            if (groups[message.group] == undefined) {
                groups[message.group] = [];
            }

            groups[message.group].push(client);
        } else if (message.type == 'omni.trigger') {
            sendToGroup(groups[message.group], {
                type: 'omni.event',
                event: message.event,
                data: message.data
            }, client);
        }
    });

    client.on('close', function () {
        if (client.group == undefined) return;

        for (let i = 0; i < groups[client.group].length; i++) {
            const _client = groups[client.group][i];
            if (_client.id == client.id) {
                groups[client.group].splice(i, 1);
                break;
            }
        }
    });

    client.send(JSON.stringify({
        type: 'ommi.connected',
        clientId: client.id
    }));
});

function sendToGroup(group, message, current) {
    if (group == null) return;
    if (message == null) return;

    for (let i = 0; i < group.length; i++) {
        const client = group[i];
        if (current != null && client.id == current.id) continue;
        sendMessage(message, client);
    }
}

function sendMessage(message, client) {
    if (client.readyState != client.OPEN) return;
    client.send(JSON.stringify(message));
}

console.log(AppName);