import { EventEmitter } from 'ws';
import fs from 'fs';
import fse from 'fs-extra';
import path from 'path';
import GlobalContext from '../GlobalContext';
import logger from '../logging';
import { Session } from '../types/lcu/Session';
import { StateData } from '../types/dto';
import ObjectConfig from '../types/containers/ObjectConfig';

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
        fs.writeFileSync(path.join(sFolder, 'SessionState.json'), JSON.stringify(data, null, 2), { encoding: 'utf-8' });
    }

    readSessionData(sessionId: number): StateData {
        const sFolder = sessionFolder + sessionId + '/';
        return JSON.parse(fs.readFileSync(path.join(sFolder, 'SessionState.json'), 'utf-8'));
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

}