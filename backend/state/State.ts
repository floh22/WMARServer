/* eslint-disable @typescript-eslint/no-explicit-any */
import EventEmitter from 'events';
import fetch from 'node-fetch';
import { Config, StateData } from '../types/dto';

//Current State of a Session. Contains its Data and in future may contain active user info
class State extends EventEmitter {
  data: StateData;

  constructor() {
    super();
    this.data = new StateData();
  }


  newAction(action: any): void {
    this.emit('newAction', action);
  }

  triggerUpdate(): void {
    this.emit('stateUpdate', this.data);
  }

  async api(url: string): Promise<any> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    return response.json() as Promise<any>;
  }
}

export default State;
