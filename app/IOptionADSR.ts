/**
 * Created by luketwyman on 18/01/2015.
 */
import IOption = require("./IOption");

interface IOptionADSR extends IOption {

    A: number;
    AMin: number;
    AMax: number;
    D: number;
    DMin: number;
    DMax: number;
    S: number;
    SMin: number;
    SMax: number;
    R: number;
    RMin: number;
    RMax: number;

}

export = IOptionADSR;