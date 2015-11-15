import {IApp} from '../../../IApp';
import {Grain} from './Grain';


declare var App: IApp;


export class GranularVoice {

    public Grains: Grain[];
    public Signal: Tone.Signal;

    constructor() {
        this.Grains = [];
        this.Signal = new Tone.Signal();
    }

    Setup(grainNo: number,a: number,d: number,s: number,r: number) {
        for (var i=0; i<grainNo; i++) {
            this.Grains.push(new Grain(a,d,s,r,this.Signal));
        }
    }

}
