import { EventEmitter } from 'ws';
import fs from 'fs';
import fse from 'fs-extra';
import path from 'path';
import GlobalContext from '../GlobalContext';
import logger from '../logging';
import { Session } from '../types/lcu/Session';
import { StateData } from '../types/dto';
import ObjectConfig from '../types/containers/ObjectConfig';
import Note from '../types/containers/Note';

const log = logger('DataProvider');

const sessionFolder = './cache/sessionData/';
const objectFolder = './cache/objectData/'

const deleteFolderRecursive = function (location: string): void {
    if (fs.existsSync(location)) {
        fs.readdirSync(location).forEach((file, index) => {
            const curPath = path.join(location, file);
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(location);
    }
};

const getDirectories = (source: fs.PathLike): string[] =>
    fs.readdirSync(source, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)

const getFiles = (source: fs.PathLike): string[] =>
    fs.readdirSync(source, { withFileTypes: true })
        .filter(dirent => dirent.isFile())
        .map(dirent => dirent.name)

export default class DataProvider extends EventEmitter {
    getCurrentData(sessionID: string): Promise<Session> {

        const sessionPath = path.join(GlobalContext.commandLine.resourcePath, sessionID);

        fs.readFile(path.join(sessionPath, 'SessionState.json'), { encoding: 'utf-8' }, function (err, data) {
            if (!err) {
                log.info('Read session data');
                return JSON.parse(data);
            } else {
                log.info('Could not find session info');
                log.debug(err);
            }
        });

        return new Promise<Session>(() => {
            log.info('Something went very wrong when reading session info');
        })
    }

    writeCurrentData(data: StateData): void {
        const sFolder = sessionFolder + data.id + '/';
        const fileName = path.join(sFolder, 'SessionState.json');
        // Move to async write 
        // fs.writeFileSync(path.join(sFolder, 'SessionState.json'), JSON.stringify(data, null, 2), { encoding: 'utf-8' });
        fs.writeFile(fileName, JSON.stringify(data, null, 2), function writeJSON(err) {
            if (err) return log.info('Could not write Session:' + err);
            log.info('Writing Session to ' + fileName);
        });
    }

    writeCurrentDataSync(data: StateData): void {
        const sFolder = sessionFolder + data.id + '/';
        fs.writeFileSync(path.join(sFolder, 'SessionState.json'), JSON.stringify(data, null, 2), { encoding: 'utf-8' });
    }

    readSessionData(sessionId: number): StateData {
        const sFolder = sessionFolder + sessionId + '/';
        const data = fs.readFileSync(path.join(sFolder, 'SessionState.json'), 'utf-8');
        const tempSd = JSON.parse(data);

        tempSd.notes = this.getNotes(sessionId);
        return tempSd;
    }

    getSessions(): Array<number> {
        const stringFolders = getDirectories(sessionFolder);
        const intFolders: Array<number> = [];
        stringFolders.forEach((sF) => intFolders.push(+sF))
        return intFolders;
    }

    getNotes(sessionId: number): Array<Note> {
        const specificSessionFolder = sessionFolder + sessionId + '/';
        if (!fs.existsSync(specificSessionFolder)) {
            log.info('Cannot retrieve Notes. Session does not exist');
        }
        const NoteFolder = specificSessionFolder + '/Notes/';
        if (!fs.existsSync(NoteFolder)) {
            fs.mkdirSync(NoteFolder);
            return [];
        }
        const outNotes: Array<Note> = [];
        getFiles(NoteFolder).forEach((noteId) => {
            outNotes.push(JSON.parse(fs.readFileSync(path.join(NoteFolder, noteId), 'utf-8')));
        });

        return outNotes;
    }

    getDefaultObjectConfig(objectType: string): ObjectConfig {
        const specificObject = objectFolder + objectType + '/';
        const temp = JSON.parse(fs.readFileSync(path.join(specificObject, 'DefaultConfig.json'), 'utf-8'));
        return new ObjectConfig(temp.objectConfig.objectType, temp.objectConfig.scale, temp.objectConfig.rotation);
    }


    createSession(data: StateData): void {
        const specificObject = objectFolder + data.objectConfig.objectType + '/';

        if (!fs.existsSync(sessionFolder)) {
            fs.mkdirSync(sessionFolder);
        }

        const specificSessionFolder = sessionFolder + data.id + '/';

        if (!fs.existsSync(specificSessionFolder)) {
            fs.mkdirSync(specificSessionFolder)
        }

        const sessionObjectFolder = specificSessionFolder + '/' + data.objectConfig.objectType + '/';

        if (!fs.existsSync(sessionObjectFolder)) {
            fs.mkdirSync(sessionObjectFolder);
        }
        const sessionNoteFolder = specificSessionFolder + '/Notes/';

        if (!fs.existsSync(sessionNoteFolder)) {
            fs.mkdirSync(sessionNoteFolder);
        }

        this.writeCurrentData(data);

        log.info('Copying all object Data to Session folder');
        fse.copySync(specificObject, sessionObjectFolder, { overwrite: true });
    }


    deleteSession(sessionId: number): void {
        const specificSessionFolder = sessionFolder + sessionId + '/';

        if (!fs.existsSync(specificSessionFolder)) {
            log.info('Session already deleted!');
            return;
        }

        log.info('Deleting Session');
        deleteFolderRecursive(specificSessionFolder);
        log.info('Session deleted from file');
    }

    createNote(sessionData: StateData, note: Note): void {

        this.writeNote(sessionData, note);

    }

    editNote(sessionData: StateData, newNote: Note): void {
        this.writeNote(sessionData, newNote);
    }

    writeNote(sessionData: StateData, note: Note): void {
        const sessionId = sessionData.id;
        if (!fs.existsSync(sessionFolder)) {
            log.warn('Session folder not init! Returning');
            return;
        }

        const specificSessionFolder = sessionFolder + sessionId + '/Notes/';

        if (!fs.existsSync(specificSessionFolder)) {
            log.warn('Tried writing Note to Session that does not exist!')
            return;
        }

        const fileName = path.join(specificSessionFolder, 'Note_' + note.id + '.json');

        fs.writeFile(fileName, JSON.stringify(note, null, 2), function writeJSON(err) {
            if (err) return log.info('Could not write Note:' + err);
            log.info('Writing note to ' + fileName);
        });
    }

    deleteNote(sessionData: StateData, noteId: number): void {
        const sessionId = sessionData.id;
        if (!fs.existsSync(sessionFolder)) {
            log.warn('Session folder not init! Returning');
            return;
        }

        const specificSessionFolder = sessionFolder + sessionId + '/Notes/';

        if (!fs.existsSync(specificSessionFolder)) {
            log.warn('Tried writing Note to Session that does not exist!')
            return;
        }

        const fileName = path.join(specificSessionFolder, 'Note_' + noteId + '.json');

        fs.unlink(fileName, (err) => {
            log.info('Could not delete Note: ' + err);
            return;
        })

        log.info('Note removed');
    }


    readNote(sessionId: number, noteId: number): Note {
        if (!fs.existsSync(sessionFolder)) {
            log.warn('Session folder not init! Returning');
            throw 'Session folder not init!';
        }

        const specificSessionFolder = sessionFolder + sessionId + '/Notes/';

        if (!fs.existsSync(specificSessionFolder)) {
            log.warn('Tried reading Note from Session that does not exist!')
            throw 'Attempted to read invalid Session!';
        }

        return JSON.parse(fs.readFileSync(path.join(specificSessionFolder, 'Note_' + noteId + '.json'), 'utf-8'));
    }

}