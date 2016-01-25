import {ChangePropertyOperation} from '../Core/Operations/ChangePropertyOperation';
import {CompoundOperation} from '../Core/Operations/CompoundOperation';
import {IBlock} from '../Blocks/IBlock';
import {ICompoundOperation} from '../Core/Operations/ICompoundOperation';
import {IUndoableOperation} from '../Core/Operations/IUndoableOperation';

export class MoveBlockOperation<IBlock> extends CompoundOperation<IBlock> implements IUndoableOperation, ICompoundOperation {
    private _Block: IBlock;

    // todo: why is it necessary to cast block as 'any'??

    constructor(block: IBlock) {
        super();
        this._Block = block;
        this.Operations.push(new ChangePropertyOperation<IBlock>(block, "Position", (<any>this._Block).LastPosition.Clone(), (<any>this._Block).Position.Clone()));
    }

    Do(): Promise<void> {
        return super.Do();
    }

    Undo(): Promise<void> {
        return super.Undo();
    }

    Dispose(): void {
        this._Block = null;
    }
}