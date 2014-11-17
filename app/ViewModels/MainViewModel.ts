import BlocksSketch = require("../BlocksSketch");
import IBlock = require("../Blocks/IBlock");
import IModifiable = require("../Blocks/IModifiable");
import IModifier = require("../Blocks/IModifier");
import ToneSource = require("../Blocks/Sources/ToneSource");
import Noise = require("../Blocks/Sources/Noise");
import Keyboard = require("../Blocks/Sources/Keyboard");
import VolumeIncrease = require("../Blocks/Modifiers/VolumeIncrease");
import VolumeDecrease = require("../Blocks/Modifiers/VolumeDecrease")
import PitchIncrease = require("../Blocks/Modifiers/PitchIncrease");
import PitchDecrease = require("../Blocks/Modifiers/PitchDecrease");
import Envelope = require("../Blocks/Modifiers/Envelope");
import LFO = require("../Blocks/Modifiers/LFO");
import Delay = require("../Blocks/Modifiers/Delay");
import Scuzz = require("../Blocks/Modifiers/Scuzz");
import Power = require("../Blocks/Sources/Power");

import InfoViewModel = require("./InfoViewModel");

import ObservableCollection = Fayde.Collections.ObservableCollection;
import Size = Fayde.Utils.Size;
import Vector = Fayde.Utils.Vector;

class MainViewModel extends Fayde.MVVM.ViewModelBase {

    private _BlocksSketch: BlocksSketch;
    private _SelectedBlock: IBlock;
    private _ZoomLevel: number = 0;
    private _ZoomLevels: number = 3;
    private _ZoomContentOffset: Vector;
    private _ZoomContentSize: Size;

    private _InfoViewModel: InfoViewModel;

    get SelectedBlock(): IBlock{
        //return this._InfoViewModel.SelectedBlock;
        return this._SelectedBlock;
    }

    set SelectedBlock(value: IBlock){
        this._SelectedBlock = value;
        //this._InfoViewModel.SelectedBlock = value;
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

        this._BlocksSketch = new BlocksSketch();

        this._BlocksSketch.BlockSelected.Subscribe((block: IModifiable) => {
            this._OnBlockSelected(block);
        }, this);

        this._InfoViewModel = new InfoViewModel();
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

    BlocksSketch_Draw(e: Fayde.IEventBindingArgs<Fayde.Drawing.SketchDrawEventArgs>){
        this._BlocksSketch.SketchSession = <Fayde.Drawing.SketchSession>e.args.SketchSession;
    }

    BlocksSketch_MouseDown(e: Fayde.Input.MouseEventArgs){
        this._BlocksSketch.MouseDown(e);
    }

    BlocksSketch_TouchDown(e: Fayde.Input.TouchEventArgs){
        this._BlocksSketch.TouchDown(e);
    }

    BlocksSketch_MouseUp(e: Fayde.Input.MouseEventArgs){
        this._BlocksSketch.MouseUp(e);
    }

    BlocksSketch_MouseMove(e: Fayde.Input.MouseEventArgs){
        this._BlocksSketch.MouseMove(e);
    }

    _OnBlockSelected(block: IBlock){
        this.SelectedBlock = block;
    }

    PowerBlockBtn_Click(e: EventArgs){
        this._BlocksSketch.CreateBlock(Power);
    }

    ToneBlockBtn_Click(e: EventArgs){
        this._BlocksSketch.CreateBlock(ToneSource);
    }

    NoiseBlockBtn_Click(e: EventArgs){
        this._BlocksSketch.CreateBlock(Noise);
    }

    KeyboardBlockBtn_Click(e: EventArgs){
        this._BlocksSketch.CreateBlock(Keyboard);
    }

    VolumeIncreaseBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlock(VolumeIncrease);
    }

    VolumeDecreaseBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlock(VolumeDecrease);
    }

    PitchIncreaseBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlock(PitchIncrease);
    }

    PitchDecreaseBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlock(PitchDecrease);
    }

    EnvelopeBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlock(Envelope);
    }

    LFOBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlock(LFO);
    }

    DelayBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlock(Delay);
    }

    ScuzzBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlock(Scuzz);
    }


    DeleteBlockBtn_Click(e: any){
        this._BlocksSketch.DeleteSelectedBlock();
    }

    UndoBtn_Click(e: any){
        this._BlocksSketch.Undo();
    }

    RedoBtn_Click(e: any){
        this._BlocksSketch.Redo();
    }
}

export = MainViewModel;