///<amd-dependency path="fayde.utils"/>.

import App = require("../App");
import BlocksSketch = require("../BlocksSketch");

class MainViewModel extends Fayde.MVVM.ViewModelBase {

    private _BlocksSketch: BlocksSketch;

    constructor() {
        super();

        window.debug = true;

        //this._BlocksSketch = new BlocksSketch();
    }

    BlocksSketch_Draw(e: Fayde.IEventBindingArgs<Fayde.Drawing.SketchDrawEventArgs>){
        this._BlocksSketch.SketchSession = <Fayde.Drawing.SketchSession>e.args.SketchSession;
    }

    //BlocksSketch_MouseDown(e: Fayde.Input.MouseEventArgs){
    //    console.log(new Date().getTime(), (<any>e).args.Source.MousePosition);
    //    this._BlocksSketch.MouseDown(e);
    //}
    //
    //BlocksSketch_MouseUp(e: Fayde.Input.MouseEventArgs){
    //    this._BlocksSketch.MouseUp(e);
    //}
    //
    //BlocksSketch_MouseMove(e: Fayde.Input.MouseEventArgs){
    //    this._BlocksSketch.MouseMove(e);
    //}
    //
    //BlocksSketch_TouchDown(e: Fayde.Input.TouchEventArgs){
    //    this._BlocksSketch.TouchDown(e);
    //}
    //
    //BlocksSketch_TouchUp(e: Fayde.Input.TouchEventArgs){
    //    this._BlocksSketch.TouchUp(e);
    //}
    //
    //BlocksSketch_TouchMove(e: Fayde.Input.TouchEventArgs){
    //    this._BlocksSketch.TouchMove(e);
    //}

}

export = MainViewModel;