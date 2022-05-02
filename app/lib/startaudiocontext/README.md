StartAudioContext starts the Web Audio API's AudioContext on an explicit user action. 

According to the [Apple's documentation](https://developer.apple.com/library/safari/documentation/AudioVideo/Conceptual/Using_HTML5_Audio_Video/PlayingandSynthesizingSounds/PlayingandSynthesizingSounds.html): 
> On iOS, the Web Audio API requires sounds to be triggered from an explicit user action, such as a tap. Calling noteOn() from an onload event will not play sound.

StartAudioContext listens for the first non-dragged `touchend` or `mouseup` event on any of the given elements, then triggers a silent Oscillator which will start the AudioContext if it isn't already started.

## Installation

Choose one:

* [download the js](https://raw.githubusercontent.com/tambien/StartAudioContext/master/StartAudioContext.js)
* `npm install startaudiocontext`
* `bower install startaudiocontext`

## Basic

```javascript
//pass in the audio context
var context = new AudioContext();
StartAudioContext.setContext(context);

//the context will be started on the first valid user action
StartAudioContext.on("#playButton");

//you can bind as many elements as you want
var buttons = document.querySelectorAll("button");
StartAudioContext.on(buttons);
```

When the AudioContext is running `StartAudioContext.isStarted()` will return `true`.

## API

The `on` method can accept an Element, Selector String, NodeList, jQuery Element or an Array of any of those.

### `.on({Element})`

Bind the tap listener to the given HTML Element. 

```javascript
var el = document.createElement("div");
StartAudioContext.on(el);
```
### `.on({String})`

Pass in a query selector to bind to all of the matching HTML Elements

```javascript
StartAudioContext.on("button");
```

### `.on({NodeList})`

Pass in the NodeList returned by `querySelectorAll`. 

```javascript
var allButtons = document.querySelectorAll("button");
StartAudioContext.on(allButtons);
```

### `.on({jQuery})`

You can pass in a jQuery element. 

```javascript
StartAudioContext.on($("button"));
```

### `.on({Array})`

You can pass in an Array combining any of the above. Make sure you're array is not self-referential, or it'll go into an infinite, recursive loop. 

```javascript
StartAudioContext.on([el, $("button"), ".className"]);
```

### `.setContext({AudioContext})`

Set the AudioContext. When the context is set, a valid event will trigger a silent Oscillator node and start the AudioContext. 

```javascript
var audioContext = new AudioContext();
StartAudioContext.setContext(audioContext);
```

### `.isStarted()`

Returns `true` if the given AudioContext is running. See [`AudioContext.state`](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/state).

```javascript
StartAudioContext.isStarted();
```

### `.onStarted({Function})`

Callback when the passed in AudioContext is started. If the context is already started, this callback will be invoked immediately.

```javascript
StartAudioContext.onStarted(function(){
	//ready to go!
});
```

## MIT License

Copyright 2016 Yotam Mann