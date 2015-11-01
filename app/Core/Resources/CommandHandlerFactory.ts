import {ICommandHandler} from '../Commands/ICommandHandler';
import {IFactoryResource} from './IFactoryResource';
import {Commands} from '../../Commands';

export class CommandHandlerFactory<T extends ICommandHandler> implements IFactoryResource<T> {

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties

    private _Type: T;
    public Command: Commands;

    constructor(command: Commands, type: T) {
        this.Command = command;
        this._Type = type;
    }

    GetInstance(): T  {
        return Object.create(this._Type);
    }

    GetType(): T {
        return this._Type;
    }
}