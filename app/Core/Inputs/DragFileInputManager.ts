import InputManager = require("./InputManager");

class DragFileInputManager extends InputManager {

    constructor() {
        super();
        this.SetDragDropListeners();

    }

    SetDragDropListeners(){
        var dropZone = document.getElementsByTagName('canvas')[0];
        dropZone.addEventListener('dragenter', this.HandleDragEnter, false);
        dropZone.addEventListener('dragover', this.HandleDragOver, false);
        dropZone.addEventListener('dragleave', this.HandleDragLeave, false);
        dropZone.addEventListener('drop', this.HandleFileDropped.bind(this), false);
    }

    HandleFileDropped(e) {
        e.stopPropagation();
        e.preventDefault();
        var files = e.dataTransfer.files; // FileList object.

        //TODO: open new sampler block and DecodeFileData(files)
        //this.DecodeFileData(files);
        console.log(files[0].name + ' dropped');
    }

    HandleDragEnter(e) {
        console.log('file drag entered area');
    }

    HandleDragOver(e) {
        e.stopPropagation();
        e.preventDefault();
        console.log('file drag over');
    }

    HandleDragLeave(e) {
        console.log('file left drag area');
    }
}

export = DragFileInputManager;