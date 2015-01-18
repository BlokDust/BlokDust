
class AudioSettings implements ToneSettings {

    Settings = {
        VolumeBlock: {
            Gain: {
                MinValue: -5,
                MaxValue: 5,
                CurrentValue: 0,
                Quantised: false,
                CentredOrigin: true
            }
        }
    }

}

export = AudioSettings;