import {IApp} from '../../IApp';
import {MainScene} from '../../MainScene';
import {Source} from '../Source';
import {ISketchContext} from '../../Core/Drawing/ISketchContext';

declare var App: IApp;

export class SamplerBase extends Source {

    Init(sketch: ISketchContext): void {
        super.Init(sketch);
        this.CreateSource();
    }

    CreateSource(){
        this.Sources.push( new Tone.Simpler() );
        this.Sources.forEach((s: Tone.Simpler, i: number)=> {
            s.player.loop = this.Params.loop;
            s.player.loopStart = this.Params.loopStart;
            s.player.loopEnd = this.Params.loopEnd;
            s.player.retrigger = this.Params.retrigger;
            s.player.reverse = this.Params.reverse;

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
                s.triggerAttack('+0', this.Params.startPosition, this.Params.endPosition - this.Params.startPosition);
            });
        } else {
            // Trigger the specific one
            this.Sources[index].triggerAttack('+0', this.Params.startPosition, this.Params.endPosition - this.Params.startPosition);
        }
    }

    TriggerAttackRelease(index: number|string = 0, duration: Tone.Time = App.Config.PulseLength) {
        if (index === 'all'){
            // Trigger all the envelopes
            this.Sources.forEach((s: any)=> {
                s.triggerAttackRelease(duration, '+0', this.Params.startPosition, this.Params.endPosition - this.Params.startPosition);
            });
        } else {
            // Trigger the specific one
            this.Sources[index].triggerAttackRelease(duration, '+0', this.Params.startPosition, this.Params.endPosition - this.Params.startPosition);
        }
    }

    /**
     * Trigger a Simpler's release
     * If no index is set release the first in the array
     * @param index number|string position of the Envelope in Envelopes[].
     * If index is set to 'all', all envelopes will be released
     */
    TriggerRelease(index: number|string = 0) {
        // Only if it's not powered
        if (!this.IsPowered()) {
            if (index === 'all'){
                // Trigger all the envelopes
                this.Sources.forEach((s: any)=> {
                    s.triggerRelease();
                });
            } else {
                // Trigger the specific one
                this.Sources[index].triggerRelease();
            }
        }
    }

    MouseUp() {
        this.FirstSetup();
        super.MouseUp();
    }

    FirstSetup() {

    }


    Dispose(){
        super.Dispose();

        this.Sources.forEach((s: Tone.Simpler) => {
            s.dispose();
        });

        this.Envelopes.forEach((e: Tone.Envelope) => {
            e.dispose();
        });
    }
}
