/**
 * Created by luketwyman on 16/01/2015.
 */
import Size = Fayde.Utils.Size;

interface IOption {
    Type: String;
    Position: Point;
    Size: Size;
    Origin: number;
    Selected: boolean;
    Value: number;
    Min: number;
    Max: number;
    Quantised: boolean;
    Name: string;
    Setting: string;
}

export = IOption;