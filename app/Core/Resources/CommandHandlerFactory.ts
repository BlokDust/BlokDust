import ICommandHandler = require("../Commands/ICommandHandler");
import IFactoryResource = require("./IFactoryResource");
import IValidator = require("../Validators/IValidator");

class CommandHandlerFactory<T extends ICommandHandler> implements IFactoryResource<T> {

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties
    private _Type: T;
    public Command: string;
    private _Validators: IValidator[];

    constructor(command: string, type: T, validators: IValidator[] = []) {
        this.Command = command;
        this._Type = type;
        this._Validators = validators;
    }

    GetInstance(): T  {
        return Object.create(this._Type);
    }

    GetType(): T {
        return this._Type;
    }
}

export = CommandHandlerFactory;