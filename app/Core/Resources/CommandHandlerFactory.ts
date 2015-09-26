import {ICommandHandler} from '../Commands/ICommandHandler';
import {IFactoryResource} from './IFactoryResource';
import {IValidator} from '../Validators/IValidator';
import {Commands} from '../../Commands';

export class CommandHandlerFactory<T extends ICommandHandler> implements IFactoryResource<T> {

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties

    private _Type: T;
    public Command: Commands;
    private _Validators: IValidator[];

    constructor(command: Commands, type: T, validators: IValidator[] = []) {
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