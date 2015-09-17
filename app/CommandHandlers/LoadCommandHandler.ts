import {ICommandHandler} from '../Core/Commands/ICommandHandler';
import {IOperation} from '../Core/Operations/IOperation';
import {LoadOperation} from '../Operations/LoadOperation';

export class LoadCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(id: string): Promise<any>{
        var op:IOperation = new LoadOperation(id);
        return App.OperationManager.Do(op);
    }
}