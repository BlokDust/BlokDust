/**
 * Created by luketwyman on 18/01/2015.
 */
import IOption = require("./IOption");

interface IOptionSlider extends IOption {

    Origin: number;
    Selected: boolean;
    Value: number;
    Min: number;
    Max: number;
    Quantised: boolean;

}

export = IOptionSlider;