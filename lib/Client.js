'use strict';

const Openvpn = require('./Openvpn.js');
const util = require('./util.js');

module.exports = params => {
    const client = {
        management: null,
        managementClient: null,
        proc: null
    };

    const requiresUserPass = 'string' === typeof params.user && 'string' === typeof params.pass;
    const specificConfigOptions = prepareConfigOptions();

    return Openvpn(Object.assign({}, params, {specificConfigOptions}))
        .then(openvpn => {
            handleOpenvpnInstance(openvpn);
            return waitForMclient();
        })
        .then(mclient => {
            handleManagementClient(mclient);
            return waitForConnectSuccess();
        })
        .then(() => {
            return Object.freeze(Object.assign({}, client));
        });

    function waitForConnectSuccess() {
        return Promise.race([
            new Promise(resolve => client.managementClient.events.once('connect_success', resolve)),
            util.throwAfterTimeout(new Error('Timeout waiting for connect_success'), 10000)
        ]);
    }

    function waitForMclient() {
        return Promise.race([
            new Promise(resolve => client.management.events.once('mclient_connected', resolve)),
            util.throwAfterTimeout(new Error('Timeout waiting for mclient'), 10000)
        ]);
    }

    function handleOpenvpnInstance(openvpn) {
        Object.assign(client, openvpn);
    }

    function handleManagementClient(mclient) {
        client.managementClient = mclient;
        if (requiresUserPass) {
            mclient.events.on('auth_request', () => authenticateUserPass());
        }
    }

    function authenticateUserPass() {
        client.managementClient.authenticateUserPass(params.user, params.pass);
    }

    function prepareConfigOptions() {
        const specificConfigOptions = [
            '--client',
            '--nobind',
            '--ns-cert-type server',
        ];
        if (requiresUserPass) {
            specificConfigOptions.push('--management-query-passwords');
            specificConfigOptions.push('--auth-user-pass');
        }
        return specificConfigOptions;
    }
};

