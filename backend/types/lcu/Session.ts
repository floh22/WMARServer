import DataProvider from '../../data/DataProvider';
import State from '../../state';
import WebSocketServer from '../../websocket/WebSocketServer';
import ClientEvent from '../events/ClientEvent';
import ActiveUser from './ActiveUser';
import { EventEmitter } from 'events';
import ObjectConfig from '../containers/ObjectConfig';
import ClientLeaveEvent from '../events/ClientLeaveEvent';
import ClientPositionEvent from '../events/ClientPositionEvent';
import logger from '../../logging';
import Timeout = NodeJS.Timeout;

const log = logger('Session');

export class Session extends EventEmitter {

  SessionID: number;
  SessionAge: number
  currentUsers: Array<ActiveUser> = [];
  dataProvider: DataProvider;
  state: State;
  wsServer: WebSocketServer;
  lastUpdate = Date.now();
  timeout?: Timeout;


  constructor(sessionId: number, host: string, sessionName: string, objectConfig: ObjectConfig, dataProvider: DataProvider, wsServer: WebSocketServer) {
    super();
    this.wsServer = wsServer;
    this.SessionAge = 0;
    this.SessionID = sessionId;
    this.dataProvider = dataProvider;
    this.state = new State();
    this.state.data.host = host;
    this.state.data.sessionName = sessionName;
    this.state.data.id = sessionId;
    this.state.data.objectConfig = objectConfig;
  }

  startLoop(): void {
    this.timeout = setInterval(() => this.runLoop(), 40);
  }

  stopLoop(): void {
    const t = this.timeout;
    if(t === undefined) {
      log.info('Could not find Main Loop to stop');
      return;
    }
    clearTimeout(t);
  }

  runLoop(): void {
    this.updatePositions();
    const newTime = Date.now();
    const diff = newTime - this.lastUpdate;
    //log.info('tps: ' + 1000 / diff);
    this.lastUpdate = Date.now();
  }

  hasUser(userId: number): boolean {
    return (this.currentUsers.find((u) => u.activeId === userId) !== undefined);
  }

  sendEventToUsers(e: ClientEvent): void {
    this.currentUsers.forEach(u => {
      this.wsServer.sendEvent(e, u.socket);
    });
  }

  sendTextToUsers(m: string): void {
    this.currentUsers.forEach(u => {
      this.wsServer.sendText(m, u.socket);
    })
  }

  kickAllUsers(): void {
    this.currentUsers.forEach((u) => {
      this.wsServer.sendEvent(new ClientLeaveEvent(u.activeId), u.socket);
    });
  }

  updateTime(): void {
    this.SessionAge += 0 - this.lastUpdate;
  }

  updateUsersPosition(message: string): void {
    const jsonObj = JSON.parse(message);
    const u = this.currentUsers.find((u) => u.activeId === jsonObj.userId);
    if (u === undefined) {
      return;
    }
    u.positionChanged = true;
    u.position = jsonObj.updatedPosition;
    u.rotation = jsonObj.updatedRotation;
  }

  updatePositions(): void {
    const changedClients: Array<ActiveUser> = []
    this.currentUsers.forEach(u => {
      if(u.positionChanged) {
        changedClients.push(u);
        u.positionChanged = false;
      }
    });
    if (changedClients.length === 0) {
      return;
    }
    this.sendTextToUsers(new ClientPositionEvent(changedClients).toJson());
  }

}