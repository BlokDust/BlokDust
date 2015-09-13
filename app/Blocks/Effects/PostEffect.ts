import Effect = require("./../Effect");


class PostEffect extends Effect {

    connect = Tone.prototype.connect;
    disconnect = Tone.prototype.disconnect;

}

export = PostEffect;