import Grid = require("../../Grid");
import BlocksSketch = require("../../BlocksSketch");
import Source = require("../Source");

class RecorderBlock extends Source {

    public Sources : Tone.Sampler[];
    public Recorder: any;
    public BufferSource;
    public Filename: string;
    private _isRecording: boolean = false;
    public RecordedBlob;
    public PlaybackRate: number;

    Init(sketch?: Fayde.Drawing.SketchContext): void {

        this.PlaybackRate = 1;

        super.Init(sketch);


        this.CreateSource();
        this.BufferSource = App.AudioMixer.Master.context.createBufferSource();

        this.Recorder = new Recorder(App.AudioMixer.Master, {
            workerPath: App.Config.RecorderWorkerPath
        });

        this.Envelopes.forEach((e: Tone.AmplitudeEnvelope, i: number)=> {
            e = this.Sources[i].envelope;
        });

        this.Sources.forEach((s: Tone.Sampler) => {
            s.connect(this.EffectsChainInput);
            s.volume.value = 10; //TODO: this is shit
        });

        this.Filename = "BlokdustRecording.wav"; //TODO: make an input box for filename download

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(2, 1),new Point(1, 2));



        //RECORD BUTTON TODO: make this a command in the command manager
        App.KeyboardInput.KeyDownChange.on(this.KeyDownCallback, this);
    }

    Update() {
        super.Update();
    }

    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"recorder");
    }

    MouseDown() {
        super.MouseDown();
        //this.StartRecording();
        this.TriggerAttack();
    }

    MouseUp() {
        super.MouseUp();
        //this.StopRecording();
        this.TriggerRelease();
    }

    KeyDownCallback(e){

        if ((<any>e).KeyDown === 'spacebar'){

            // Start recording on spacebar
            this.Sources.forEach((s: Tone.Sampler)=> {
                this.ToggleRecording();
            });
        }
    }

    KeyboardDown(key:string, source): void {

    }

    ToggleRecording(){
        if (this._isRecording) {
            this.StopRecording();
        } else {
            this.StartRecording();
        }
    }

    StartRecording() {
        this.Recorder.clear();
        console.log('STARTED RECORDING...');
        this._isRecording = true;
        this.Recorder.record();
    }

    StopRecording() {
        this.Recorder.stop();
        this._isRecording = false;

        ////TODO: this may not be necceseary
        //this.Sources.forEach((s: any)=> {
        //    this.TriggerRelease();
        //});

        console.log('STOPPED RECORDING');
        this.SetBuffers();
    }

    StartPlayback() {
        this.Sources.forEach((s: any)=> {
            this.TriggerAttack();
        });

        console.log("STARTED PLAYBACK");
        console.log(this.GetRecordedBlob());
    }

    SetBuffers() {

        this.Recorder.getBuffers((buffers) => {

            this.BufferSource.buffer = this.Sources[0].context.createBuffer(1, buffers[0].length, 44100);
            this.BufferSource.buffer.getChannelData(0).set(buffers[0]);
            this.BufferSource.buffer.getChannelData(0).set(buffers[1]);

            this.Sources[0].player.buffer = this.BufferSource.buffer;

            this._OnBuffersReady();
        });
    }

    private _OnBuffersReady() {
        this.StartPlayback();
    }

    StopPlayback() {
        this.Sources.forEach((s: any)=> {
            this.TriggerRelease();
        });
        console.log("STOPPED PLAYBACK");
    }

    GetRecordedBuffers() {
        return this.BufferSource.buffer;
    }

    GetRecordedBlob() {
        this.Recorder.exportWAV((blob) => {
            this.RecordedBlob = blob;
        });

        return this.RecordedBlob;
    }

    DownloadRecording() {
        this.Recorder.setupDownload(this.GetRecordedBlob(), this.Filename);
    }

    Dispose(){
        super.Dispose();
        this.BufferSource = null;
        this.Recorder = null;
        this.RecordedBlob = null;

        this.Sources.forEach((s: any)=> {
            s.dispose();
        });

    }

    CreateSource(){
        this.Sources.push( new Tone.Sampler(this.BufferSource) );

        this.Sources.forEach((s: Tone.Sampler)=> {
            s.player.loop = true;
            s.player.loopStart = 0; // 0 is the beginning
            s.player.loopEnd = -1; // -1 goes to the end of the track
            s.player.retrigger = false; //Don't retrigger attack if already playing
            //s.player.reverse = true; //TODO: add reverse capability
        });

        return super.CreateSource();
    }

    CreateEnvelope(){
        return super.CreateEnvelope();
    }

    TriggerAttack(){
        super.TriggerAttack();

        //if(!this.IsPowered() || this.Sources[0].player.state === "stopped") {
        //    this.Sources.forEach((s: any)=> {
        //        s.triggerAttack();
        //    });
        //}
    }

    TriggerRelease(){
        super.TriggerRelease();

        //if(!this.IsPowered()) {
        //    this.Sources.forEach((s: any)=> {
        //        s.triggerRelease();
        //    });
        //}
    }

    TriggerAttackRelease(){

    }
}

export = RecorderBlock;