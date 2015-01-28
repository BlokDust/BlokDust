import IModifier = require("../IModifier");
import Modifier = require("../Modifier");
import IEffect = require("../IEffect");
import Grid = require("../../Grid");
import App = require("../../App");

class Recorder extends Modifier {

    public Component: IEffect;
    public Recorder;
    public MonoRecording: boolean = true;
    public RecIndex: number = 0;

    constructor(grid: Grid, position: Point){
        super(grid, position);

        this.Recorder = new Recorder(App.AudioMixer.Master);


        this.OpenParams();
        // Define Outline for HitTest
        this.Outline.push(new Point(-1, -1),new Point(1, -1),new Point(2, 0),new Point(0, 2),new Point(-1, 1));
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

    Delete(){

    }

    StartRecording() {
        this.Recorder.Clear();
        this.Recorder.Record();
    }

    StopRecording() {
        this.Recorder.Stop();
        this.Recorder.GetBuffers( this.Recorder.exportWAV( this._doneEncoding ) )
    }

    SaveRecording() {
        if (this.MonoRecording) {
            this.Recorder.ExportMono( this._doneEncoding );
        } else {
            this.Recorder.ExportStereo( this._doneEncoding );
        }
    }

    PlayRecording() {

    }

    DownloadRecording() {
        this.Recorder.Download(this.Recorder.getBuffer());
    }

    private _doneEncoding( blob ) {
        this.Recorder.Download( blob, "FILENAME" + ((this.RecIndex<10)?"0":"") + this.RecIndex + ".wav" );
        this.RecIndex++;
    }
}

export = Recorder;