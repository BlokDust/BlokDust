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

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(1, -1),new Point(2, 0),new Point(1, 1),new Point(0, 1));
    }

    Update() {
        super.Update();

    }

    Draw() {
        super.Draw();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[9];// GREEN
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(1,-1);
        this.DrawLineTo(2,0);
        this.DrawLineTo(0,2);
        this.DrawLineTo(-1,1);
        this.Ctx.closePath();
        this.Ctx.fill();

        this.Ctx.beginPath();
        this.Ctx.fillStyle = App.Palette[1];// WHITE
        this.DrawMoveTo(-1,-1);
        this.DrawLineTo(0,0);
        this.DrawLineTo(0,2);
        this.DrawLineTo(-1,1);
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
        var _this = this;
        this.Recorder.exportWAV(function(blob) {
            console.log(blob);
            _this.GetBuffers(blob);
        });
    }

    SaveRecording() {
        if (this.MonoRecording) {
            this.Recorder.exportMonoWAV( this.DoneEncoding );
        } else {
            this.Recorder.exportWAV( this.DoneEncoding );
        }
    }

    PlayRecording() {
        console.log("Recording " + this.RecIndex + ":+ ");
    }

    DownloadRecording() {
        this.Recorder.setupDownload(this.Recorder.getBuffer());
    }


    DoneEncoding( buffers ) {
        console.log(buffers);
    }

    GetBuffers(blob) {
        this.Recorder.getBuffers(this.DoneEncoding);
        this.RecIndex++;
    }


}

export = RecorderBlock;