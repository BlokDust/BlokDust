import IUndoableOperation = require("./IUndoableOperation");
import ICompoundOperation = require("./ICompoundOperation");
import CompoundOperation = require("./CompoundOperation");
import IBlock = require("../../Blocks/IBlock");

class DeleteBlockOperation<IBlock> extends CompoundOperation<IBlock> implements IUndoableOperation, ICompoundOperation
{
    private _Block: IBlock;

    constructor(block: IBlock) {
        super();
        this._Block = block;

        // add the following the the Operations array:
        //this._Block.Dispose(); // todo: each block should have an undoable Dispose Operation
        //App.BlocksSketch.DisplayList.Remove(this._Block);
        //var op:IUndoableOperation = new RemoveItemFromArrayOperation<IBlock>(this._Block, App.Blocks);
    }

    Do(): Promise<IBlock> {
        return super.Do();
    }

    Undo(): Promise<IBlock> {
        return super.Undo();
    }
}

export = DeleteBlockOperation;