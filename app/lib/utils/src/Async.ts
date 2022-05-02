module Utils {

    export class Async {
        static waitFor(test: () => boolean, successCallback: () => void, failureCallback?: () => void, interval?: number, maxTries?: number, numTries?: number) {
            if (!interval) interval = 200;
            if (!maxTries) maxTries = 100; // try 100 times over 20 seconds
            if (!numTries) numTries = 0;

            numTries += 1;

            if (numTries > maxTries){
                if (failureCallback) failureCallback();
            } else if (test()){
                successCallback();
            } else {
                setTimeout(function(){
                    Async.waitFor(test, successCallback, failureCallback, interval, maxTries, numTries);
                }, interval);
            }
        }
    }
}