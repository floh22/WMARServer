import ClientEvent from './ClientEvent';

//Used to detect dead/zombie connections
export default class HeartbeatEvent implements ClientEvent {

  eventType = 'heartbeat';
}
