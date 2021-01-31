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
import UpdateUserInfoEvent from "../types/events/UpdateUserInfoEvent";

const log = logger("websocket");

class WebSocketServer {
  server: ws.Server;
  sessionManager: SessionManager;
  clientList: Array<CustomSocket> = [];
  heartbeatInterval?: NodeJS.Timeout;
  config: any;

  constructor(server: http.Server, sessions: SessionManager) {
    this.server = new ws.Server({ server });

    this.sessionManager = sessions;
    this.sessionManager.wsServer = this;

    this.sendHeartbeat = this.sendHeartbeat.bind(this);


    // Event listeners

    this.server.on('connection', (socket: CustomSocket, request) => {

      //If a new client has been determined, handle new connection
      if (this.clientList.find((c) => c === socket) === undefined) {
        this.handleConnection(socket, request);
      }

      //Handle messages by connected clients
      socket.onmessage = (message): void => {
        const eventType = JSON.parse(message.data).eventType
        if (eventType) {
          this.receiveMessage(socket, eventType, message.data);
        } else {
          log.info('Unexpected packet received');
        }
      }

      //Handle closing connections
      socket.onclose = (ev): void => {
        socket.inSession = false;
        this.clientList = this.clientList.filter((s) => s !== socket);
        log.info(`${socket.userName} | ${socket.userId} disconnected `);
      }
    });

  }

  //Heartbeat interval for client <-> server heartbeats to detect zombie clients
  //TODO: sometimes clients dont respond due to load loading times for objects. Detect this or increase heartbeat time
  startHeartbeat(): void {
    this.heartbeatInterval = setInterval(this.sendHeartbeat, 30000);
  }

  stopHeartbeat(): void {
    if (!this.heartbeatInterval !== undefined) {
      clearInterval(this.heartbeatInterval as NodeJS.Timeout);
      this.heartbeatInterval = undefined;
    }
  }

