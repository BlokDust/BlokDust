import {Option} from './Option';
import {OptionsPanel as ParametersPanel} from './../OptionsPanel';
import Size = minerva.Size; //TODO: es6 modules
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