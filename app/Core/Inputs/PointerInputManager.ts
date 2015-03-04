import App = require("../../App");
import InputManager = require("./InputManager");
import Commands = require("../../Commands");
import CommandManager = require("../Commands/CommandManager");

class MouseInputManager extends InputManager {

    MouseDown = new nullstone.Event<MouseEvent>();
    MouseUp = new nullstone.Event<MouseEvent>();
    MouseMove = new nullstone.Event<MouseEvent>();

    constructor() {
        super();

        // https://typescript.codeplex.com/discussions/403082

        this.OnMouseDown = this.OnMouseDown.bind(this);
        document.addEventListener('mousedown', this.OnMouseDown);

        this.OnMouseUp = this.OnMouseUp.bind(this);
        document.addEventListener('mouseup', this.OnMouseUp);

        this.OnMouseMove = this.OnMouseMove.bind(this);
        document.addEventListener('mousemove', this.OnMouseMove);
    }

    OnMouseDown(e: MouseEvent){
        var position: Point = new Point(e.clientX, e.clientY);
        console.log(new Date().getTime(), "mousedown", position);
        this.MouseDown.raise(this, e);
    }

    OnMouseUp(e: MouseEvent){
        var position: Point = new Point(e.clientX, e.clientY);
        console.log(new Date().getTime(), "mouseup", position);
        this.MouseUp.raise(this, e);
    }

    OnMouseMove(e: MouseEvent){
        var position: Point = new Point(e.clientX, e.clientY);
        console.log(new Date().getTime(), "mousemove", position);
        this.MouseMove.raise(this, e);
    }
}

export = MouseInputManager;