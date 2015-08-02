/**
 * Created by luketwyman on 30/07/2015.
 */


import Option = require("./Option");
import WaveForm = require("./OptionWave");
import Size = minerva.Size;
import ParametersPanel = require("./../OptionsPanel");

class WaveImage extends WaveForm{

    public Spread: number;


    constructor(position: Point, size: Size, origin: number, name: string, waveform: number[]) {
        super(waveform);

        this.Type = "waveimage";
        this.Position = position;
        this.Size = size;
        this.Origin = origin;
        this.Name = name;
    }


    Draw(ctx,units,i,panel) {
        super.Draw(ctx,units,i,panel);
    }


}


export = WaveImage;