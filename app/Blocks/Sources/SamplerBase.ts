import {IApp} from '../../IApp';
import {Source} from '../Source';
import {SignalToValue} from '../../Core/Audio/Components/SignalToValue';
import IDisplayContext = etch.drawing.IDisplayContext;

declare var App: IApp;

export class SamplerBase extends Source {

    public PrimaryBuffer: any;
    public ReverseBuffer: any;
    public WaveForm: number[];

    init(drawTo: IDisplayContext): void {
        super.init(drawTo);
        this.CreateSource();
        this.CreateFirstVoice();

        this.PlaybackSignal = new SignalToValue();
    }

    CreateSource(){
        this.Sources.push( new Tone.Simpler() );
        this.Sources.forEach((s: Tone.Simpler, i: number)=> {
            s.player.loop = this.Params.loop;
            s.player.loopStart = this.Params.loopStart;
            s.player.loopEnd = this.Params.loopEnd;
            //s.player.reverse = this.Params.reverse;

            if (i > 0){
                s.player.buffer = this.Sources[0].player.buffer;
            }
        });

        if (this.Sources[this.Sources.length-1]){
            return this.Sources[this.Sources.length-1];
        }
    }

    GetDuration(buffer) {
        if (buffer){
            return buffer.duration;
        } else {
            return 0;
        }
    }

    update() {
        super.update();

        if (this.PlaybackSignal) {
            var value = this.PlaybackSignal.UpdateValue();
            if (value!==0) {
                this.Params.detune = value;
                this.NoteUpdate();
            } else {
                this.Params.detune = 0;
            }
        }
    }

    /**
     * Trigger a Simpler's attack
     * If no index is set trigger the first in the array
     * @param {number | string} index
     * Index is the position of the Envelope in Envelopes[].
     * If index is set to 'all', all envelopes will be triggered
     */
    TriggerAttack(index: number|string = 0) {
        if (index === 'all'){
            // Trigger all the envelopes
            this.Sources.forEach((s: any)=> {
                s.triggerAttack( this.Params.startPosition, this.Params.endPosition - this.Params.startPosition);
            });
        } else {
            // Trigger the specific one
            this.Sources[index].triggerAttack(this.Params.startPosition, this.Params.endPosition - this.Params.startPosition);
        }
    }

    TriggerAttackRelease(index: number|string = 0, duration: Tone.Time = App.Config.PulseLength) {
        if (index === 'all'){
            // Trigger all the envelopes
            this.Sources.forEach((s: any)=> {
                s.triggerAttackRelease(duration, this.Params.startPosition, this.Params.endPosition - this.Params.startPosition);
            });
        } else {
            // Trigger the specific one
            this.Sources[index].triggerAttackRelease(duration, this.Params.startPosition, this.Params.endPosition - this.Params.startPosition);
        }
    }

    /**
     * Trigger a Simpler's release
     * If no index is set release the first in the array
     * @param index number|string position of the Envelope in Envelopes[].
     * If index is set to 'all', all envelopes will be released
     */
    TriggerRelease(index: number|string = 0, forceRelease?: boolean) {
        // Only if it's not powered
        //if (!this.IsPowered() || forceRelease) {
            if (index === 'all'){
                // Trigger all the envelopes
                this.Sources.forEach((s: any)=> {
                    s.triggerRelease();
                });
            } else {
                // Trigger the specific one
                this.Sources[index].triggerRelease();
            }
        //}
    }

    MouseUp() {
        this.FirstSetup();
        super.MouseUp();
    }

    FirstSetup() {

    }

    LoadTrack(track,fullUrl?:boolean) {

    }

    //-------------------------------------------------------------------------------------------
    //  TRACK REVERSING
    //-------------------------------------------------------------------------------------------

    // REVERSE THE TRACK //
    ReverseTrack() {

        // Set visuals //
        this.WaveForm = [];
        this.RefreshOptionsPanel("animate");
        App.AnimationsLayer.AddToList(this); // load animations


        // If we already have a reversed track //
        if (this.ReverseBuffer) {
            this.SwitchBuffer();
            return;
        }

        // Else generate it via the worker //
        var sourceBuffer;
        if (this.PrimaryBuffer.buffer) {
            sourceBuffer = this.PrimaryBuffer.buffer; // TODO: in future make sure all sampler blocks use same type of buffer
        } else if (this.PrimaryBuffer._buffer){
            sourceBuffer = this.PrimaryBuffer._buffer;
        } else {
            sourceBuffer = this.PrimaryBuffer;
        }
        setTimeout(() => {
            App.Audio.ReverseBuffer(this.Id,sourceBuffer);
        },20);
    }


    // SWITCH BETWEEN PRIMARY BUFFER AND REVERSE BUFFER //
    SwitchBuffer() {

        // Get target buffer //
        var sourceBuffer;
        if (this.Params.reverse) {
            sourceBuffer = this.ReverseBuffer.buffer;
        } else {
            if (this.PrimaryBuffer.buffer) {
                sourceBuffer = this.PrimaryBuffer.buffer;
            } else if (this.PrimaryBuffer._buffer){
                sourceBuffer = this.PrimaryBuffer._buffer;
            } else {
                sourceBuffer = this.PrimaryBuffer;
            }
        }

        // Set the buffer //
        this.Sources.forEach((s:Tone.Simpler)=> {
            s.player.buffer = sourceBuffer;
        });

        // Retrigger any active voices //
        this.RetriggerActiveVoices();

        // Update visuals //
        App.AnimationsLayer.RemoveFromList(this);
        this.WaveForm = App.Audio.Waveform.GetWaveformFromBuffer(sourceBuffer, 200, 5, 95);
        this.RefreshOptionsPanel();
    }


    // RETURN FROM WORKER, STORE & SET REVERSE BUFFER //
    SetReversedBuffer(buffer: any) {

        // Store data as ReverseBuffer //
        this.ReverseBuffer = App.Audio.ctx.createBufferSource();
        this.ReverseBuffer.buffer = App.Audio.ctx.createBuffer(buffer.length, buffer[0].length, 44100);
        for (var i=0; i< buffer.length; i++) {
            this.ReverseBuffer.buffer.copyToChannel (buffer[i],i,0);
        }

        // Set source buffers //
        this.Sources.forEach((s:Tone.Simpler)=> {
            s.player.buffer = this.ReverseBuffer.buffer;
        });

        // Retrigger any active voices //
        this.RetriggerActiveVoices();

        // Update visuals //
        App.AnimationsLayer.RemoveFromList(this);
        this.WaveForm = App.Audio.Waveform.GetWaveformFromBuffer(this.ReverseBuffer.buffer, 200, 5, 95);
        this.RefreshOptionsPanel();
    }


    Dispose(){
        super.Dispose();

        this.Sources.forEach((s: Tone.Simpler) => {
            s.dispose();
        });

        this.Envelopes.forEach((e: Tone.AmplitudeEnvelope) => {
            e.dispose();
        });
    }
}
