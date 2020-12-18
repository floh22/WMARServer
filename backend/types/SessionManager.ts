/* eslint-disable @typescript-eslint/no-explicit-any */
import ObjectList from './containers/ObjectList';
import ReducedSession from './containers/ReducedSession';
import ActiveUser from './lcu/ActiveUser';
import { Session } from './lcu/Session';
import logger from '../logging';
import WebSocketServer from '../websocket/WebSocketServer';
import ClientJoin from './events/ClientJoin';
import Utils from '../Utils';
import CustomSocket from '../websocket/CustomSocket';
import DataProvider from '../data/DataProvider';
import DeleteSessionEvent from './events/DeleteSessionEvent';

const log = logger('sessionM.');

export default class SessionManager {
    sessionList: Session[] = [];
    usedIds: Array<number> = [];
    wsServer?: WebSocketServer;
    objects: ObjectList;
    dataProvider = new DataProvider();
    static tickRate = 30;

    constructor() {
        this.objects = new ObjectList();
    }

    getReducedSessions(): Array<ReducedSession> {
        const outSessions: Array<ReducedSession> = [];
        this.sessionList.forEach((session) => {
            outSessions.push(new ReducedSession(session));
        })
        return outSessions;
    }

    getUsersSession(userId: number): Session | undefined {
        return this.sessionList.find((s) => s.hasUser(userId))
    }

    getUser(userId: number): ActiveUser | undefined {
        const userSession = this.sessionList.find((s) => s.hasUser(userId));
        if (userSession !== undefined) {
            return userSession.currentUsers.find((u) => u.activeId === userId);
        }
    }

    getUserBySocket(socket: CustomSocket): ActiveUser | undefined {
        let user = undefined;
        this.sessionList.forEach((s) => {
            user = s.currentUsers.find((u) => u.socket === socket);
        });
        return user;
    }

    generateNewUserID(): number {
        const currentIDs: number[] = [];
        const ws = this.wsServer;
        if(ws === undefined) {
            log.info('Generated userId before WebSocket started. This will break things');
            return -1;
        }
        ws.clientList.forEach((c) => currentIDs.push(c.userId || 0));
        return Utils.firstMissingPositive(currentIDs);
    }

    getSession(sessionId: number): Session | undefined {
        return this.sessionList.find((s) => s.SessionID === sessionId);
    }

    addUserToSession(sessionId: number, activeUser: ActiveUser): Session | undefined {
        const session = this.getSession(sessionId);
        if (session === undefined) {
            log.info('User tried to join non existant session');
            return undefined;
        } else {
            session.sendEventToUsers(new ClientJoin(activeUser));
            session.currentUsers.push(activeUser);
            log.info(activeUser.socket.userName + ' join Session ' + sessionId);
            return session;
        }
    }

    dropUser(userId: number): void {
        const userSession = this.sessionList.find((s) => s.hasUser(userId))
        if (userSession === undefined)
            return;
        userSession.currentUsers.filter((u) => u.activeId !== userId);
    }

    createSession({ sessionName, objectConfig }: any, socket: CustomSocket): Session | undefined {
        if(this.wsServer === undefined) {
            log.info('Tried creating session before webserver started!');
            return undefined;
        }
        const newId = Utils.firstMissingPositive(this.usedIds);
        this.usedIds.push(newId);
        log.info('Creating new Session by ' + socket.userName + ', name: ' + sessionName + ', id: ' + newId);
        const defaultConfig = this.dataProvider.getDefaultObjectConfig(objectConfig.objectType)
        defaultConfig.objectType = objectConfig.objectType;
        const newSession = new Session(newId, socket.userName || 'defaultUser', sessionName, defaultConfig, this.dataProvider, this.wsServer);
        log.info('Session created. Adding host to session');
        newSession.currentUsers.push(ActiveUser.toActiveUser({ userId: socket.userId || '-1', position: { x: 0, y: 0, z: 0 }, rotation: { w: 0, x: 0, y: 0, z: 0 } }, socket))
        log.info('Writing Session to file');
        this.dataProvider.createSession(newSession.state.data);
        this.sessionList.push(newSession);
        newSession.startLoop();
        log.info('Session created');
        return newSession;
    }

    loadAllSessions(): void {
        const ws = this.wsServer;
        if(ws === undefined) {
            log.info('Tried creating session before webserver started!');
            return;
        }
        log.info('Loading all Sessions. Consider changing this when multiple sessions are created');
        this.dataProvider.getSessions().forEach((sName) => {
            log.info('Loading Session ' + sName);
            const sData = this.dataProvider.readSessionData(sName);
            const newSession = new Session(sData.id, sData.host, sData.sessionName, sData.objectConfig, this.dataProvider, ws);
            this.sessionList.push(newSession);
            newSession.startLoop();
            log.info('Session ' + sName + ' loaded');
        })
        log.info('All Sessions loaded');
    }

    unloadSession(session: Session): void {
        log.info('Unloading Session' + session.SessionID);
        session.kickAllUsers();
        session.sendEventToUsers(new DeleteSessionEvent(session.SessionID));
        session.currentUsers = [];
        session.stopLoop();
        this.dataProvider.writeCurrentData(session.state.data);
        this.sessionList.filter((s) => s.SessionID !== session.SessionID);
        log.info('Session' + session.SessionID + ' unloaded');
    }

    closeAllSessions(): void {
        log.info('Closing all sessions');
        this.sessionList.forEach((s) => {
            this.unloadSession(s);
        });
        log.info('All sessions closed');
    }

    deleteSession(sessionId: number): void {
        const s = this.getSession(sessionId)
        if(s === undefined) {
            log.info('Tried deleting Session that does not exist!');
            return;
        }
        this.unloadSession(s);
        this.dataProvider.deleteSession(sessionId);
    }
}