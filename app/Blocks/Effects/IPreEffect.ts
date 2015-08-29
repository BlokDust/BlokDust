import Effect = require("./../Effect");
import IEffect = require("./../IEffect");
import AudioChain = require("../../Core/Audio/ConnectionMethods/AudioChain");

interface IPreEffect extends IEffect {
    UpdateConnections(chain: AudioChain): void;
}

export = IPreEffect;