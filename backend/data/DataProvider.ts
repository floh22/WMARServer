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
        fs.writeFile( fileName, JSON.stringify(data, null, 2), function writeJSON(err) {
            if(err) return log.info('Could not write Session:' + err);
            log.info('Writing Session to ' + fileName);
        });
    }

    writeCurrentDataSync(data: StateData): void {
        const sFolder = sessionFolder + data.id + '/';
        fs.writeFileSync(path.join(sFolder, 'SessionState.json'), JSON.stringify(data, null, 2), { encoding: 'utf-8' });
    }

    readSessionData(sessionId: number): StateData {
        const sFolder = sessionFolder + sessionId + '/';
        const tempSd = JSON.parse(fs.readFileSync(path.join(sFolder, 'SessionState.json'), 'utf-8'));

        const initNotes: Note[] = [];
        tempSd.notes.forEach((nId: number) => {
            initNotes.push(this.readNote(sessionId, nId));
        });
        tempSd.notes = initNotes;
        return tempSd;
    }

    getSessions(): Array<number> {
        const stringFolders = getDirectories(sessionFolder);
        const intFolders: Array<number> = [];
        stringFolders.forEach((sF) => intFolders.push(+sF))
        return intFolders;
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

    createNote(sessionId: number, note: Note): void {

        this.writeNote(sessionId, note);
        
    }

    editNote(sessionId: number, newNote: Note): void {
        this.writeNote(sessionId, newNote);
    }

    writeNote(sessionId: number, note: Note): void {
        if (!fs.existsSync(sessionFolder)) {
            log.warn('Session folder not init! Returning');
            return;
        }

        const specificSessionFolder = sessionFolder + sessionId + '/';

        if (!fs.existsSync(specificSessionFolder)) {
            log.warn('Tried writing Note to Session that does not exist!')
            return;
        }

        const fileName = path.join(specificSessionFolder , 'Note_' + note.id + '.json');

        fs.writeFile( fileName, JSON.stringify(note, null, 2), function writeJSON(err) {
            if(err) return log.info('Could not write Note:' + err);
            log.info('Writing note to ' + fileName);
        });
    }

    deleteNote(sessionId: number, noteId: number): void {
        if (!fs.existsSync(sessionFolder)) {
            log.warn('Session folder not init! Returning');
            return;
        }

        const specificSessionFolder = sessionFolder + sessionId + '/';

        if (!fs.existsSync(specificSessionFolder)) {
            log.warn('Tried writing Note to Session that does not exist!')
            return;
        }

        const fileName = path.join(specificSessionFolder , 'Note_' + noteId + '.json');

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

        const specificSessionFolder = sessionFolder + sessionId + '/';

        if (!fs.existsSync(specificSessionFolder)) {
            log.warn('Tried reading Note from Session that does not exist!')
            throw 'Attempted to read invalid Session!';
        }

        return JSON.parse(fs.readFileSync(path.join(specificSessionFolder , 'Note_' + noteId + '.json'), 'utf-8'));
    }

}