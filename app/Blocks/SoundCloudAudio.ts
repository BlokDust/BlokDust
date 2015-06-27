import IBlock = require('./IBlock');
import Soundcloud = require('./Sources/Soundcloud');
import Granular = require('./Sources/Granular');
import Effect = require('./Effect');


class SoundCloudAudio {

    public TrackID: string;
    //public Type: IBlock;

    constructor(blockType){
        //this.Type = blockType;
        this.PickRandomTrack(blockType)
    }

    get TrackURL(): string {
        return 'https://api.soundcloud.com/tracks/'+ this.TrackID +'/stream?client_id='+ App.Config.SoundCloudClientId;
    }

    PickRandomTrack(B:IBlock) {

        //if (B instanceof Soundcloud) { //TODO: MAKE THIS WORK
        //    var defaults = App.Config.SoundCloudDefaultTracks;
        //} else if (B instanceof Granular){
            var defaults = App.Config.GranularDefaultTracks;
        //} else if (B instanceof Effect) {
        //    var defaults = App.Config.ConvolverDefaultTracks;
        //}

        this.TrackID = defaults[Math.floor((Math.random() * defaults.length))];

    }
}

export = SoundCloudAudio;

//https://api.soundcloud.com/tracks/43883752/stream?client_id=7258ff07f16ddd167b55b8f9b9a3ed33