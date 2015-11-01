import Size = minerva.Size;
import {OptionsPanel as ParametersPanel} from './../OptionsPanel';
import {Option} from './Option';
import Point = etch.primitives.Point;
import {WaveForm} from './OptionWave';

export class WaveImage extends WaveForm{

    public Spread: number;

    constructor(position: Point, size: Size, origin: number, name: string, waveform: number[], emptystring?: string) {
        super(waveform,emptystring);

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