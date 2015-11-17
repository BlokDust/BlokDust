export class Waveform {

    GetWaveformFromBuffer(buffer: AudioBuffer, points: number, stepsPerPoint: number, normal: number) {

        console.log(buffer);
        console.log("minutes: "+ (buffer.duration/60));

        // defaults //
        stepsPerPoint = 10; // checks per division
        var leftOnly = false; // don't perform channel merge


        //TODO if too slow consider making asynchronous

        /*if (buffer.duration>240) { // 4 minutes
         stepsPerPoint = 6;
         //leftOnly = true;
         if (points > 180) {
         points = 180;
         }
         console.log("detail nerfed");
         }*/

        var newWaveform = [];
        var peak = 0.0;
        var normThreshold = 0.01;

        // MERGE LEFT & RIGHT CHANNELS //
        var left = buffer.getChannelData(0);
        if (buffer.numberOfChannels>1 && !leftOnly) {
            var right = buffer.getChannelData(1);
        }

        var slice = Math.ceil( left.length / points );
        var step = Math.ceil( slice / stepsPerPoint );

        // FOR EACH DETAIL POINT //
        for(var i=0; i<points; i++) {

            // AVERAGE PEAK BETWEEN POINTS //
            var max1 = 0.0;
            var max2 = 0.0;
            for (var j = 0; j < slice; j += step) {
                var datum = left[(i * slice) + j];
                if (datum < 0) { datum = -datum;}
                if (datum > max1) {max1 = datum;}
                if (right) {
                    var datum2 = right[(i * slice) + j];
                    if (datum2 < 0) { datum2 = -datum2;}
                    if (datum2 > max2) {max2 = datum2;}
                    if (max2 > max1) {max1 = max2;}
                }

            }
            if (max1 > peak) {peak = max1;} // set overall peak used for normalising
            newWaveform.push(max1);
        }

        // SOFT NORMALISE //
        if (peak > normThreshold) {
            var percent = normal/100; // normalisation strength
            var mult = (((1/peak) - 1)*percent) + 1;
            for (var i=0; i<newWaveform.length; i++) {
                newWaveform[i] = newWaveform[i] * mult;
            }
        }


        return newWaveform;
    }
}