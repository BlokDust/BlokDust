import Effect = require("./../Effect");
import IEffect = require("./../IEffect");
import AudioChain = require("../../Core/Audio/Connections/AudioChain");

interface IPreEffect extends IEffect {
    Chain: AudioChain;
    UpdateConnections(chain: AudioChain): void;
}

export = IPreEffect;