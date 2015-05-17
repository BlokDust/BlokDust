import KeyboardPoly = require("./KeyboardPoly");
import ISource = require("../ISource");
import BlocksSketch = require("../../BlocksSketch");

class MIDIController extends KeyboardPoly {

    Init(sketch?: Fayde.Drawing.SketchContext): void {
        super.Init(sketch);

        // Define Outline for HitTest
        this.Outline.push(new Point(-1, 0),new Point(0, -1),new Point(2, 1),new Point(1, 2),new Point(-1, 2));
    }


    Draw() {
        super.Draw();
        (<BlocksSketch>this.Sketch).BlockSprites.Draw(this.Position,true,"poly keyboard");
    }

    Attach(source: ISource): void {
        super.Attach(source);
    }

    Detach(source: ISource): void {
        super.Detach(source);
    }

    Dispose(){
        super.Dispose();
    }

    CreateVoices(source: ISource){
        super.CreateVoices(source);
    }

    KeyboardDown(keyDown:string, source:ISource): void {
        super.KeyboardDown(keyDown, source);
    }

    KeyboardUp(keyUp:string, source:ISource): void {
        super.KeyboardUp(keyUp, source);
    }


    SetParam(param: string,value: number) {
        super.SetParam(param,value);

    }

    GetParam(param: string) {
        super.GetParam(param);

    }

    UpdateOptionsForm() {
        super.UpdateOptionsForm();

        this.OptionsForm =
        {
            "name" : "MIDI Controller",
            "parameters" : [

                {
                    "type" : "slider",
                    "name" : "Octave",
                    "setting" :"octave",
                    "props" : {
                        "value" : this.GetParam("octave"),
                        "min" : 0,
                        "max" : 9,
                        "quantised" : true,
                        "centered" : false
                    }
                },
            ]
        };
    }


}

export = MIDIController;