///<amd-dependency path="etch"/>.
import DisplayObject = etch.drawing.DisplayObject;
import {IApp} from '../IApp';
import IDisplayContext = etch.drawing.IDisplayContext
import Point = etch.primitives.Point;

declare var App: IApp;

export class BlockSprites {

    public Ctx: CanvasRenderingContext2D;
    private _Scaled: boolean;
    private _Position: Point;
    private _XOffset: number;
    private _YOffset: number;

    DrawSprite(ctx: IDisplayContext, pos: Point, scaled: boolean, blockType: string, pos2?: Point) {

        this.Ctx = ctx.Ctx;
        this._Scaled = scaled;
        this._Position = pos;
        this._XOffset = 0;
        this._YOffset = 0;
        var grd = App.GridSize;

        switch (blockType) {

            // All block cases must be lower case

            case App.L10n.Blocks.Effect.Blocks.AutoWah.name.toLowerCase():

                if (!this._Scaled) {
                    this._XOffset = (grd*0.5);
                    this._YOffset = (grd*0.5);
                }

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[3].toString();// BLUE
                App.FillColor(this.Ctx,App.Palette[3]);
                this.DrawMoveTo(0,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(-2,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[8].toString();// WHITE
                App.FillColor(this.Ctx,App.Palette[8]);
                this.DrawMoveTo(1,-1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Effect.Blocks.BitCrusher.name.toLowerCase():

                if (!this._Scaled) {
                    this._YOffset =  grd;
                }

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[7].toString();// RED
                App.FillColor(this.Ctx,App.Palette[7]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(1,-2);
                this.DrawLineTo(1,0);
                this.DrawLineTo(0,1);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[3].toString();// BLUE
                App.FillColor(this.Ctx,App.Palette[3]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(1,-2);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(0,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Effect.Blocks.Chomp.name.toLowerCase():

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[7].toString();// RED
                App.FillColor(this.Ctx,App.Palette[7]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[8].toString();// WHITE
                App.FillColor(this.Ctx,App.Palette[8]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(0,1);
                this.DrawLineTo(-1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Effect.Blocks.Chopper.name.toLowerCase():

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[3].toString();// BLUE
                App.FillColor(this.Ctx,App.Palette[3]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[4].toString();// GREEN
                App.FillColor(this.Ctx,App.Palette[4]);
                this.DrawMoveTo(0,0);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Effect.Blocks.Chorus.name.toLowerCase():

                if (!this._Scaled) {
                    this._YOffset = (grd*0.5);
                }

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[10].toString();// ORANGE
                App.FillColor(this.Ctx,App.Palette[10]);
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(0,1);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[6].toString();// YELLOW
                App.FillColor(this.Ctx,App.Palette[6]);
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(0,0);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Effect.Blocks.Convolution.name.toLowerCase():

                if (!this._Scaled) {
                    this._XOffset = -(grd*0.5);
                }

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[8].toString();// WHITE
                App.FillColor(this.Ctx,App.Palette[8]);
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(2,0);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[4].toString();// GREEN
                App.FillColor(this.Ctx,App.Palette[4]);
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(0,0);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[6].toString();// YELLOW
                App.FillColor(this.Ctx,App.Palette[6]);
                this.DrawMoveTo(0,0);
                this.DrawLineTo(1,0);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Effect.Blocks.Delay.name.toLowerCase():

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[7].toString();// RED
                App.FillColor(this.Ctx,App.Palette[7]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,2);
                this.DrawLineTo(0,1);
                this.DrawLineTo(-1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[3].toString();// BLUE
                App.FillColor(this.Ctx,App.Palette[3]);
                this.DrawMoveTo(-1,1);
                this.DrawLineTo(0,0);
                this.DrawLineTo(1,1);
                this.DrawLineTo(1,2);
                this.DrawLineTo(0,1);
                this.DrawLineTo(-1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Effect.Blocks.Distortion.name.toLowerCase():

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[7].toString();// RED
                App.FillColor(this.Ctx,App.Palette[7]);
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(-1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[9].toString();// PINK
                App.FillColor(this.Ctx,App.Palette[9]);
                this.DrawLineTo(-1,-1);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(0,0);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Effect.Blocks.Envelope.name.toLowerCase():

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[6].toString();// YELLOW
                App.FillColor(this.Ctx,App.Palette[6]);
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[3].toString();// BLUE
                App.FillColor(this.Ctx,App.Palette[3]);
                this.DrawMoveTo(0,0);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Effect.Blocks.Eq.name.toLowerCase():

                if (!this._Scaled) {
                    this._XOffset = -(grd*0.5);
                    this._YOffset = (grd*0.5);
                }

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[3].toString();// BLUE
                App.FillColor(this.Ctx,App.Palette[3]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(2,0);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[8].toString();// WHITE
                App.FillColor(this.Ctx,App.Palette[8]);
                this.DrawMoveTo(0,0);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(2,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[4].toString();// GREEN
                App.FillColor(this.Ctx,App.Palette[4]);
                this.DrawLineTo(0,0);
                this.DrawLineTo(1,1);
                this.DrawLineTo(2,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Effect.Blocks.Filter.name.toLowerCase():

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[4].toString();// GREEN
                App.FillColor(this.Ctx,App.Palette[4]);
                this.DrawMoveTo(-1,-2);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,2);
                this.DrawLineTo(-1,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[6].toString();// YELLOW
                App.FillColor(this.Ctx,App.Palette[6]);
                this.DrawMoveTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,2);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Effect.Blocks.Volume.name.toLowerCase():

                if (!this._Scaled) {
                    this._XOffset = -(grd*0.5);
                    this._YOffset = (grd*0.5);
                }

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[5].toString();// PURPLE
                App.FillColor(this.Ctx,App.Palette[5]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(2,1);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();
                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[3].toString();// BLUE
                App.FillColor(this.Ctx,App.Palette[3]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,0);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Effect.Blocks.Vibrato.name.toLowerCase():

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[9].toString();// PINK
                App.FillColor(this.Ctx,App.Palette[9]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[6].toString();// YELLOW
                App.FillColor(this.Ctx,App.Palette[6]);
                this.DrawMoveTo(0,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            //case "panner":
            //
            //    this.Ctx.beginPath();
            //    //this.Ctx.fillStyle = App.Palette[9].toString();// PINK
            //    App.FillColor(this.Ctx,App.Palette[9]);
            //    this.DrawMoveTo(-1,0);
            //    this.DrawLineTo(0,-1);
            //    this.DrawLineTo(1,0);
            //    this.DrawLineTo(0,1);
            //    this.Ctx.closePath();
            //    this.Ctx.fill();
            //
            //    this.Ctx.beginPath();
            //    //this.Ctx.fillStyle = App.Palette[7].toString();// RED
            //    App.FillColor(this.Ctx,App.Palette[7]);
            //    this.DrawMoveTo(0,-1);
            //    this.DrawLineTo(1,0);
            //    this.DrawLineTo(0,1);
            //    this.Ctx.closePath();
            //    this.Ctx.fill();
            //
            //    break;

            case App.L10n.Blocks.Effect.Blocks.Phaser.name.toLowerCase():

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[9].toString();// PINK
                App.FillColor(this.Ctx,App.Palette[9]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(-1,-2);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[8].toString();// WHITE
                App.FillColor(this.Ctx,App.Palette[8]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(-1,-1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Effect.Blocks.PitchShifter.name.toLowerCase():

                if (!this._Scaled) {
                    this._XOffset = -(grd*0.5);
                    this._YOffset = (grd*0.5);
                }

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[3].toString();// WHITE
                App.FillColor(this.Ctx,App.Palette[3]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(2,-1);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[5].toString();// PURPLE
                App.FillColor(this.Ctx,App.Palette[5]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,0);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Effect.Blocks.Reverb.name.toLowerCase():

                if (!this._Scaled) {
                    this._XOffset = -(grd*0.5);
                }

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[4].toString();// GREEN
                App.FillColor(this.Ctx,App.Palette[4]);
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(2,0);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[8].toString();// WHITE
                App.FillColor(this.Ctx,App.Palette[8]);
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(0,0);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[6].toString();// YELLOW
                App.FillColor(this.Ctx,App.Palette[6]);
                this.DrawMoveTo(0,0);
                this.DrawLineTo(1,0);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Effect.Blocks.Scuzz.name.toLowerCase():

                if (!this._Scaled) {
                    this._YOffset = grd;
                }

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[10].toString();// ORANGE
                App.FillColor(this.Ctx,App.Palette[10]);
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(2,-1);
                this.DrawLineTo(0,1);
                this.DrawLineTo(-1,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[7].toString();// RED
                App.FillColor(this.Ctx,App.Palette[7]);
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(0,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Source.Blocks.Tone.name.toLowerCase():

                if (!this._Scaled) {
                    this._YOffset = (grd*0.5);
                }

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[5].toString();// PURPLE
                App.FillColor(this.Ctx,App.Palette[5]);
                this.DrawMoveTo(-2,0);
                this.DrawLineTo(0,-2);
                this.DrawLineTo(2,0);
                this.DrawLineTo(1,1);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[8].toString();// WHITE
                App.FillColor(this.Ctx,App.Palette[8]);
                this.DrawMoveTo(-2,0);
                this.DrawLineTo(0,-2);
                this.DrawLineTo(0,0);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[4].toString();// GREEN
                App.FillColor(this.Ctx,App.Palette[4]);
                this.DrawMoveTo(0,-2);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(0,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Source.Blocks.Noise.name.toLowerCase():

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[4].toString();// GREEN
                App.FillColor(this.Ctx,App.Palette[4]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(-1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[8].toString();// WHITE
                App.FillColor(this.Ctx,App.Palette[8]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(0,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Source.Blocks.Microphone.name.toLowerCase():

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[8].toString();// WHITE
                App.FillColor(this.Ctx,App.Palette[8]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[9].toString();// PINK
                App.FillColor(this.Ctx,App.Palette[9]);
                this.DrawMoveTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Source.Blocks.Soundcloud.name.toLowerCase():

                if (!this._Scaled) {
                    this._XOffset = -(grd*0.5);
                    this._YOffset = (grd*0.5);
                }

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[7].toString();// RED
                App.FillColor(this.Ctx,App.Palette[7]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(2,0);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[10].toString();// ORANGE
                App.FillColor(this.Ctx,App.Palette[10]);
                this.DrawMoveTo(1,0);
                this.DrawLineTo(2,0);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            //case App.L10n.Blocks.Source.Blocks.Sampler.name.toLowerCase():
            //
            //    if (!this._Scaled) {
            //        this._XOffset = -(grd*0.5);
            //        this._YOffset = (grd*0.5);
            //    }
            //
            //    this.Ctx.beginPath();
            //    //this.Ctx.fillStyle = App.Palette[1].toString();// RED
            //    App.FillColor(this.Ctx,App.Palette[4]);
            //    this.DrawMoveTo(-1,0);
            //    this.DrawLineTo(0,-1);
            //    this.DrawLineTo(1,-1);
            //    this.DrawLineTo(2,0);
            //    this.DrawLineTo(1,1);
            //    this.DrawLineTo(0,1);
            //    this.Ctx.closePath();
            //    this.Ctx.fill();
            //
            //    this.Ctx.beginPath();
            //    //this.Ctx.fillStyle = App.Palette[9].toString();// ORANGE
            //    App.FillColor(this.Ctx,App.Palette[9]);
            //    this.DrawMoveTo(1,0);
            //    this.DrawLineTo(2,0);
            //    this.DrawLineTo(1,1);
            //    this.DrawLineTo(0,1);
            //    this.Ctx.closePath();
            //    this.Ctx.fill();
            //
            //    break;

            case App.L10n.Blocks.Source.Blocks.Granular.name.toLowerCase():

                if (!this._Scaled) {
                    this._XOffset = -(grd*0.5);
                }

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[4].toString();// GREEN
                App.FillColor(this.Ctx,App.Palette[4]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,2);
                this.Ctx.closePath();
                this.Ctx.fill();
                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[5].toString();// PURPLE
                App.FillColor(this.Ctx,App.Palette[5]);
                this.DrawMoveTo(0,0);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(2,0);
                this.DrawLineTo(2,1);
                this.DrawLineTo(1,2);
                this.DrawLineTo(1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Source.Blocks.Recorder.name.toLowerCase():

                if (!this._Scaled) {
                    this._XOffset = -(grd*0.5);
                }

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[9].toString();// PINK
                App.FillColor(this.Ctx,App.Palette[9]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,2);
                this.Ctx.closePath();
                this.Ctx.fill();
                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[8].toString();// WHITE
                App.FillColor(this.Ctx,App.Palette[8]);
                this.DrawMoveTo(1,-1);
                this.DrawLineTo(2,0);
                this.DrawLineTo(2,1);
                this.DrawLineTo(1,2);
                this.Ctx.closePath();
                this.Ctx.fill();
                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[7].toString();// RED
                App.FillColor(this.Ctx,App.Palette[7]);
                this.DrawMoveTo(0,0);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,1);
                this.Ctx.closePath();
                this.Ctx.fill();


                break;

            case App.L10n.Blocks.Source.Blocks.SampleGen.name.toLowerCase():

                /*if (!this._Scaled) {
                    this._XOffset = -(grd*0.5);
                }*/

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[5].toString();// PINK
                App.FillColor(this.Ctx,App.Palette[5]);
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,2);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();
                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[10].toString();// WHITE
                App.FillColor(this.Ctx,App.Palette[10]);
                this.DrawMoveTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,2);
                this.DrawLineTo(0,2);
                this.Ctx.closePath();
                this.Ctx.fill();


                break;

            case App.L10n.Blocks.Interaction.Blocks.ComputerKeyboard.name.toLowerCase():

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[8].toString();// WHITE
                App.FillColor(this.Ctx,App.Palette[8]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(2,1);
                this.DrawLineTo(1,2);
                this.DrawLineTo(-1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[4].toString();// GREEN
                App.FillColor(this.Ctx,App.Palette[4]);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(0,1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(1,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Interaction.Blocks.MIDIController.name.toLowerCase():

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[8].toString();// WHITE
                App.FillColor(this.Ctx,App.Palette[8]);
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(2,1);
                this.DrawLineTo(1,2);
                this.DrawLineTo(-1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[4].toString(); //GREEN
                App.FillColor(this.Ctx,App.Palette[4]);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(-1,1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(1,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[9].toString(); //PINK
                App.FillColor(this.Ctx,App.Palette[9]);
                this.DrawLineTo(-1,-1);
                this.DrawLineTo(-1,1);
                this.DrawLineTo(0,1);
                this.DrawLineTo(0,-1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Power.Blocks.ParticleEmitter.name.toLowerCase():

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[5].toString();// PURPLE
                App.FillColor(this.Ctx,App.Palette[5]);
                this.DrawMoveTo(-2,0);
                this.DrawLineTo(2,0);
                this.DrawLineTo(0,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[7].toString();// RED
                App.FillColor(this.Ctx,App.Palette[7]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Power.Blocks.Power.name.toLowerCase():

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[3].toString();// BLUE
                App.FillColor(this.Ctx,App.Palette[3]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(1,-2);
                this.DrawLineTo(2,-1);
                this.DrawLineTo(2,0);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[4].toString();// GREEN
                App.FillColor(this.Ctx,App.Palette[4]);
                this.DrawMoveTo(0,0);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(2,0);
                this.DrawLineTo(0,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[8].toString();// WHITE
                App.FillColor(this.Ctx,App.Palette[8]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(1,-2);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(0,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Power.Blocks.TogglePower.name.toLowerCase():

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[3].toString(); // BLUE
                App.FillColor(this.Ctx,App.Palette[3]);
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(1,2);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[7].toString(); // RED
                App.FillColor(this.Ctx,App.Palette[7]);
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(0,0);
                this.DrawLineTo(0,1);
                this.DrawLineTo(1,2);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,1);
                this.Ctx.closePath();
                this.Ctx.fill();


                break;

            case App.L10n.Blocks.Power.Blocks.PulsePower.name.toLowerCase():

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[3].toString(); // BLUE
                App.FillColor(this.Ctx,App.Palette[3]);
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[5].toString(); // PURPLE
                App.FillColor(this.Ctx,App.Palette[5]);
                this.DrawMoveTo(0,1);
                this.DrawLineTo(0,0);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,1);
                this.DrawLineTo(0,2);
                this.DrawLineTo(-1,2);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Power.Blocks.Laser.name.toLowerCase():

                if (!this._Scaled) {
                    this._YOffset = (grd*0.5);
                }

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[3].toString();// BLUE
                App.FillColor(this.Ctx,App.Palette[3]);
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(0,1);
                this.DrawLineTo(-1,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[4].toString();// GREEN
                App.FillColor(this.Ctx,App.Palette[4]);
                this.DrawMoveTo(0,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                this.Ctx.beginPath();
                //this.Ctx.fillStyle = App.Palette[7].toString();// RED
                App.FillColor(this.Ctx,App.Palette[7]);
                this.DrawMoveTo(-1,-1);
                this.DrawLineTo(1,-1);
                this.DrawLineTo(0,0);
                this.Ctx.closePath();
                this.Ctx.fill();

                break;

            case App.L10n.Blocks.Power.Blocks.Void.name.toLowerCase():

                /*if (!this._Scaled) {
                    this._YOffset = (grd*0.5);
                }*/
                //this.Ctx.fillStyle = App.Palette[14].toString();// DARK
                App.FillColor(this.Ctx,App.Palette[14]);
                /*if (!this._Scaled) {
                    this.Ctx.fillStyle = App.Palette[14].toString();// DARK
                }*/
                this.Ctx.beginPath();
                this.DrawMoveTo(-1,0);
                this.DrawLineTo(0,-1);
                this.DrawLineTo(1,0);
                this.DrawLineTo(0,1);
                this.Ctx.closePath();
                this.Ctx.fill();

                //this.Ctx.fillStyle = App.Palette[8].toString();// WHITE
                App.FillColor(this.Ctx,App.Palette[8]);
                if (!this._Scaled) {
                    this.DrawPixel(-1,2,2);
                } else {
                    this.DrawPixel(pos2.x,pos2.y,2);
                }

                this.DrawPixel(-3,-8,1);
                this.DrawPixel(1,-4,1);
                this.DrawPixel(8,-3,1);
                this.DrawPixel(-8,1,1);
                this.DrawPixel(1,9,1);
                break;

            default:
                console.log("block not found");

        }
    }

    DrawPixel(x,y,size) {
        var s = size * 0.5;
        this.Ctx.beginPath();
        this.DrawFloatMoveTo(x,y);
        this.DrawFloatLineTo(x+s,y);
        this.DrawFloatLineTo(x+s,y+s);
        this.DrawFloatLineTo(x,y+s);
        this.Ctx.closePath();
        this.Ctx.fill();
    }

    DrawMoveTo(x, y) {
        var pos = new Point(this._Position.x + this._XOffset, this._Position.y + this._YOffset);
        var p;
        var grd = App.GridSize;
        if (this._Scaled) {
            p = App.Metrics.GetRelativePoint(pos, new Point(x, y));
            p = App.Metrics.PointOnGrid(p);
        } else {
            p = new Point(pos.x + (x*grd),pos.y + (y*grd));
        }
        this.Ctx.moveTo(p.x, p.y);
    }

    DrawLineTo(x, y) {
        var pos = new Point(this._Position.x + this._XOffset, this._Position.y + this._YOffset);
        var p;
        var grd = App.GridSize;
        if (this._Scaled) {
            p = App.Metrics.GetRelativePoint(pos, new Point(x, y));
            p = App.Metrics.PointOnGrid(p);
        } else {
            p = new Point(pos.x + (x*grd),pos.y + (y*grd));
        }
        this.Ctx.lineTo(p.x, p.y);
    }

    DrawFloatMoveTo(x, y) {
        var pos = new Point(this._Position.x + this._XOffset, this._Position.y + this._YOffset);
        var p;
        if (this._Scaled) {
            p =  App.Metrics.PointOnGrid(new Point(pos.x + ((x/App.GridSize)*App.Unit),pos.y + ((y/App.GridSize)*App.Unit)));
        } else {
            p = new Point(pos.x + (x*App.Unit),pos.y + (y*App.Unit));
        }
        this.Ctx.moveTo(p.x, p.y);
    }

    DrawFloatLineTo(x, y) {
        var pos = new Point(this._Position.x + this._XOffset, this._Position.y + this._YOffset);
        var p;
        if (this._Scaled) {
            p =  App.Metrics.PointOnGrid(new Point(pos.x + ((x/App.GridSize)*App.Unit),pos.y + ((y/App.GridSize)*App.Unit)));
        } else {
            p = new Point(pos.x + (x*App.Unit),pos.y + (y*App.Unit));
        }
        this.Ctx.lineTo(p.x, p.y);
    }
}