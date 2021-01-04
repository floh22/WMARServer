import Note from '../containers/Note';
import ObjectPosition from '../containers/ObjectPosition';
import ClientEvent from './ClientEvent';

export default class NewNoteEvent implements ClientEvent {
    eventType = 'newNote';
    note: Note;

    constructor(note: Note) {
        this.note = note;
    }
}