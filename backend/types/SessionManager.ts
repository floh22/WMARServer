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
import ClientLeaveEvent from './events/ClientLeaveEvent';
import UpdateUserInfoEvent from './events/UpdateUserInfoEvent';

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

    //Reduced Sessions for session list events to send basic information about each session only
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

    //Each user gets a new ID on join at runtime. No stored or fixed IDs per user. Maybe in the future?
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
        } else return session.addUser(activeUser);
    }

    //Remove user from Session
    dropUser(userId: number): void {
        const userSession = this.sessionList.find((s) => s.hasUser(userId))
        if (userSession === undefined)
            return;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const user = this.getUser(userId)!;
        userSession.currentUsers = userSession.currentUsers.filter((u) => u.activeId !== userId);
        userSession.sendEventToUsers(new ClientLeaveEvent(userId));
        log.info(`${user.socket.userName} | ${user.activeId} left Session ` + userSession.SessionID);
    }

    //Disconnect User from Server
    disconnectUser(userId: number): void {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const user = this.wsServer!.clientList.find((s) => s.userId === userId);
        if(user === undefined)
            return;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.wsServer!.clientList = this.wsServer!.clientList.filter((s) => s.userId! !== userId);
        log.info(`${user.userName} | ${user.userId} disconnected `);
    }

    //Update User info such as Username
    updateUser(e: UpdateUserInfoEvent, s: CustomSocket): void {
        const session = this.getUsersSession(s.userId!);
        session!.sendEventToUsers(new UpdateUserInfoEvent(s.userId!, e.userName));
    }

    createSession({ sessionName, objectConfig }: any, socket: CustomSocket): Session | undefined {
        if(this.wsServer === undefined) {
            log.info('Tried creating session before webserver started!');
            return undefined;
        }

        //Create new User ID
        const newId = Utils.firstMissingPositive(this.usedIds);
        this.usedIds.push(newId);
        log.info('Creating new Session by ' + socket.userName + ', name: ' + sessionName + ', id: ' + newId);

        //Load default config for selected central object
        const defaultConfig = this.dataProvider.getDefaultObjectConfig(objectConfig.objectType)
        defaultConfig.objectType = objectConfig.objectType;

        //Init Session
        const newSession = new Session(newId, socket.userName || 'defaultUser',
            sessionName,
            defaultConfig,
            [],
            this.dataProvider,
            this.wsServer);
        log.info('Session created. Adding host to session');

        //Add creator to new sesion
        newSession.currentUsers.push( ActiveUser.toActiveUser({ 
            userId: socket.userId || '-1',
            position: { x: 0, y: 0, z: 0 },
            rotation: { w: 0, x: 0, y: 0, z: 0 } }, 
            socket));
        log.info('Writing Session to file');
        this.dataProvider.createSession(newSession.state.data);
        this.sessionList.push(newSession);

        //Start Session loop
        newSession.startLoop();
        this.wsServer.sendEvent(new ClientJoin(newSession.currentUsers[0]).toJson(), socket);
        log.info('Session created');
        return newSession;
    }

    //Atm all sessions are loaded. This might be suboptimal for performance when multiple empty sessions 
    //are permanently running. Atm though this isnt too much of a problem. If this project/server
    //was to ever be used in production though, this would have to be changed
    loadAllSessions(): void {
        const ws = this.wsServer;
        if(ws === undefined) {
            log.info('Tried creating session before webserver started!');
            return;
        }
        log.info('Loading all Sessions. Consider changing this when multiple sessions are created');
        this.dataProvider.getSessions().forEach((sName) => {
            const sData = this.dataProvider.readSessionData(sName);

            //Create new session with proper state data
            const newSession = new Session(sData.id,
                sData.host, sData.sessionName,
                sData.objectConfig,
                sData.notes,
                this.dataProvider,
                ws);
            this.sessionList.push(newSession);
            this.usedIds.push(newSession.SessionID);

            //Start Session loop
            newSession.startLoop();
            log.info('Session ' + sName + ' loaded. Central Object: ' + newSession.state.data.objectConfig.objectType + ' with ' + newSession.state.data.notes.length + ' Notes.');
        })
        log.info('All Sessions loaded');
    }

    unloadSession(session: Session): void {
        log.info('Unloading Session' + session.SessionID);
        session.unload();
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
        this.sessionList.filter((session) => session.SessionID !== sessionId);
        this.dataProvider.deleteSession(sessionId);
    }

    createNote(userId: number, message: string): void {
        const s = this.getUsersSession(userId);
        if(s === undefined) return;
        s.createNote(userId, JSON.parse(message));
    }

    editNote(userId: number, message: string): void {
        const s = this.getUsersSession(userId);
        if(s === undefined) {
            log.info('Could not find users Session!');
            return;
        };
        s.editNote(userId, JSON.parse(message));
    }

    deleteNote(userId: number, message: string): void {
        const s = this.getUsersSession(userId);
        if(s === undefined) return;
        s.deleteNote(userId, JSON.parse(message));
    }
}