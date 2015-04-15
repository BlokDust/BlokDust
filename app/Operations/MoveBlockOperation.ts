import IUndoableOperation = require("../Core/Operations/IUndoableOperation");
import ICompoundOperation = require("../Core/Operations/ICompoundOperation");
import CompoundOperation = require("../Core/Operations/CompoundOperation");
import ChangePropertyOperation = require("../Core/Operations/ChangePropertyOperation");
import IBlock = require("../Blocks/IBlock");

class MoveBlockOperation<IBlock> extends CompoundOperation<IBlock> implements IUndoableOperation, ICompoundOperation
{
    private _Block: IBlock;

    // todo: why is it necessary to cast block as 'any'??

    constructor(block: IBlock) {
        super();
        this._Block = block;
        this.Operations.push(new ChangePropertyOperation<IBlock>(block, "Position", (<any>this._Block).LastPosition.Clone(), (<any>this._Block).Position.Clone()));
    }

    Do(): Promise<IBlock> {
        return super.Do();
    }

    Undo(): Promise<IBlock> {
        return super.Undo();
    }

    Dispose(): void {
        // if the block isn't in the display list, dispose of it
        if (!App.BlocksSketch.DisplayList.Contains(this._Block)){
            (<any>this._Block).Dispose();
            this._Block = null;
        }
    }
}

export = MoveBlockOperation;