import App = require("../../App");
import IBlock = require("../IBlock");
import Block = require("../Block");
import IModifier = require("../IModifier");
import Modifiable = require("../Modifiable");
import Grid = require("../../Grid");
import Source = require("./Source");
import Type = require("../BlockType");
import BlockType = Type.BlockType;
import Particle = require("../../Particle");

declare var RecorderJS;

class RecorderBlock extends Source {

    public Signal;
    public Recorder: any;
    public MonoRecording: boolean;
    private RecIndex: number;

    constructor(grid: Grid, position: Point) {
        this.BlockType = BlockType.Recorder;

        super(grid, position);


        this.Recorder = new Recorder(App.AudioMixer.Master, {
            workerPath: "Assets/Recorder/recorderWorker.js"
        });

        this.RecIndex = 0;
        this.MonoRecording = false;
        var _this = this;

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(1, 1),new Point(0, 1));
    }

    Update() {
        super.Update();

    }

    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[9];// PINK
        this.DrawMoveTo(-1,0);
        this.DrawLineTo(0,-1);
        this.DrawLineTo(1,0);
        this.DrawLineTo(0,1);
        this.Ctx.closePath();
        this.Ctx.fill();

    }

    MouseDown() {
        super.MouseDown();

        console.log('start recording');
        this.StartRecording();
    }

    MouseUp() {
        super.MouseUp();

        console.log('stop recording');
        this.StopRecording();
    }

    ParticleCollision(particle: Particle) {
        super.ParticleCollision(particle);

        particle.Dispose();
    }


    Delete(){

    }

    StartRecording() {
        this.Recorder.clear();
        this.Recorder.record();
        console.log("This is recording index " + this.RecIndex);
    }

    StopRecording() {
        this.Recorder.stop();
        //var _this = this;
        //this.Recorder.exportWAV(function(blob) {
        //    //console.log(blob);
        //    _this.GetBuffers(blob);
        //});

        this.PlayRecording();
    }

    gotBuffers( buffers ){
        //this.PlayRecording(this.Recorder);
        console.log();
        console.log(buffers);


    }

    //SaveRecording() {
    //    if (this.MonoRecording) {
    //        this.Recorder.exportMonoWAV( this.DoneEncoding );
    //    } else {
    //        this.Recorder.exportWAV( this.DoneEncoding );
    //    }
    //}

    PlayRecording() {
        console.log("Recording " + this.RecIndex + ":+ ");

        this.Recorder.getBuffers(function (buffers) {

            var Signal = new Tone.Signal();
            //var startTime = thereminCtx.currentTime;
            var source = Signal.context.createBufferSource();
            source.buffer = Signal.context.createBuffer(1, buffers[0].length, 44100);

            source.buffer.getChannelData(0).set(buffers[0]);
            source.buffer.getChannelData(0).set(buffers[1]);

            source.loop = true;
            source.connect(Signal.context.destination);
            source.start(0);

        });
    }

    DownloadRecording() {
        this.Recorder.setupDownload(this.Recorder.getBuffer());
    }


    //GetBuffers(blob) {
    //    this.Recorder.getBuffers(this.DoneEncoding);
    //    this.RecIndex++;
    //}


}

export = RecorderBlock;