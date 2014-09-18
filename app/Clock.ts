
class Clock {

    public Ctx: CanvasRenderingContext2D;
    private _Hours: number;

    /**
     * @param {CanvasRenderingContext2D} Canvas rendering context to draw to
     * @param {Number} Number of hours ahead/behind UTC
     */
    constructor(hours: number = 0) {
        this._Hours = hours;
    }

    GetTime(): DateTime{
        return DateTime.Now.ToUniversalTime().AddHours(this._Hours);
    }

    Draw(){
        var now = this.GetTime();
        this.Ctx.save();
        this.Ctx.clearRect(0,0,150,150);
        this.Ctx.translate(75,75);
        this.Ctx.scale(0.4,0.4);
        this.Ctx.rotate(-Math.PI/2);
        this.Ctx.strokeStyle = "black";
        this.Ctx.fillStyle = "white";
        this.Ctx.lineWidth = 8;
        this.Ctx.lineCap = "round";

        // Hour marks
        this.Ctx.save();
        for (var i=0;i<12;i++){
            this.Ctx.beginPath();
            this.Ctx.rotate(Math.PI/6);
            this.Ctx.moveTo(100,0);
            this.Ctx.lineTo(120,0);
            this.Ctx.stroke();
        }
        this.Ctx.restore();

        // Minute marks
        this.Ctx.save();
        this.Ctx.lineWidth = 5;
        for (i=0;i<60;i++){
            if (i%5!=0) {
                this.Ctx.beginPath();
                this.Ctx.moveTo(117,0);
                this.Ctx.lineTo(120,0);
                this.Ctx.stroke();
            }
            this.Ctx.rotate(Math.PI/30);
        }
        this.Ctx.restore();

        var sec = now.Second;
        var min = now.Minute;
        var hr  = now.Hour;

        hr = hr>=12 ? hr-12 : hr;

        this.Ctx.fillStyle = "black";

        // write Hours
        this.Ctx.save();
        this.Ctx.rotate( hr*(Math.PI/6) + (Math.PI/360)*min + (Math.PI/21600)*sec )
        this.Ctx.lineWidth = 14;
        this.Ctx.beginPath();
        this.Ctx.moveTo(-20,0);
        this.Ctx.lineTo(80,0);
        this.Ctx.stroke();
        this.Ctx.restore();

        // write Minutes
        this.Ctx.save();
        this.Ctx.rotate( (Math.PI/30)*min + (Math.PI/1800)*sec )
        this.Ctx.lineWidth = 10;
        this.Ctx.beginPath();
        this.Ctx.moveTo(-28,0);
        this.Ctx.lineTo(112,0);
        this.Ctx.stroke();
        this.Ctx.restore();

        // Write seconds
        this.Ctx.save();
        this.Ctx.rotate(sec * Math.PI/30);
        this.Ctx.strokeStyle = "#D40000";
        this.Ctx.fillStyle = "#D40000";
        this.Ctx.lineWidth = 6;
        this.Ctx.beginPath();
        this.Ctx.moveTo(-30,0);
        this.Ctx.lineTo(83,0);
        this.Ctx.stroke();
        this.Ctx.beginPath();
        this.Ctx.arc(0,0,10,0,Math.PI*2,true);
        this.Ctx.fill();
        this.Ctx.beginPath();
        this.Ctx.arc(95,0,10,0,Math.PI*2,true);
        this.Ctx.stroke();
        this.Ctx.fillStyle = "rgba(0,0,0,0)";
        this.Ctx.arc(0,0,3,0,Math.PI*2,true);
        this.Ctx.fill();
        this.Ctx.restore();

        this.Ctx.beginPath();
        this.Ctx.lineWidth = 14;
        this.Ctx.strokeStyle = '#325FA2';
        this.Ctx.arc(0,0,142,0,Math.PI*2,true);
        this.Ctx.stroke();

        this.Ctx.restore();
    }
}

export = Clock;