  handleConnection(socket: CustomSocket, request: http.IncomingMessage): void {
    this.clientList.push(socket);
    //Get IPv4 Address of the client
    const ip = request.connection.remoteAddress!.replace(/^.*:/, '');
    socket.isAlive = true;
    socket.ip = ip;
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

    //Drop unresponsive clients
    this.clientList.forEach((c) => {
      if (c.isAlive) {
        c.send(heartbeatSerialized)
        c.isAlive = false;
      } else {
        log.info('Heartbeat not replied to in time. Dropping client');
        const activeUser = this.sessionManager.getUserBySocket(c);
        if (activeUser === undefined) {
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

    //Determine behavior depending on eventType. This is probably the worst way to implement this but I couldnt care less
    switch (eventType) {
      case 'heartbeat':
        const s = this.clientList.find((c) => c === socket);
        if (s !== undefined)
          s.isAlive = true;
        break;
      case 'clientPosition':
        let userId = socket.userId;
        if (userId === undefined) {
          log.info('Unregistered client message. Ignoring');
          break;
        }
        const userSession = this.sessionManager.getUsersSession(userId)
        if (userSession === undefined) {
          log.info('Client sent position without Session');
          break;
        }
        userSession.updateUsersPosition(message);
        break;
      case 'clientLeave':
        const userId2 = socket.userId;
        if (userId2 === undefined) {
          log.info('Unregistered client message. Ignoring');
          break;
        }
        if (socket.inSession)
          this.sessionManager.dropUser(userId2);
        socket.close();
        break;
      case 'clientJoin':
        log.info('A client sent clientJoin event... this shouldn\'t be possible');
        break;
      case 'joinSession':
        const obj = JSON.parse(message);
        const aU = ActiveUser.toActiveUser({ userId: socket.userId || '-1', position: obj.position, rotation: obj.rotation }, socket);
        const result = this.sessionManager.addUserToSession(obj.sessionId, aU);
        if (result === undefined) {
          this.sendEvent(new ErrorEvent('Cannot join session: Session does not exist!'), socket);
          break;
        }
        socket.inSession = true;
        this.sendEvent(new JoinSessionEvent(result.state.data.id, result.state.data.sessionName, result.state.data.host, result.state.data.objectConfig), socket);
        break;
      case 'newNote':
        const userId3 = socket.userId;
        if (userId3 === undefined) {
          log.info('Unregistered client message. Ignoring');
          break;
        }
        this.sessionManager.createNote(userId3, message);
        break;
      case 'editNote':
        const userId5 = socket.userId;
        if (userId5 === undefined) {
          log.info('Unregistered client message. Ignoring');
          break;
        }
        log.info('Note Update Event');
        this.sessionManager.editNote(userId5, message);
        break;
      case 'deleteNote':
        const userId6 = socket.userId;
        if (userId6 === undefined) {
          log.info('Unregistered client message. Ignoring');
          break;
        }
        this.sessionManager.deleteNote(userId6, message);
        break;
      case 'newSession':
        const newSession = this.sessionManager.createSession(JSON.parse(message), socket);
        if (newSession === undefined) {
          this.sendEvent(new ErrorEvent('Could not create Session!'), socket);
          break;
        }
        this.clientList.forEach((c) => {
          this.sendEvent(new SessionListEvent(this.sessionManager.getReducedSessions()), c);
        })
        socket.inSession = true;
        this.sendEvent(new NewSessionEvent(newSession.SessionID, newSession.state.data.host, newSession.state.data.sessionName, newSession.state.data.objectConfig), socket);
        break;
      case 'deleteSession':
        this.sessionManager.deleteSession(JSON.parse(message).sessionId);
        break;
      case 'objectConfig':
        const userId8 = socket.userId;
        if (userId8 === undefined) {
          log.info('Unregistered client message. Ignoring');
          break;
        }
        const session = this.sessionManager.getUsersSession(userId8);
        if (session === undefined) {
          log.info('Attempted loading invalid Session');
          break;
        }
        session.updateObjectConfig(JSON.parse(message).config);
        break;
      case 'sessionList':
        this.sendEvent(new SessionListEvent(this.sessionManager.getReducedSessions()), socket);
        break;
      case 'objectList':
        const event = new ObjectListEvent(this.sessionManager.objects);
        this.sendEvent(event, socket);
        break;
      case 'error':
        this.sendEvent(new ErrorEvent('no u'), socket);
        break;
      case 'login':
        const loginEvent = JSON.parse(message);
        if (loginEvent.userId === -1) {
          const e = new LoginEvent(this.sessionManager.generateNewUserID(), loginEvent.userName);
          const c = this.clientList.find((s) => s === socket);
          if (c !== undefined) {
            c.userName = e.userName;
            c.userId = e.userId
            log.info('Login by User ' + e.userId + ' (' + e.userName + '): ' + socket.ip);
            this.sendEvent(e, socket);
          }
        }
        break;
      case 'updateUserInfo':
        const o: UpdateUserInfoEvent = JSON.parse(message);
        if (socket.userId !== o.userId) {
          log.info('User tried falsifying identity');
          break;
        }
        log.info('User ' + socket.userId + " changed username from " + socket.userName + ' to ' + o.userName);
        this.updateUserSocket(socket.userId, o);
        if (socket.inSession) {
          this.sessionManager.updateUser(o, socket);
        }
        break;
      case 'clientSessionLeave':
        const userId4 = socket.userId;
        if (userId4 === undefined) {
          log.info('Unregistered client message. Ignoring');
          break;
        }
        this.sessionManager.dropUser(userId4);
        socket.inSession = false;
        break;
      case 'requestNotes':
        log.info(`Note List Request from ${socket.userName} | ${socket.userId}`);
        const userId7 = socket.userId;
        if (userId7 === undefined) {
          log.info('Unregistered client message. Ignoring');
          break;
        }
        const user = this.sessionManager.getUser(userId7)
        const userSession2 = this.sessionManager.getUsersSession(userId7);
        if (userSession2 === undefined || user === undefined) {
          log.info('Could not find users Session');
          break;
        }
        log.info('Sending all Notes');
        userSession2.sendAllNotesToUser(user);
        break;
      default:
        log.info('Unimplemented eventType of: ' + eventType + ' received!');
        break;
    }
  }

  updateUserSocket(userId: number, userUpdate: UpdateUserInfoEvent): void {
    const u = this.clientList.find((u) => u.userId === userId);
    if (u === undefined) {
      log.info('Attempted to update invalid user');
      return;
    }
    u.userName = userUpdate.userName;
  }

}

export default WebSocketServer;