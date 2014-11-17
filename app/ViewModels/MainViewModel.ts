import BlocksView = require("../BlocksView");
import IBlock = require("../Blocks/IBlock");
import IModifiable = require("../Blocks/IModifiable");
import IModifier = require("../Blocks/IModifier");
import ToneSource = require("../Blocks/Sources/ToneSource");
import Noise = require("../Blocks/Sources/Noise");

import Keyboard = require("../Blocks/Modifiers/Keyboard");
import VolumeIncrease = require("../Blocks/Modifiers/VolumeIncrease");
import VolumeDecrease = require("../Blocks/Modifiers/VolumeDecrease")
import PitchIncrease = require("../Blocks/Modifiers/PitchIncrease");
import PitchDecrease = require("../Blocks/Modifiers/PitchDecrease");
import Envelope = require("../Blocks/Modifiers/Envelope");
import LFO = require("../Blocks/Modifiers/LFO");
import Delay = require("../Blocks/Modifiers/Delay");
import Scuzz = require("../Blocks/Modifiers/Scuzz");

import Power = require("../Blocks/Sources/Power");
import ObservableCollection = Fayde.Collections.ObservableCollection;
import Size = Fayde.Utils.Size;
import Vector = Fayde.Utils.Vector;

class MainViewModel extends Fayde.MVVM.ViewModelBase {

    private _BlocksView: BlocksView;
    private _SelectedBlock: IBlock;
    private _ZoomLevel: number = 0;
    private _ZoomLevels: number = 3;
    private _ZoomContentOffset: Vector;
    private _ZoomContentSize: Size;

    get SelectedBlock(): IBlock{
        return this._SelectedBlock;
    }

    set SelectedBlock(value: IBlock){
        this._SelectedBlock = value;
        this.OnPropertyChanged("SelectedBlock");
    }

    get ZoomLevel(): number {
        return this._ZoomLevel;
    }

    set ZoomLevel(value: number) {
        this._ZoomLevel = value;
        this.OnPropertyChanged("ZoomLevel");
    }

    get ZoomLevels(): number {
        return this._ZoomLevels;
    }

    set ZoomLevels(value: number) {
        this._ZoomLevels = value;
        this.OnPropertyChanged("ZoomLevels");
    }

    get ZoomContentSize(): Size {
        return this._ZoomContentSize;
    }

    set ZoomContentSize(value: Size) {
        this._ZoomContentSize = value;
        this.OnPropertyChanged("ZoomContentSize");
    }

    get ZoomContentOffset(): Vector {
        if(!this._ZoomContentOffset){
            this._ZoomContentOffset = new Vector(0, 0);
        }
        return this._ZoomContentOffset;
    }

    set ZoomContentOffset(value: Vector) {
        this._ZoomContentOffset = value;
        this.OnPropertyChanged("ZoomContentOffset");
    }

    constructor() {
        super();

        window.debug = true;

        this._BlocksView = new BlocksView();

        this._BlocksView.BlockSelected.Subscribe((block: IModifiable) => {
            this._OnBlockSelected(block);
        }, this);
    }

    ZoomUpdated(e: Fayde.IEventBindingArgs<Fayde.Zoomer.ZoomerEventArgs>){
        this.ZoomContentSize = e.args.Size;
        this.ZoomContentOffset = e.args.Offset;
    }

    ZoomIn_Click(){
        if (this.ZoomLevel < this._ZoomLevels){
            this.ZoomLevel += 1;
        }
    }

    ZoomOut_Click(){
        if (this.ZoomLevel > 0){
            this.ZoomLevel -= 1;
        }
    }

    BlocksView_Draw(e: Fayde.IEventBindingArgs<Fayde.Drawing.SketchDrawEventArgs>){
        this._BlocksView.SketchSession = <Fayde.Drawing.SketchSession>e.args.SketchSession;
    }

    BlocksView_MouseDown(e: Fayde.Input.MouseEventArgs){
        this._BlocksView.MouseDown(e);
    }

    BlocksView_TouchDown(e: Fayde.Input.TouchEventArgs){
        this._BlocksView.TouchDown(e);
    }

    BlocksView_MouseUp(e: Fayde.Input.MouseEventArgs){
        this._BlocksView.MouseUp(e);
    }

    BlocksView_MouseMove(e: Fayde.Input.MouseEventArgs){
        this._BlocksView.MouseMove(e);
    }

    _OnBlockSelected(block: IBlock){
        this.SelectedBlock = block;
    }

    PowerBlockBtn_Click(e: EventArgs){
        this._BlocksView.CreateBlock(Power);
    }

    ToneBlockBtn_Click(e: EventArgs){
        this._BlocksView.CreateBlock(ToneSource);
    }

    NoiseBlockBtn_Click(e: EventArgs){
        this._BlocksView.CreateBlock(Noise);
    }

    KeyboardBlockBtn_Click(e: any){
        this._BlocksView.CreateBlock(Keyboard);
    }

    VolumeIncreaseBlockBtn_Click(e: any){
        this._BlocksView.CreateBlock(VolumeIncrease);
    }

    VolumeDecreaseBlockBtn_Click(e: any){
        this._BlocksView.CreateBlock(VolumeDecrease);
    }

    PitchIncreaseBlockBtn_Click(e: any){
        this._BlocksView.CreateBlock(PitchIncrease);
    }

    PitchDecreaseBlockBtn_Click(e: any){
        this._BlocksView.CreateBlock(PitchDecrease);
    }

    EnvelopeBlockBtn_Click(e: any){
        this._BlocksView.CreateBlock(Envelope);
    }

    LFOBlockBtn_Click(e: any){
        this._BlocksView.CreateBlock(LFO);
    }

    DelayBlockBtn_Click(e: any){
        this._BlocksView.CreateBlock(Delay);
    }

    ScuzzBlockBtn_Click(e: any){
        this._BlocksView.CreateBlock(Scuzz);
    }


    DeleteBlockBtn_Click(e: any){
        this._BlocksView.DeleteSelectedBlock();
    }

    UndoBtn_Click(e: any){
        this._BlocksView.Undo();
    }

    RedoBtn_Click(e: any){
        this._BlocksView.Redo();
    }
}

export = MainViewModel;