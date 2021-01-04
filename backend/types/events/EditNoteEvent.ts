import Note from '../containers/Note';
import ObjectPosition from '../containers/ObjectPosition';
import ClientEvent from './ClientEvent';

export default class EditNoteEvent implements ClientEvent {
    eventType = 'editNote';
    note: Note;

    constructor(note: Note) {
        this.note = note;
    }
}