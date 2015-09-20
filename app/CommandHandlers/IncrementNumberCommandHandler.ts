import {IApp} from '../IApp';
import {IBlock} from '../Blocks/IBlock';
import {ICommandHandler} from '../Core/Commands/ICommandHandler';
import {IncrementNumberCompoundOperation} from '../Operations/IncrementNumberCompoundOperation';
import {IUndoableOperation} from '../Core/Operations/IUndoableOperation';

declare var App: IApp;

export class IncrementNumberCommandHandler implements ICommandHandler {

    constructor() {

    }

    Execute(n: number): Promise<any>{
        var op = new IncrementNumberCompoundOperation(n);
        return App.OperationManager.Do(op).then((n) => {
            //console.log(n);
        });
    }
}