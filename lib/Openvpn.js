'use strict';

const managementFactory = require('./Management.js');
const util = require('./util.js');

module.exports = params => {
    const specificConfigOptions = params.specificConfigOptions;
    const openvpn = {
        // management: null,
        // proc: null,
        pid,
        stop,
    };

    return managementFactory()
        .then(management => util.resolveObjectProps({
            management,
            config: buildConfig(management.ip, management.port)
        }))
        .then(results => {
            openvpn.management = results.management;
            const config = results.config;
            openvpn.proc = util.execNoWait(`openvpn ${config}`, {
                stdio: 'ignore'
            });
            // openvpn.proc.stdout.on('data', buf => console.log(buf.toString()));
            // openvpn.proc.stderr.on('data', buf => console.log(buf.toString()));
            return openvpn;
        });

    function buildConfig(managementIp, managementPort) {
        return prepareConfigOptions(params, managementIp, managementPort)
            .then(defaultConfig => {
                const configOptions = [].concat(defaultConfig, specificConfigOptions);
                return configOptions.join(' ');
            });
    }

    function pid() {
        return Promise.resolve(openvpn.proc.pid);
    }

    function stop() {
        openvpn.proc.kill();
        return openvpn.management.stop();
    }
};

function prepareConfigOptions(params, managementIp, managementPort) {
    const commandParams = [
        '--topology subnet',
        '--dev tun',
        `--management ${managementIp} ${managementPort}`,
        '--management-client',
        '--management-signal',
        '--management-up-down',
    ];
    ['verb', 'comp-lzo', 'remote', 'port', 'proto', 'dev', 'key-direction', 'cipher'].forEach(name => {
        if (params[name]) {
            commandParams.push(`--${name} ${params[name]}`);
        }
    });
    ['ca', 'cert', 'key', 'dh', 'tls-auth'].forEach(param => {
        if (params[param]) {
            commandParams.push(`--${param}`);
            commandParams.push(util.mktempfile(params[param]));
        }
    });
    return Promise.all(commandParams);
}

