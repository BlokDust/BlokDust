import {IBlock} from '../Blocks/IBlock';
import {ICommandHandler} from '../Core/Commands/ICommandHandler';
import {IncrementNumberCompoundOperation} from '../Operations/IncrementNumberCompoundOperation';
import {IUndoableOperation} from '../Core/Operations/IUndoableOperation';

export class IncrementNumberCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(n: number): Promise<number>{
        var op = new IncrementNumberCompoundOperation(n);
        return App.OperationManager.Do(op).then((n) => {
            //console.log(n);
        });
    }
}