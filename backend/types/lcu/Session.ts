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
import Utils from '../../Utils';
import DeleteNoteEvent from '../events/DeleteNoteEvent';
import EditNoteEvent, { EditNoteEventType } from '../events/EditNoteEvent';
import NewNoteEvent from '../events/NewNoteEvent';
import Note from '../containers/Note';
import ObjectConfigChangeEvent from '../events/ObjectConfigChangeEvent';
import DeleteSessionEvent from '../events/DeleteSessionEvent';
import ClientJoin from '../events/ClientJoin';

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


  constructor(sessionId: number, host: string, sessionName: string, objectConfig: ObjectConfig, notes: Array<Note>, dataProvider: DataProvider, wsServer: WebSocketServer) {
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
    this.state.data.notes = notes;
  }

  startLoop(): void {
    this.timeout = setInterval(() => this.runLoop(), 40);
  }

  stopLoop(): void {
    const t = this.timeout;
    if (t === undefined) {
      log.info('Could not find Main Loop to stop');
      return;
    }
    clearTimeout(t);
  }

  runLoop(): void {
    this.updatePositions();
    const newTime = Date.now();
    const diff = newTime - this.lastUpdate;
    this.SessionAge += diff;
    //log.info('tps: ' + 1000 / diff);
    this.lastUpdate = Date.now();
  }

  unload(): void {
    this.kickAllUsers();
    this.sendEventToUsers(new DeleteSessionEvent(this.SessionID));
    this.currentUsers = [];
    this.stopLoop();
    this.dataProvider.writeCurrentDataSync(this.state.data);
  }

  hasUser(userId: number): boolean {
    return (this.currentUsers.find((u) => u.activeId === userId) !== undefined);
  }

  addUser(activeUser: ActiveUser): Session {
    this.currentUsers.push(activeUser);
    log.info(`${activeUser.socket.userName} | ${activeUser.activeId} joined Session ${this.SessionID}`);

    this.sendEventToUsers(new ClientJoin(activeUser).toJson());
    return this;
  }

  sendEventToUsers(e: ClientEvent): void {
    this.currentUsers.forEach(u => {
      u.socket.send(JSON.stringify(e));
    });
  }

  sendTextToUsers(m: string): void {
    this.currentUsers.forEach(u => {
      u.socket.send(m);
    })
  }

  sendAllNotesToUser(user: ActiveUser): void {
    this.state.data.notes.forEach(note => {
      this.sendNoteToUser(user, note);
    });
  }

  sendNoteToUser(user: ActiveUser, note: Note): void {
    user.socket.send(JSON.stringify(new NewNoteEvent(note)));
  }

  kickAllUsers(): void {
    this.currentUsers.forEach((u) => {
      this.wsServer.sendEvent(new ClientLeaveEvent(u.activeId), u.socket);
    });
  }

  updateTime(): void {
    this.SessionAge += 0 - this.lastUpdate;
  }


  //Updates a users position on the server
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

  //Determines if user positions have changed. If so, send all new positions to all in the session
  updatePositions(): void {

    //Users with updated positions
    const changedClients: Array<ActiveUser> = []
    this.currentUsers.forEach(u => {
      if (u.positionChanged) {
        changedClients.push(u);
        u.positionChanged = false;
      }
    });
    //Do not send an event if no changes have taken place
    if (changedClients.length === 0) {
      return;
    }

    //Send single event with all new positions
    this.sendTextToUsers(new ClientPositionEvent(changedClients).toJson());
  }

  //Update the configuration of the central object for all users
  updateObjectConfig(oConf: ObjectConfig): void {
    log.info('Object Config update');
    this.state.data.objectConfig.rotation = oConf.rotation;
    this.state.data.objectConfig.scale = oConf.scale;

    this.dataProvider.writeCurrentDataSync(this.state.data);

    this.sendEventToUsers(new ObjectConfigChangeEvent(this.state.data.objectConfig));
  }

  createNote(userId: number, message: NewNoteEvent): void {
    log.info(JSON.stringify(message));
    if (!message.note || message.note.id !== -1) {
      log.info('Tried creating invalid Note');
      return;
    }

    //Create new note id
    message.note.id = this.generateNoteId();
    this.state.data.notes.push(message.note);

    //write changes to file
    this.dataProvider.createNote(this.state.data, message.note);

    this.sendEventToUsers(new NewNoteEvent(message.note));
  }

  editNote(userId: number, message: EditNoteEvent): void {
    const note = this.state.data.notes.find((n) => n.id === message.note.id);
    if (note === undefined) {
      log.info('Could not find Note to edit');
      return;
    }
    log.info('Overwriting Note #' + note!.id + '. Old Pos: (' + note!.pos.x + ', ' + + note!.pos.y + ', ' + note!.pos.z + '), new Pos: (' + message.note.pos.x + ', ' + + message.note.pos.y + ', ' + message.note.pos.z + ')');

    //determine update type
    /*
    switch (message.eventSubtype) {
      case EditNoteEventType.content:
        log.info('new message content: ' + message.note.content);
        note.content = message.note.content;
        break;
      case EditNoteEventType.position:
        note.pos = message.note.pos;
        break;
      case EditNoteEventType.type:
        note.type = message.note.type;
        break;
    }

    */
    this.state.data.notes = this.state.data.notes.filter((n) => {
      n.id !== note.id;
    });

    this.state.data.notes.push(message.note);

    //write changes to file
    this.dataProvider.editNote(this.state.data, message.note);

    log.info(JSON.stringify(message.note));
    this.sendEventToUsers(message)
  }

  deleteNote(userId: number, message: DeleteNoteEvent): void {

    if (userId !== message.userId) {
      log.info('User tried falsifying their identity. Kinda WeirdChamp');
    }

    //Remove Note from state data
    this.state.data.notes = this.state.data.notes.filter((n) => {
      n.id != message.id;
    });

    //write changes to file
    this.dataProvider.deleteNote(this.state.data, message.id);

    this.sendEventToUsers(new DeleteNoteEvent(userId, message.id));
  }

  //Generate new unique positive Note ID
  generateNoteId(): number {
    const currentIDs: number[] = [];
    this.state.data.notes.forEach((n) => currentIDs.push(n.id || 0));
    return Utils.firstMissingPositive(currentIDs);
  }

}