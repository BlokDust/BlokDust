/**
 * Created by luketwyman on 17/01/2015.
 */

/**
 * Created by luketwyman on 16/01/2015.
 */

import Option = require("./Option");
import IOptionADSR = require("./IOptionADSR");
import Size = Fayde.Utils.Size;
import ParametersPanel = require("./ParametersPanel");
import OptionHandle = require("./OptionHandle");

class ADSR extends Option{

    private _Node:any[];

    public Handles: OptionHandle[];


    constructor(position: Point, size: Size, name: string, handle0, handle1, handle2) {
        super();

        this.Type = "ADSR";
        this.Position = position;
        this.Size = size;
        this.Name = name;

        this.Handles = [];

        this._Node = [];
        this.EValue = [];
        this.EMin = [];
        this.EMax = [];
        this.EPerc = [];

        this.HandleRoll = [];

        this.Handles[0] = handle0;
        this.Handles[1] = handle1;
        this.Handles[2] = handle2;

        /*this._Node[0] = node0;
        this._Node[1] = node1;
        this._Node[2] = node2;
        this._Node[3] = node3;

        for (var i=0;i<4;i++) {
            this.EValue[i] = this._Node[i].value;
            this.EMin[i] = this._Node[i].min;
            this.EMax[i] = this._Node[i].max;
            this.EPerc[i] = this._Node[i].perc;
        }*/






    }

    logValue(options,position) {
        options = options || {};
        var minpos = options.minpos || 0;
        var maxpos = options.maxpos || 100;
        var minlval = Math.log(options.minval || 1);
        var maxlval = Math.log(options.maxval || 100000);
        var scale = (maxlval - minlval) / (maxpos - minpos);
        return Math.exp((position - minpos) * scale + minlval);

    }

    logPosition(options,value) {
        options = options || {};
        var minpos = options.minpos || 0;
        var maxpos = options.maxpos || 100;
        var minlval = Math.log(options.minval || 1);
        var maxlval = Math.log(options.maxval || 100000);
        var scale = (maxlval - minlval) / (maxpos - minpos);
        return minpos + (Math.log(value) - minlval) / scale;
    }

}


export = ADSR;