/// <reference path="../refs" />

import BlocksView = require("../BlocksView");
import IBlock = require("../Blocks/IBlock");
import Input = require("../Blocks/Input");
import Modifier = require("../Blocks/Modifier");
import Output = require("../Blocks/Output");
import Power = require("../Blocks/Power");

class MainViewModel extends Fayde.MVVM.ViewModelBase {

    private _BlocksView: BlocksView;
    private _SelectedBlock: IBlock;

    get SelectedBlock(): IBlock
    {
        return this._SelectedBlock;
    }

    set SelectedBlock(value: IBlock){
        this._SelectedBlock = value;
        this.OnPropertyChanged("SelectedBlock");
    }

    constructor() {
        super();

        this._BlocksView = new BlocksView();
        this._BlocksView.BlockSelected.Subscribe((block: IBlock) => {
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

    BlocksView_MouseMove(e: any){
        this._BlocksView.MouseMove(e.args.Source.MousePosition);
    }

    _OnBlockSelected(block: IBlock){
        this.SelectedBlock = block;
    }

    PowerBlockBtn_Click(e: any){
        this._BlocksView.CreateBlock(Power);
    }

    InputBlockBtn_Click(e: EventArgs){
        this._BlocksView.CreateBlock(Input);
    }

    OutputBlockBtn_Click(e: EventArgs){
        this._BlocksView.CreateBlock(Output);
    }

    ModifierBlockBtn_Click(e: any){
        this._BlocksView.CreateBlock(Modifier);
    }
}

export = MainViewModel;