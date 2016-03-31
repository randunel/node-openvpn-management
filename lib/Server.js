'use strict';

const Openvpn = require('./Openvpn.js');

module.exports = params => {
    const server = {
        management: null,
        managementClient: null,
        proc: null
    };

    const specificConfigOptions = prepareConfigOptions(params);

    return Openvpn(Object.assign({}, params, {specificConfigOptions}))
        .then(openvpn => {
            handleOpenvpnInstance(openvpn);
            return Object.freeze(Object.assign({}, server));
        });

    function handleOpenvpnInstance(openvpn) {
        Object.assign(server, openvpn);
        server.management.events.once('mclient_connected', mclient => handleManagementClient(mclient));
    }

    function handleManagementClient(mclient) {
        server.managementClient = mclient;
    }

    function prepareConfigOptions() {
        const specificConfigOptions = [
            '--mode server',
            `--server ${params.network}`,
            '--client-to-client',
            '--tls-server',
            '--keepalive 10 60',
            '--push redirect-gateway',
            '--push def1',
            '--push bypass-dhcp',
            '--ifconfig-noexec',
            '--route-noexec',
        ];
        return specificConfigOptions;
    }
};

