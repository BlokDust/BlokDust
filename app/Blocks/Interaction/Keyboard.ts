import {Granular} from '../Sources/Granular';
import {IApp} from '../../IApp';
import {Interaction} from './Interaction';
import {Controller} from './Controller';
import IDisplayContext = etch.drawing.IDisplayContext;
import {ISource} from '../ISource';
import {Recorder} from '../Sources/Recorder';
import {SamplerBase} from '../Sources/SamplerBase';

declare var App: IApp;

/**
 * Base class for mono, poly and midi keyboards
 */
export class Keyboard extends Controller {

    public KeysDown: any;

    Init(drawTo: IDisplayContext): void {
        super.Init(drawTo);

        this.KeysDown = {};
    }

    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------

    Draw() {
        super.Draw();
    }

    //-------------------------------------------------------------------------------------------
    //  CONNECTIONS
    //-------------------------------------------------------------------------------------------

    UpdateConnections() {
        this.KeysDown = {};

        let connections: ISource[] = this.Connections.ToArray();
        connections.forEach((source: ISource) => {
            if (this.Params.isPolyphonic) {
                // Create extra polyphonic voices
                source.CreateVoices();
            }
        });
    }


    //-------------------------------------------------------------------------------------------
    //  OPTIONS
    //-------------------------------------------------------------------------------------------

    SetParam(param: string,value: number) {
        super.SetParam(param,value);

        if (param === "glide") {
            value = value/100;
        }
        else if (param === "transpose") {
            this.Transposition = (value * this.TranspositionAmount);
            this.UpdateMods();
        }
        else if (param === 'polyphonic') {
            this.Params.isPolyphonic = value;
            // ALL SOURCES
            let connections: ISource[] = this.Connections.ToArray();
            connections.forEach((source: ISource) => {
                source.CreateVoices();
            });
            App.Audio.ConnectionManager.Update();
        }

        this.Params[param] = value;
    }


    //-------------------------------------------------------------------------------------------
    //  DISPOSE
    //-------------------------------------------------------------------------------------------

    Dispose(){
        this.KeysDown = null;
    }
}
