import Size = minerva.Size;
import {WaveForm} from './OptionWave';
import Point = etch.primitives.Point;

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