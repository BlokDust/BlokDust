import IOperation = require("./IOperation");

class SaveOperation<String> implements IOperation
{
    private _JSON: string;

    constructor(json: string) {
        this._JSON = json;
    }

    Do(): Promise<String> {
        var that = this;

        return new Promise((resolve) => {

            // do async stuff then resolve
            console.log(that._JSON);
            resolve();
        });
    }

}

export = SaveOperation;