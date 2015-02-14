//todo: remove these when fayde-unify is available
///<amd-dependency path="fayde.utils"/>.

import App = require("../App");
import BlocksSketch = require("../BlocksSketch");
import IBlock = require("../Blocks/IBlock");
import IModifiable = require("../Blocks/IModifiable");
import IModifier = require("../Blocks/IModifier");
import ToneSource = require("../Blocks/Sources/ToneSource");
import Noise = require("../Blocks/Sources/Noise");
import Microphone = require("../Blocks/Sources/Microphone");
import Soundcloud = require("../Blocks/Sources/Soundcloud");
import Keyboard = require("../Blocks/Effects/Keyboard");
import Gain = require("../Blocks/Effects/Gain");
import PitchIncrease = require("../Blocks/Effects/Pitch");
import Envelope = require("../Blocks/Effects/Envelope");
import Filter = require("../Blocks/Effects/Filter");
import LFO = require("../Blocks/Effects/LFO");
import Delay = require("../Blocks/Effects/Delay");
import Scuzz = require("../Blocks/Effects/Scuzz");
import Distortion = require("../Blocks/Effects/Distortion");
import Chorus = require("../Blocks/Effects/Chorus");
import Reverb = require("../Blocks/Effects/Reverb");
import Convolver = require("../Blocks/Effects/ConvolutionReverb");
import Phaser = require("../Blocks/Effects/Phaser");
import EQ = require("../Blocks/Effects/EQ");
import BitCrusher = require("../Blocks/Effects/BitCrusher");
import AutoWah = require("../Blocks/Effects/AutoWah");
import Panner = require("../Blocks/Effects/Panner");
import Chomp = require("../Blocks/Effects/Chomp");
import Chopper = require("../Blocks/Effects/Chopper");
import Recorder = require("../Blocks/Sources/Recorder");
import Power = require("../Blocks/Sources/Power");
import ParticleEmitter = require("../Blocks/Sources/ParticleEmitter");

class MainViewModel extends Fayde.MVVM.ViewModelBase {

    private _BlocksSketch: BlocksSketch;
    private _SelectedBlock: IBlock;

    get SelectedBlock(): IBlock{
        //return this._InfoViewModel.SelectedBlock;
        return this._SelectedBlock;
    }

    set SelectedBlock(value: IBlock){
        this._SelectedBlock = value;
        //this._InfoViewModel.SelectedBlock = value;
        this.OnPropertyChanged("SelectedBlock");
    }

    constructor() {
        super();

        window.debug = true;

        App.Init();

        this._BlocksSketch = new BlocksSketch();

        this._BlocksSketch.BlockSelected.on((block: IModifiable) => {
            this._OnBlockSelected(block);
        }, this);
    }

    ZoomIn_Click(){
        this._BlocksSketch.ZoomIn();
    }

    ZoomOut_Click(){
        this._BlocksSketch.ZoomOut();
    }

    BlocksSketch_Draw(e: Fayde.IEventBindingArgs<Fayde.Drawing.SketchDrawEventArgs>){
        this._BlocksSketch.SketchSession = <Fayde.Drawing.SketchSession>e.args.SketchSession;
    }

    BlocksSketch_MouseDown(e: Fayde.Input.MouseEventArgs){
        this._BlocksSketch.MouseDown(e);
    }

    BlocksSketch_MouseUp(e: Fayde.Input.MouseEventArgs){
        this._BlocksSketch.MouseUp(e);
    }

    BlocksSketch_MouseMove(e: Fayde.Input.MouseEventArgs){
        this._BlocksSketch.MouseMove(e);
    }

    BlocksSketch_TouchDown(e: Fayde.Input.TouchEventArgs){
        this._BlocksSketch.TouchDown(e);
    }

    BlocksSketch_TouchUp(e: Fayde.Input.TouchEventArgs){
        this._BlocksSketch.TouchUp(e);
    }

    BlocksSketch_TouchMove(e: Fayde.Input.TouchEventArgs){
        this._BlocksSketch.TouchMove(e);
    }

    _OnBlockSelected(block: IBlock){
        this.SelectedBlock = block;
    }

    PowerBlockBtn_Click(e: Fayde.Input.MouseButtonEventArgs){
        this._BlocksSketch.CreateBlockFromType(ParticleEmitter);
    }

    ToneBlockBtn_Click(e: Fayde.Input.MouseButtonEventArgs){
        this._BlocksSketch.CreateBlockFromType(ToneSource);
    }

    NoiseBlockBtn_Click(e: Fayde.Input.MouseButtonEventArgs){
        this._BlocksSketch.CreateBlockFromType(Noise);
    }

    KeyboardBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(Keyboard);
    }

    SoundcloudBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(Soundcloud);
    }

    GainBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(Gain);
    }

    ChopperBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(Chopper);
    }

    PitchIncreaseBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(PitchIncrease);
    }

    EnvelopeBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(Envelope);
    }

    FilterBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(Filter);
    }

    LFOBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(LFO);
    }

    DelayBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(Delay);
    }

    ScuzzBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(Scuzz);
    }

    DistortionBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(Distortion);
    }

    ChorusBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(Chorus);
    }

    ReverbBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(Reverb);
    }

    ConvolverBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(Convolver);
    }

    PhaserBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(Phaser);
    }

    EQBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(EQ);
    }

    BitCrusherBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(BitCrusher);
    }

    ChompBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(Chomp);
    }

    AutoWahBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(AutoWah);
    }

    MicrophoneBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(Microphone);
    }

    PannerBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(Panner);
    }

    RecorderBlockBtn_Click(e: any){
        this._BlocksSketch.CreateBlockFromType(Recorder);
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