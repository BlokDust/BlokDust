import SoundCloudAudioType = require('./SoundCloudAudioType');

class SoundCloudAudio {


    static PickRandomTrack(t:SoundCloudAudioType) {

        switch (t) {
            case SoundCloudAudioType.Soundcloud:
                var defaults = App.Config.SoundCloudDefaultTracks;
                break;
            case SoundCloudAudioType.Granular:
                var defaults = App.Config.GranularDefaultTracks;
                break;
            case SoundCloudAudioType.Convolution:
                var defaults = App.Config.ConvolverDefaultTracks;
                break;
            default:
                var defaults = App.Config.SoundCloudDefaultTracks;
        }

        var track = defaults[Math.floor((Math.random() * defaults.length))];

        return 'https://api.soundcloud.com/tracks/'+ track +'/stream?client_id='+ App.Config.SoundCloudClientId;
    }

    static PickTrack(t:SoundCloudAudioType,n:number) {

        switch (t) {
            case SoundCloudAudioType.Soundcloud:
                var defaults = App.Config.SoundCloudDefaultTracks;
                break;
            case SoundCloudAudioType.Granular:
                var defaults = App.Config.GranularDefaultTracks;
                break;
            case SoundCloudAudioType.Convolution:
                var defaults = App.Config.ConvolverDefaultTracks;
                break;
            default:
                var defaults = App.Config.SoundCloudDefaultTracks;
        }

        var track = defaults[n];

        return 'https://api.soundcloud.com/tracks/'+ track +'/stream?client_id='+ App.Config.SoundCloudClientId;
    }
}

export = SoundCloudAudio;

//https://api.soundcloud.com/tracks/43883752/stream?client_id=7258ff07f16ddd167b55b8f9b9a3ed33