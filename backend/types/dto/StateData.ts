/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable quotes */
import Note from "../containers/Note";
import ObjectConfig from "../containers/ObjectConfig";

//Contains serializable data from a session used to store and load sessions
export class StateData {

  objectConfig = new ObjectConfig('none');
  host = '';
  sessionName = '';
  id = -1;
  notes: Array<Note> = [];
  //config = new Config();


  toJSON(): any {
    const noteIds: number[] = [];
    this.notes.forEach((n) => noteIds.push(n.id || 0));
    return { objectConfig: this.objectConfig, host: this.host, sessionName: this.sessionName, id: this.id };
  }

}
