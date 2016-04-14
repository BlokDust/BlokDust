import {IApp} from '../IApp';
import {ICommandHandler} from '../Core/Commands/ICommandHandler';
import {IncrementNumberCompoundOperation} from '../Operations/IncrementNumberCompoundOperation';

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