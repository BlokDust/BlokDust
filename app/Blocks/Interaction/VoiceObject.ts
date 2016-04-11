import {ISource} from '../ISource';

//TODO: use es6 Map or Set instead
export class VoiceCreator {

    public ID: number;
    private _key: string;
    private _controller: string;
    private _note: number;
    private _controllerMods: number;

    constructor(  id ) {
        this.ID = id;
    }

    get Key(): string {
        return this._key;
    }

    set Key(key: string) {
        this._key = key;
    }

    get Controller(): string {
        return this._controller;
    }

    set Controller(controller: string) {
        this._controller = controller;
    }

    get Note(): number {
        return this._note;
    }

    set Note(note: number) {
        this._note = note;
    }

    get ControllerMods(): number {
        return this._controllerMods;
    }

    set ControllerMods(controllerMods: number) {
        this._controllerMods = controllerMods;
    }

}