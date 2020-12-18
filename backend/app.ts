/* eslint-disable @typescript-eslint/no-use-before-define */
import express from 'express';
import http from 'http';

import WebSocketServer from './websocket';
import logger, { setLogLevel } from './logging';
import { AddressInfo } from 'net';
import minimist from 'minimist';
import GlobalContext from './GlobalContext';
import './Console';
import SessionManager from './types/SessionManager';
import { registerHandler } from './Console';

const argv = minimist(process.argv.slice(2));

// Needs to be done before logging is initialized, in order to set log level correctly
GlobalContext.commandLine = {
  resourcePath: argv['resourcePath'] || './sessionData',
  debug: argv['debug'],
};
if (GlobalContext.commandLine.debug) {
  setLogLevel('debug');
}
const log = logger('main');
const app = express();

log.info(' /$$      /$$ /$$      /$$  /$$$$$$  /$$$$$$$     ');
log.info('| $$  /$ | $$| $$$    /$$$ /$$__  $$| $$__  $$    ');
log.info('| $$ /$$$| $$| $$$$  /$$$$| $$  \\ $$| $$  \\ $$  ');
log.info('| $$/$$ $$ $$| $$ $$/$$ $$| $$$$$$$$| $$$$$$$/    ');
log.info('| $$$$_  $$$$| $$  $$$| $$| $$__  $$| $$__  $$    ');
log.info('| $$$/ \\  $$$| $$\\  $ | $$| $$  | $$| $$  \\ $$ ');
log.info('| $$/   \\  $$| $$ \\/  | $$| $$  | $$| $$  | $$  ');
log.info('|__/     \\__/|__/     |__/|__/  |__/|__/  |__/   ');


log.debug('Logging in debug mode!');
log.info('Configuration: ' + JSON.stringify(GlobalContext.commandLine));

let wsServer: WebSocketServer;
const sessionList = new SessionManager();

registerHandler((keyevent) => {
  if(keyevent.ctrl && keyevent.name === 'c') {
    sessionList.closeAllSessions();
    process.exit();
  }
})

const main = async (): Promise<void> => {

  const server = http.createServer(app);
  app.use('/cache', express.static(__dirname + '/../cache'));
  wsServer = new WebSocketServer(server, sessionList);
  sessionList.loadAllSessions();
  wsServer.startHeartbeat();

  server.listen(process.env.PORT || 8081, () => {
    if (server.address() === null) {
      return log.error('Failed to start server.');
    }
    const serverAddress = server.address() as AddressInfo;
    return log.info(`Server started on ${JSON.stringify(serverAddress)}`);
  });
};

main().then();
