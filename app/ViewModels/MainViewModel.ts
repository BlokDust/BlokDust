/// <reference path="../refs" />

import BlocksView = require("../BlocksView");
import IBlock = require("../Blocks/IBlock");
import IModifiable = require("../Blocks/IModifiable");
import IModifier = require("../Blocks/IModifier");
import Input = require("../Blocks/Sources/Input");
import VolumeIncrease = require("../Blocks/Modifiers/VolumeIncrease");
import VolumeDecrease = require("../Blocks/Modifiers/VolumeDecrease")
import PitchIncrease = require("../Blocks/Modifiers/PitchIncrease");
import PitchDecrease = require("../Blocks/Modifiers/PitchDecrease");
import Envelope = require("../Blocks/Modifiers/Envelope");
import LFO = require("../Blocks/Modifiers/LFO");
import Delay = require("../Blocks/Modifiers/Delay");
import Scuzz = require("../Blocks/Modifiers/Scuzz");

import Output = require("../Blocks/Sources/Output");
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

        this._BlocksView.SourceSelected.Subscribe((source: IModifiable) => {
            this._OnSourceSelected(source);
        }, this);

        this._BlocksView.ModifierSelected.Subscribe((modifier: IModifier) => {
            this._OnModifierSelected(modifier);
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

    VolumeIncreaseBlockBtn_Click(e: any){
        this._BlocksView.CreateModifier(VolumeIncrease);
    }

    VolumeDecreaseBlockBtn_Click(e: any){
        this._BlocksView.CreateModifier(VolumeDecrease);
    }

    PitchIncreaseBlockBtn_Click(e: any){
        this._BlocksView.CreateModifier(PitchIncrease);
    }

    PitchDecreaseBlockBtn_Click(e: any){
        this._BlocksView.CreateModifier(PitchDecrease);
    }

    EnvelopeBlockBtn_Click(e: any){
        this._BlocksView.CreateModifier(Envelope);
    }

    LFOBlockBtn_Click(e: any){
        this._BlocksView.CreateModifier(LFO);
    }

    DelayBlockBtn_Click(e: any){
        this._BlocksView.CreateModifier(Delay);
    }

    ScuzzBlockBtn_Click(e: any){
        this._BlocksView.CreateModifier(Scuzz);
    }

    DeleteBlockBtn_Click(e: any){
        this._BlocksView.DeleteSelectedBlock();
    }

    UndoBtn_Click(e: any){
        this._BlocksView.Undo();
    }
}

export = MainViewModel;