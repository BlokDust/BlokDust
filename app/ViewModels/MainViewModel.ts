/// <reference path="../refs" />

import BlocksView = require("../BlocksView");
import Block = require("../Block");

class MainViewModel extends Fayde.MVVM.ViewModelBase {

    private _BlocksView: BlocksView;

    private _SelectedBlock: Block;

    get SelectedBlock(): Block
    {
        return this._SelectedBlock;
    }

    set SelectedBlock(value: Block){
        this._SelectedBlock = value;
        this.OnPropertyChanged("SelectedBlock");
    }

    constructor() {
        super();

        this._BlocksView = new BlocksView();
        this._BlocksView.BlockSelected.Subscribe((block: Block) => {
            this._OnBlockSelected(block);
        }, this);
    }

    BlocksView_Draw(e: Fayde.IEventBindingArgs<Fayde.Drawing.SketchDrawEventArgs>){
        this._BlocksView.SketchSession = <Fayde.Drawing.SketchSession>e.args.SketchSession;
    }

    BlocksView_MouseDown(e: any){
        this._BlocksView.MouseDown(e.args.Source.MousePosition);
    }

    BlocksView_MouseUp(e: any){
        this._BlocksView.MouseUp(e.args.Source.MousePosition);
    }

    _OnBlockSelected(block: Block){
        this.SelectedBlock = block;
    }
}

export = MainViewModel;