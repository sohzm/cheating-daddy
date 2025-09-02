/**
 * @module networking
 * @description DCF wrapper with enhanced error handling and optional metric logging for debugging.
 * Errors are caught, logged, and relayed via IPC for GUI display. Metrics (e.g., latency, error rates) are optionally logged via Winston if config.metrics = true.
 */

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const fs = require('fs');
const path = require('path');
const noble = require('@abandonware/noble');
const mdns = require('mdns');
const winston = require('winston');
const { ipcMain } = require('electron');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'dcf-config.json'), 'utf8'));
const enableMetrics = config.metrics || false;  // Optional: Toggle in dcf-config.json

const packageDefinition = protoLoader.loadSync(path.join(__dirname, '../messages.proto'));
const proto = grpc.loadPackageDefinition(packageDefinition).dcf;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.File({ filename: 'network.log' })],
});

let server = null;
let clients = new Map();
let errorCount = 0;  // For metric logging

function startDCFServices() {
  try {
    server = new grpc.Server();
    server.addService(proto.DCFService.service, {
      SendMessage: (call, callback) => {
        try {
          const msg = call.request;
          logger.info(`Received: ${msg.data}`);
          // Handle types...
          callback(null, { data: 'Acknowledged' });
        } catch (err) {
          errorCount++;
          logger.error(`SendMessage error: ${err.message}`);
          ipcMain.emit('dcf-error', { message: err.message });  // Relay to GUI
          callback({ code: grpc.status.INTERNAL, details: err.message });
        }
      },
    });
    server.bindAsync(`${config.host}:${config.port}`, grpc.ServerCredentials.createInsecure(), (err) => {
      if (err) throw err;
      server.start();
    });
  } catch (err) {
    logger.error(`Service start error: ${err.message}`);
    ipcMain.emit('dcf-error', { message: 'Failed to start DCF services' });
  }
}

async function connectToPeer(peerAddress) {
  try {
    if (!clients.has(peerAddress)) {
      const client = new proto.DCFService(peerAddress, grpc.credentials.createInsecure());
      clients.set(peerAddress, client);
    }
    return clients.get(peerAddress);
  } catch (err) {
    errorCount++;
    logger.error(`Connect error: ${err.message}`);
    ipcMain.emit('dcf-error', { message: `Failed to connect to ${peerAddress}` });
    throw err;  // Rethrow for caller handling
  }
}

async function sendToPeers(payload, recipient = null, type = 'general') {
  const start = Date.now();
  try {
    const data = JSON.stringify({ type, ...payload });
    clients.forEach(async (client, address) => {
      if (!recipient || address === recipient) {
        await new Promise((resolve, reject) => {
          client.SendMessage({ data }, (err, response) => {
            if (err) reject(err);
            resolve(response);
          });
        });
      }
    });
    if (enableMetrics) {
      const latency = Date.now() - start;
      logger.info(`Send latency: ${latency}ms, errors: ${errorCount}`);
    }
  } catch (err) {
    errorCount++;
    logger.error(`Send error: ${err.message}`);
    ipcMain.emit('dcf-error', { message: err.message });
    throw err;
  }
}

function discoverPeers() {
  try {
    const browser = mdns.createBrowser(mdns.tcp('dcf-service'));
    browser.on('serviceUp', service => {
      const address = `${service.addresses[0]}:${service.port}`;
      connectToPeer(address).catch(() => {});  // Handle error internally
      ipcMain.emit('peer-discovered', address);
    });
    browser.start();
    const ad = mdns.createAdvertisement(mdns.tcp('dcf-service'), config.port);
    ad.start();
  } catch (err) {
    errorCount++;
    logger.error(`Discovery error: ${err.message}`);
    ipcMain.emit('dcf-error', { message: 'Discovery failed' });
  }
}

class CustomBLETransport {
  setup() {
    noble.on('stateChange', state => {
      if (state === 'poweredOn') {
        noble.startScanning();
      } else {
        logger.warn(`BLE state: ${state}`);
      }
    });
    noble.on('discover', peripheral => {
      ipcMain.emit('peer-discovered', peripheral.uuid);
    });
  }
  send(data) {
    try {
      // BLE write...
    } catch (err) {
      errorCount++;
      logger.error(`BLE send error: ${err.message}`);
      ipcMain.emit('dcf-error', { message: 'BLE send failed' });
    }
  }
}

if (config.plugins.transport === 'custom_ble_transport') new CustomBLETransport().setup();

module.exports = { startDCFServices, sendToPeers, discoverPeers };
