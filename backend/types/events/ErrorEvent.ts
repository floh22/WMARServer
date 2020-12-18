import ClientEvent from './ClientEvent';

export default class ErrorEvent implements ClientEvent {
    eventType = 'error';
    errorMessage: string;

    constructor(message: string) {
        this.errorMessage = message;
    }
}