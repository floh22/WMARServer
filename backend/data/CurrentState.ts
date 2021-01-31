import { Session } from '../types/lcu/Session';

export class CurrentState {
  //DEPRECATED
  //Current State of a Session
  isSessionActive: boolean;
  session: Session;

  constructor(isSessionActive: boolean, session: Session) {
    this.isSessionActive = isSessionActive;
    this.session = session;
  }
  
  isEmptyState(): boolean {
    if(this.session === undefined) {
      return true;
    }
    return false;
  }

  isActive(): boolean {
    if(this.isSessionActive)
      return true;
    return false;
  }
}