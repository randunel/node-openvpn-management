'use strict';

const serverFactory = require('../index.js').serverFactory;
const clientFactory = require('../index.js').clientFactory;
const util = require('../lib/util.js');
const should = require('should'); // jshint ignore: line

const assetsPath = './assets';
const pathCA = `${assetsPath}/root.crt`;
const pathCERT = `${assetsPath}/server.crt`;
const pathKEY = `${assetsPath}/server.key`;
const pathDH = `${assetsPath}/dh1024.pem`;
const pathClient1CERT = `${assetsPath}/client1.crt`;
const pathClient1KEY = `${assetsPath}/client1.key`;
let ca, cert, key, dh, c1cert, c1key;
// const pathClient2CERT = `${assetsPath}/client2.crt`;
// const pathClient2KEY = `${assetsPath}/client2.key`;

describe('server', function() {
    this.timeout(1000000);
    before(() => initialiseServerCerts()
        .then(() => initialiseClientCerts()));
    after(() => removeCerts());

    describe('process', () => {
        let server;
        beforeEach(() => serverFactory({
            ca,
            cert,
            key,
            dh,
            network: '10.11.12.0 255.255.255.0',
            port: 1194
        })
            .then(_server => server = _server));
        afterEach(() => server.stop());

        it('should run', () => util.resolveObjectProps({
            pid: server.pid(),
            ps: util.exec('ps -A')
        })
            .then(results => {
                const regex = new RegExp(`\\s*${results.pid}\\s*`);
                results.ps.should.match(regex);
                results.ps.split('\n')
                    .find(line => regex.test(line))
                    .should.containEql('openvpn');
            }));

        it('should terminate when stopping', () => server.pid()
            .then(pid => {
                return server.stop()
                    .then(() => util.exec('ps -A')
                        .then(output => {
                            output.should.not.containEql(`\n${pid}`);
                        }));
            }));
    });

    describe('openvpn', () => {
        let server;
        beforeEach(() => serverFactory({
            ca,
            cert,
            key,
            dh,
            network: '10.11.12.0 255.255.255.0',
            port: 1194
        })
            .then(_server => server = _server));
        afterEach(() => server.stop());

        it('should accept incoming connections', () => clientFactory({
            ca,
            cert: c1cert,
            key: c1key,
            remote: '127.0.0.1',
            port: 1194
        }));
    });

});

function initialiseServerCerts() {
    return util.mkdir(assetsPath)
        .then(() => util.exec('../node_modules/.bin/2cca dh 1024', {cwd: assetsPath}))
        .then(() => util.exec('../node_modules/.bin/2cca root', {cwd: assetsPath}))
        .then(() => util.exec('../node_modules/.bin/2cca server', {cwd: assetsPath}))
        .catch(() => {})
        .then(() => util.resolveObjectProps({
            ca: util.readFile(pathCA),
            cert: util.readFile(pathCERT),
            key: util.readFile(pathKEY),
            dh: util.readFile(pathDH)
        }))
        .then(results => {
            ca = results.ca;
            cert = results.cert;
            key = results.key;
            dh = results.dh;
        });
}

function initialiseClientCerts() {
    return Promise.all([
        util.exec('../node_modules/.bin/2cca client CN=client1', {cwd: assetsPath}),
        util.exec('../node_modules/.bin/2cca client CN=client2', {cwd: assetsPath}),
    ])
        .then(() => util.resolveObjectProps({
            c1cert: util.readFile(pathClient1CERT),
            c1key: util.readFile(pathClient1KEY)
        }))
        .then(results => {
            c1cert = results.c1cert;
            c1key = results.c1key;
        });
}

function removeCerts() {
}

