'use strict';

const net = require('net');
const util = require('./util.js');
const managementClientConstructor = require('./ManagementClient.js');

module.exports = () => {
    const server = net.createServer({
        allowHalfOpen: false
    });

    const management = {
        events: util.createEventEmitter(),
        port: undefined,
        ip: undefined,
        stop,
    };

    return new Promise((resolve, reject) => {
        server.listen({
            port: undefined,
            host: 'localhost'
        })
            .on('error', onError)
            .once('listening', () => {
                handleServerListening();
                removeErrorHandler();
                resolve(Object.freeze(Object.assign(management, {
                    port: server.address().port,
                    ip: server.address().address
                })));
            });

        function onError(err) {
            reject(err);
        }

        function removeErrorHandler() {
            server.removeListener('error', onError);
        }
    });

    function handleServerListening() {
        server.on('connection', socket => {
            const client = managementClientConstructor(socket);
            management.events.emit('mclient_connected', client);
        })
            .on('error', err => {
                console.log('mgmt server error', err);
            });
    }

    function stop() {
        return new Promise(resolve => {
            server.close(resolve);
        });
    }
};

