import ISource = require("../ISource");

class VoiceCreator {

    public ID: number;
    private _key: string;

    constructor(  id ) {
        this.ID = id;
    }

    get Key(): string {
        return this._key;
    }

    set Key(key: string) {
        this._key = key;
    }

}

export = VoiceCreator;