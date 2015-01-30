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
    public RecordingsArray;
    private RecIndex: number;

    constructor(grid: Grid, position: Point) {
        this.BlockType = BlockType.Recorder;

        super(grid, position);

        //TODO: WHEN RECORDING IT SHOULDN"T DUPLICATE THE RECORDING

        this.Recorder = new Recorder(App.AudioMixer.Master, {
            workerPath: "Assets/Recorder/recorderWorker.js"
        });

        this.RecIndex = 0;
        this.RecordingsArray = [];

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

    StartRecording() {
        this.Recorder.clear();
        this.Recorder.record();
        console.log("This is recording index " + this.RecIndex);
    }

    StopRecording() {
        this.Recorder.stop();
        this.PlayRecording();
    }

    PlayRecording() {

        var Recording = new Tone.Player();
        var bufferSource = Recording.context.createBufferSource();
        var that = this;

        this.Recorder.getBuffers(function (buffers) {

            bufferSource.buffer = Recording.context.createBuffer(1, buffers[0].length, 44100);
            bufferSource.buffer.getChannelData(0).set(buffers[0]);
            bufferSource.buffer.getChannelData(0).set(buffers[1]);

            that.RecordingsArray.push(bufferSource.buffer);

            Recording.connect(that.Source);
            Recording.setBuffer(bufferSource.buffer);
            Recording.loop = true;
            Recording.start();

            that.GetRecordedBuffers();

        });

        console.log();

        console.log("Playing recording "+this.RecIndex);
        this.RecIndex++;
    }

    GetRecordedBuffers() {
        return this.RecordingsArray;
    }

    DownloadRecording() {
        this.Recorder.setupDownload(this.Recorder.getBuffers());
    }

    Delete(){
        super.Delete();

        this.Recorder = null;

        //TODO: DELETE EVERYTHING PROPERLY

        console.log('stopped recordings');
    }
}

export = RecorderBlock;