import {IApp} from '../../IApp';
import {Controller} from './Controller';
import IDisplayContext = etch.drawing.IDisplayContext;
import {ISource} from '../ISource';

declare var App: IApp;

/**
 * Base class for mono, poly and midi keyboards
 */
export class Keyboard extends Controller {

    public KeysDown: any;

    init(drawTo: IDisplayContext): void {
        super.init(drawTo);

        this.KeysDown = {};
    }

    //-------------------------------------------------------------------------------------------
    //  DRAW
    //-------------------------------------------------------------------------------------------

    draw() {
        super.draw();
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
                if (this.Params.isPolyphonic){
                    source.CreateVoices();
                } else {
                    source.RemoveExtraVoices();
                }
                
            });
            App.Audio.ConnectionManager.update();
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
