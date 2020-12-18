import { StateData } from '../dto';
import ClientEvent from './ClientEvent';

export default class NewStateEvent implements ClientEvent {
  constructor(state: StateData) {
    this.state = state;
  }

  eventType = 'newState';
  state: StateData
}
