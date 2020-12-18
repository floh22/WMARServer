import ClientEvent from './ClientEvent';

export default class HeartbeatEvent implements ClientEvent {

  eventType = 'heartbeat';
}
