'use strict';

const fs = require('fs');
const spawn = require('child_process').spawn;
const path = require('path');
const EventEmitter = require('events').EventEmitter;

exports.readdir = path => {
    return new Promise((resolve, reject) => {
        fs.stat(path, (err, files) => {
            if (err) {
                return reject(err);
            }
            resolve(files);
        });
    });
};

exports.readFile = path => {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, buf) => {
            if (err) {
                return reject(err);
            }
            resolve(buf);
        });
    });
};

exports.mkdir = path => {
    return new Promise((resolve, reject) => {
        fs.mkdir(path, (err, fd) => {
            if (err) {
                return reject(err);
            }
            resolve(fd);
        });
    });
};

exports.appendFile = (path, content) => {
    return new Promise((resolve, reject) => {
        fs.appendFile(path, content, err => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
};

exports.mktemp = content => {
    return exports.exec('mktemp')
        .then(path => {
        path = path.trim();
        return exports.appendFile(path.trim(), content)
            .then(() => path);
        });
};

exports.open = (path, flags) => {
    return new Promise((resolve, reject) => {
        fs.open(path, flags, (err, fd) => {
            if (err) {
                return reject(err);
            }
            resolve(fd);
        });
    });
};

exports.unlink = path => {
    return new Promise((resolve, reject) => {
        fs.unlink(path, err => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
};

exports.mktempfile = content => {
    return exports.mktemp(content)
        .then(path => {
            return exports.open(path, 'r')
                .then(fd => {
                    return exports.unlink(path)
                        .then(() => fd);
                });
        })
        .then(fd => {
            return path.join('/proc', String(process.pid), 'fd', String(fd));
        });
};

exports.exec = (cmd, options) => {
    return new Promise((resolve, reject) => {
        const bin = cmd.split(' ').shift();
        const params = cmd.split(' ').slice(1);
        const child = spawn(bin, params, options);
        let res = new Buffer(0);
        let err = new Buffer(0);

        child.stdout.on('data', buf => res = Buffer.concat([res, buf], res.length + buf.length));
        child.stderr.on('data', buf => err = Buffer.concat([err, buf], err.length + buf.length));
        child.on('close', code => {
            return setImmediate(() => {
                // setImmediate is required because there are often still
                // pending write requests in both stdout and stderr at this point
                // console.log(cmd, err.toString(), res.toString());
                if (code) {
                    return reject(err.toString());
                }
                resolve(res.toString());
            });
        });
        child.on('error', reject);
    });
};

exports.execNoWait = (cmd, options) => {
    const bin = cmd.split(' ').shift();
    const params = cmd.split(' ').slice(1);
    return spawn(bin, params, options);
};

exports.resolveObjectProps = obj => {
    return Promise.all(Object.keys(obj)
        .map(key => Promise.resolve(obj[key])
            .then(val => [key, val]))
    )
        .then(all => all.reduce((prev, curr) => (prev[curr[0]] = curr[1], prev), {}));
};

exports.createEventEmitter = () => {
    return new EventEmitter();
};

exports.createLinesEmitter = dataEmitter => {
    let remainder = '';
    const events = exports.createEventEmitter();

    dataEmitter.on('data', data => {
        remainder += data.toString();
        processRemainder();
    });

    return events;

    function processRemainder() {
        const lines = remainder.split('\r\n');
        remainder = lines.pop();
        lines.forEach(line => {
            events.emit('line', line);
        });
    }
};

exports.promiseTimeout = timeout => {
    return new Promise(resolve => setTimeout(resolve, timeout));
};

exports.throwAfterTimeout = (err, timeout) => exports.promiseTimeout(timeout)
    .then(() => Promise.reject(err));

