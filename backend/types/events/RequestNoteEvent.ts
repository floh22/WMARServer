import ClientEvent from './ClientEvent';

export default class RequestNoteEvent implements ClientEvent {
    eventType = 'requestNotes';
}