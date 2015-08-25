import Effect = require("./../Effect");


class PostEffect extends Effect {

    connect = Tone.prototype.connect;
    //
    disconnect = Tone.prototype.disconnect;

    //connect(unit, outputNum, inputNum){
    //    console.log('post effect connect');
    //    if (Array.isArray(this.output)){
    //        outputNum = this.defaultArg(outputNum, 0);
    //        this.output[outputNum].connect(unit, 0, inputNum);
    //    } else if (this instanceof PostEffect) {
    //        this.Effect.output.connect(unit, outputNum, inputNum)
    //    } else {
    //        this.output.connect(unit, outputNum, inputNum);
    //    }
    //    return this;
    //}
    //
    //disconnect(outputNum) {
    //    if (Array.isArray(this.output)){
    //        outputNum = this.defaultArg(outputNum, 0);
    //        this.output[outputNum].disconnect();
    //    } else if (this instanceof PostEffect) {
    //        this.Effect.output.disconnect()
    //    } else {
    //        this.output.disconnect();
    //    }
    //    return this;
    //}

}

export = PostEffect;