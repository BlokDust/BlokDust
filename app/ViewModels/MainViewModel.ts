/// <reference path="../refs" />

import BlocksView = require("../BlocksView");
import IBlock = require("../Blocks/IBlock");
import IModifiable = require("../Blocks/IModifiable");
import IModifier = require("../Blocks/IModifier");
import Input = require("../Blocks/Input");
import Modifier = require("../Blocks/Modifier");
import Output = require("../Blocks/Output");
import Power = require("../Blocks/Power");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class MainViewModel extends Fayde.MVVM.ViewModelBase {

    private _BlocksView: BlocksView;
    private _SelectedBlock: IBlock;

    get SelectedBlock(): IBlock{
        return this._SelectedBlock;
    }

    set SelectedBlock(value: IBlock){
        this._SelectedBlock = value;
        this.OnPropertyChanged("SelectedBlock");
    }

    constructor() {
        super();

        window.debug = true;

        this._BlocksView = new BlocksView();

        this._BlocksView.SourceSelected.Subscribe((source: IModifiable) => {
            this._OnSourceSelected(source);
        }, this);

        this._BlocksView.ModifierSelected.Subscribe((modifier: IModifier) => {
            this._OnModifierSelected(modifier);
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

    _OnSourceSelected(source: IModifiable){
        this.SelectedBlock = source;
    }

    _OnModifierSelected(modifier: IModifier){
        this.SelectedBlock = modifier;
    }

    PowerBlockBtn_Click(e: EventArgs){
        this._BlocksView.CreateSource(Power);
    }

    InputBlockBtn_Click(e: EventArgs){
        this._BlocksView.CreateSource(Input);
    }

    OutputBlockBtn_Click(e: EventArgs){
        this._BlocksView.CreateSource(Output);
    }

    ModifierBlockBtn_Click(e: any){
        this._BlocksView.CreateModifier(Modifier);
    }

    DeleteBlockBtn_Click(e: any){
        this._BlocksView.DeleteSelectedBlock();
    }
}

export = MainViewModel;