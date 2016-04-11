import {IApp} from '../../IApp';
import IDisplayContext = etch.drawing.IDisplayContext;
import {ISource} from '../ISource';
import {Power} from '../Power/Power';
import {PowerEffect} from '../Power/PowerEffect';

declare var App: IApp;

export class Controller extends PowerEffect {

    //-------------------------------------------------------------------------------------------
    //  INIT
    //-------------------------------------------------------------------------------------------

    public Transposition: number;
    public TranspositionAmount: number;
    public TranspositionRange: number;
    public Bend: number;
    public Mods: number[];
    public Glide: number;
    public KeysDown: any = {};

    Init(drawTo: IDisplayContext): void {
        super.Init(drawTo);

        this.Transposition = 0;
        this.TranspositionAmount = 12;
        this.TranspositionRange = 3;
        this.Bend = 0;
        this.Mods = [];
    }


    //-------------------------------------------------------------------------------------------
    //  MESSAGES
    //-------------------------------------------------------------------------------------------


    // ON //
    NoteOn(note: number, velocity?: number) {

        // NORMALISE VELOCITY //
        velocity = velocity || 127;

        // GET GLIDE //
        var glide: number = 0;
        if (this.Params.glide!==undefined) {
            glide = this.Params.glide;
        }

        // GET POLYPHONY //
        var polyphonic: boolean = false;
        if (this.Params.isPolyphonic!==undefined) {
            polyphonic = this.Params.isPolyphonic;
        }

        // MESSAGE ALL CONNECTED SOURCES //
        let connections: ISource[] = this.Connections.ToArray();
        connections.forEach((source: ISource) => {
            source.NoteOn(""+this.Id, note, polyphonic, glide, velocity);
        });
    }


    // OFF //
    NoteOff(note: number) {

        // MESSAGE ALL CONNECTED SOURCES //
        let connections: ISource[] = this.Connections.ToArray();
        connections.forEach((source: ISource) => {
            source.NoteOff(""+this.Id, note);
        });
    }


    // UPDATE MODS //
    UpdateMods() {

        // MESSAGE ALL CONNECTED SOURCES //
        let connections: ISource[] = this.Connections.ToArray();
        connections.forEach((source: ISource) => {
            source.NoteUpdate();
        });
    }


    // ADD TOGETHER ALL PITCH MODS //
    GetPitchMods() {
        var pitchMods = this.Transposition + this.Bend;
        for (var i=0; i<this.Mods.length; i++) {
            pitchMods += this.Mods[i];
        }
        return pitchMods;
    }


    // EXTRA CONTROL COMMANDS //
    ExecuteCodeCommand(code: number) {
        switch (code) {

            // TRANSPOSE DOWN //
            case 1000:
                if (this.Transposition > - (this.TranspositionAmount * this.TranspositionRange)) {
                    this.Transposition -= this.TranspositionAmount;
                    if (this.Params.transpose!==undefined) {
                        this.Params.transpose -= 1;
                        this.RefreshOptionsPanel();
                    }
                    this.UpdateMods();
                }
                break;

            // TRANSPOSE UP //
            case 1001:
                if (this.Transposition < (this.TranspositionAmount * this.TranspositionRange)) {
                    this.Transposition += this.TranspositionAmount;
                    if (this.Params.transpose!==undefined) {
                        this.Params.transpose += 1;
                        this.RefreshOptionsPanel();
                    }
                    this.UpdateMods();
                }
                break;
        }
    }

    //-------------------------------------------------------------------------------------------
    //  CONNECTIONS
    //-------------------------------------------------------------------------------------------

    UpdateConnections() {
    }

    //-------------------------------------------------------------------------------------------
    //  CONVERSIONS
    //-------------------------------------------------------------------------------------------


    MidiVelocityToGain(velocity) {
        return velocity / 127;
    }

}
