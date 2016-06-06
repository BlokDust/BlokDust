onmessage = function(e) {
    console.log('Message received from main script');
    var channels = [];
    for (var i=0; i< e.data.channels.length; i++) {
        channels.push(ReverseArray(e.data.channels[i]));
    }

    console.log('Posting message back to main script');
    postMessage({
        "blockId": e.data.blockId,
        "buffer": channels
    });
}

function ReverseArray(a) {
    var array = new Float32Array(a.length);
    for (var i=0; i<a.length; i++) {
        array[i] = a[(a.length-1)-i];
    }
    return array;
}
