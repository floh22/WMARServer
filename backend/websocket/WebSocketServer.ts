/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable quotes */
import * as ws from "ws";
import * as http from "http";
import fetch from "node-fetch";

import logger from "../logging";
import { StateData } from "../types/dto";
import State from "../state";
import ClientEvent from '../types/events/ClientEvent'
import NewStateEvent from "../types/events/NewStateEvent";
import HeartbeatEvent from "../types/events/HeartbeatEvent";
import SessionListEvent from "../types/events/SessionListEvent";
import { Session } from "../types/lcu/Session";
import SessionManager from "../types/SessionManager";
import CustomSocket from "./CustomSocket";
import ObjectListEvent from "../types/events/ObjectListEvent";
import ClientJoin from "../types/events/ClientJoin";
import ErrorEvent from "../types/events/ErrorEvent";
import NewSessionEvent from "../types/events/NewSessionEvent";
import LoginEvent from "../types/events/LoginEvent";
import JoinSessionEvent from "../types/events/JoinSessionEvent";
import ActiveUser from "../types/lcu/ActiveUser";
import { info } from "console";

const log = logger("websocket");

class WebSocketServer {
  server: ws.Server;
  sessionManager: SessionManager;
  clientList: Array<CustomSocket> = [];
  exampleClients: Array<WebSocket> = [];
  heartbeatInterval?: NodeJS.Timeout;
  config: any;

  constructor(server: http.Server, sessions: SessionManager) {
    this.server = new ws.Server({ server });

    this.sessionManager = sessions;
    this.sessionManager.wsServer = this;

    this.sendHeartbeat = this.sendHeartbeat.bind(this);


    // Event listeners

    this.server.on('connection', (socket: CustomSocket, request) => {

      if (this.clientList.find((c) => c === socket) === undefined) {
        this.handleConnection(socket, request);
      }

      socket.onmessage = (message): void => {
        const eventType = JSON.parse(message.data).eventType
        if (eventType) {
          this.receiveMessage(socket, eventType, message.data);
        } else {
          log.info('Unexpected packet received');
        }
      }
    });

    /*
    state.on("stateUpdate", (newState: StateData) => {
      newState.config = this.config;
      this.sendEvent(new NewStateEvent(newState));
    });
    state.on("champSelectStarted", () =>
      this.sendEvent(new ChampSelectStartedEvent())
    );
    state.on("champSelectEnded", () =>
      this.sendEvent(new ChampSelectEndedEvent())
    );
    state.on("newAction", (action) => {
      this.sendEvent(new NewActionEvent(action));
    });
    */

  }

  startHeartbeat(): void {
    this.heartbeatInterval = setInterval(this.sendHeartbeat, 10000);
  }

  stopHeartbeat(): void {
    if (!this.heartbeatInterval !== undefined) {
      clearInterval(this.heartbeatInterval as NodeJS.Timeout);
      this.heartbeatInterval = undefined;
    }
  }

  handleConnection(socket: CustomSocket, request: http.IncomingMessage): void {
    this.clientList.push(socket);
    log.info('New connection established with client at ' + request.connection.remoteAddress);
    socket.send(JSON.stringify(new SessionListEvent(this.sessionManager.getReducedSessions())));
    socket.isAlive = true;
  }

  sendEvent(event: ClientEvent, client: WebSocket): void {
    const serializedEvent = JSON.stringify(event);
    log.debug(`New Event: ${serializedEvent}`);

    client.send(serializedEvent);
  }

  sendText(message: string, client: WebSocket): void {
    log.debug(`New Event: ${message}`);

    client.send(message);
  }


  sendHeartbeat(): void {
    const heartbeatEvent = new HeartbeatEvent();
    const heartbeatSerialized = JSON.stringify(heartbeatEvent);

    this.clientList.forEach((c) => {
      if (c.isAlive) {
        c.send(heartbeatSerialized)
        c.isAlive = false;
      } else {
        log.info('Heartbeat not replied to in time. Dropping client');
        const activeUser = this.sessionManager.getUserBySocket(c);
        if(activeUser === undefined) {
          log.info('Couldnt map Websocket to ActiveUser. Were they not in a session?');
        } else {
          this.sessionManager.dropUser(activeUser.activeId);
        }
        this.clientList = this.clientList.filter((s) => s !== c);
        c.close();
      }
    })

  }

  receiveMessage(socket: CustomSocket, eventType: string, message: string): void {
    switch (eventType) {
      case 'heartbeat':
        const s = this.clientList.find((c) => c === socket);
        if (s !== undefined)
          s.isAlive = true;
        break;
      case 'clientPosition':
        const userId = socket.userId;
        if(userId === undefined) {
          log.info('Unregistered client sent position. Ignoring');
          break;
        }
        const userSession = this.sessionManager.getUsersSession(userId)
        if(userSession === undefined) {
          log.info('Client sent position without Session');
          break;
        }
        userSession.updateUsersPosition(message);
      case 'clientLeave':
        break;
      case 'clientJoin':
        log.info('A client sent clientJoin event... this shouldn\'t be possible');
        break;  
      case 'joinSession':
        const aU = ActiveUser.toActiveUser({ userId: socket.userId || '-1', position: { x: 0, y: 0, z: 0 }, rotation: { w: 0, x: 0, y: 0, z: 0 } }, socket);
        const result = this.sessionManager.addUserToSession(JSON.parse(message).sessionId, aU);
        if (result === undefined) {
          this.sendEvent(new ErrorEvent('Cannot join session: Session does not exist!'), socket);
          break;
        }
        this.sendEvent(new JoinSessionEvent(result.state.data.id, result.state.data.sessionName, result.state.data.host, result.state.data.objectConfig), socket);
        break;
      case 'newNote':
        break;
      case 'editNote':
        break;
      case 'deleteNote':
        break;
      case 'newSession':
        const newSession = this.sessionManager.createSession(JSON.parse(message), socket);
        if(newSession === undefined) {
          this.sendEvent(new ErrorEvent('Could not create Session!'), socket);
          break;
        }
        this.clientList.forEach((c) => {
          this.sendEvent(new SessionListEvent(this.sessionManager.getReducedSessions()), c);
        })
        this.sendEvent(new NewSessionEvent(newSession.SessionID, newSession.state.data.host, newSession.state.data.sessionName, newSession.state.data.objectConfig), socket);
        break;
      case 'deleteSession':
        this.sessionManager.deleteSession(JSON.parse(message).sessionId);
        break;
      case 'objectConfigChange':
        break;
      case 'sessionList':
        this.sendEvent(new SessionListEvent(this.sessionManager.getReducedSessions()), socket);
        break;
      case 'objectList':
        const event = new ObjectListEvent(this.sessionManager.objects);
        log.info("Sending Object List event: " + JSON.stringify(event));
        this.sendEvent(event, socket);
        break;
      case 'error':
        this.sendEvent(new ErrorEvent('no u'), socket);
        break;
      case 'login':
        const loginEvent = JSON.parse(message);
        if(loginEvent.userId === -1) {
          const e = new LoginEvent(this.sessionManager.generateNewUserID(), loginEvent.userName);
          const c = this.clientList.find((s) => s === socket);
          if(c !== undefined) {
            c.userName = e.userName;
            c.userId = e.userId
            log.info(JSON.stringify(e));
            this.sendEvent(e, socket);
          }
        }
        break;
      case 'updateUserInfo':
        break;
      default:
        log.info('Unimplemented eventType of: ' + eventType + ' received!');
        break;
    }
  }

  async api(url: string): Promise<any> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    return response.json() as Promise<any>;
  }

}

export default WebSocketServer;