import Note from '../containers/Note';
import ObjectPosition from '../containers/ObjectPosition';
import ClientEvent from './ClientEvent';

export default class EditNoteEvent implements ClientEvent {
    eventType = 'editNote';
    eventSubtype: EditNoteEventType;
    note: Note;

    constructor(note: Note, eventSubtype: EditNoteEventType) {
        this.note = note;
        this.eventSubtype = eventSubtype;
    }
}

export enum EditNoteEventType {
    position,
    content,
    type
}