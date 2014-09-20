/// <reference path="../refs" />

import BlocksView = require("../BlocksView");

class MainViewModel extends Fayde.MVVM.ViewModelBase {

    private _BlocksView: BlocksView;

    constructor() {
        super();

        this._BlocksView = new BlocksView();
    }

    BlocksView_Draw(e: Fayde.IEventBindingArgs<Fayde.Drawing.SketchDrawEventArgs>){
        this._BlocksView.SketchSession = <Fayde.Drawing.SketchSession>e.args.SketchSession;
    }

    BlocksView_MouseDown(e: any){
        this._BlocksView.MouseDown(e.args.Source.MousePosition);
    }
}

export = MainViewModel;