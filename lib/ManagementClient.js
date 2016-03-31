'use strict';

const util = require('./util.js');

module.exports = socket => {
    // const history = [];

    util.createLinesEmitter(socket)
        .on('line', line => onLine(line));

    // console.log('client connected');
    socket.on('data', data => {
        console.log(`MClient ${Date.now()} -> ${data.toString()}`);
    });
    // socket.on('end', () => {
    //     console.log('client disconnected');
    // });
    // socket.on('error', err => {
    //     console.log('management client error', err);
    // });
    sendCommand('log on all');
    sendCommand('status');
    sendCommand('state on all');

    const managementClient = {
        events: util.createEventEmitter(),
        authenticateUserPass,
    };

    socket.on('error', err => {
        managementClient.events.emit('error', err);
    });
    socket.on('end', () => {
        managementClient.events.emit('end');
    });
    return Object.freeze(managementClient);

    function onLine(line) {
        // history.push(line);

        if (line.includes('>PASSWORD:Need \'Auth\' username/password')) {
            managementClient.events.emit('auth_request');
        }

        if (line.includes('CONNECTED,SUCCESS')) {
            managementClient.events.emit('connect_success');
        }
    }

    function sendCommand(command) {
        const textToWrite = 'undefined' === typeof command ? '' : command;
        socket.write(`${textToWrite}\n\r`);
    }

    function authenticateUserPass(user, pass) {
        sendCommand(`username "Auth" ${user}`);
        sendCommand(`password "Auth" ${pass}`);
        sendCommand();
    }
};

