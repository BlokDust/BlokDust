/**
 * Created by luketwyman on 17/03/2015.
 */

import BlocksSketch = require("./BlocksSketch");
import ParticleEmitter = require("./Blocks/Power/ParticleEmitter");
import Laser = require("./Blocks/Power/Laser");
import Logic = require("./Blocks/Power/Logic/Logic");
import Source = require("./Blocks/Source");
import IEffect = require("./Blocks/IEffect");
import ISource = require("./Blocks/ISource");
import IBlock = require("./Blocks/IBlock");

class LaserBeams {

    private _Ctx: CanvasRenderingContext2D;
    private _Sketch: BlocksSketch;
    public UpdateAllLasers: boolean;
    //private _TestPoints: Point[];

    Init(sketch: BlocksSketch): void {

        this._Ctx = sketch.Ctx;
        this._Sketch = sketch;
        this.UpdateAllLasers = false;
        //this._TestPoints = [];

    }

    Update() {
        //console.log("BEAMS");
        this.UpdateCollisions();
    }

    QuadPartition(p1,p2,angle) {

        var margin = this._Sketch.ScaledCellWidth.width*1.7;
        var laser = p1;
        var target = p2;

        if (angle<0 && angle > -180 && target.y > (laser.y + margin)) { // NOT TOP
            return false;
        }
        if ((angle>0 || angle < -180) && target.y < (laser.y - margin)) { // NOT BOTTOM
            return false;
        }
        if (angle<=-90 && target.x > (laser.x + margin)) { // NOT LEFT
            return false;
        }
        if (angle>-90 && target.x < (laser.x - margin)) { // NOT LEFT
            return false;
        }
        return true;
    }

    PointFromLine(x, y, x0, y0, x1, y1, o) {
        function lineLength(x, y, x0, y0){
            return Math.sqrt((x -= x0) * x + (y -= y0) * y);
        }
        if(o && !(o = function(x, y, x0, y0, x1, y1){
                if(!(x1 - x0)) return {x: x0, y: y};
                else if(!(y1 - y0)) return {x: x, y: y0};
                var left, tg = -1 / ((y1 - y0) / (x1 - x0));
                return {x: left = (x1 * (x * tg - y + y0) + x0 * (x * - tg + y - y1)) / (tg * (x1 - x0) + y0 - y1), y: tg * left - tg * x + y};
            }(x, y, x0, y0, x1, y1), o.x >= Math.min(x0, x1) && o.x <= Math.max(x0, x1) && o.y >= Math.min(y0, y1) && o.y <= Math.max(y0, y1))){
            var l1 = lineLength(x, y, x0, y0), l2 = lineLength(x, y, x1, y1);
            return l1 > l2 ? l2 : l1;
        }
        else {
            var a = y0 - y1, b = x1 - x0, c = x0 * y1 - y0 * x1;
            return Math.abs(a * x + b * y + c) / Math.sqrt(a * a + b * b);
        }
    }

    PointFromPoint(x, y, x0, y0){
        return Math.sqrt((x -= x0) * x + (y -= y0) * y);
    }

    UpdateCollisions() {
        var p1,p2,vector,line,outline;
        var rectSize = 1.7; // size of rectangle for rough check (in grid cells)
        var grd = this._Sketch.ScaledCellWidth.width * rectSize;

        // LOOK FOR LASERS //
        for (var i = 0; i < App.Blocks.length; i++){
            var laser: ISource = App.Blocks[i];
            if (laser instanceof Laser) {

                // gets set to true when blocks are moved
                if (this.UpdateAllLasers) {
                    laser.UpdateCollision = true;
                }

                // if this blocks collisions should be updated
                if (laser.UpdateCollision) {
                    laser.UpdateCollision = false;
                    var collisions = [];

                    // If we're in self powered mode, or if this is powered
                    if (laser.Params.selfPoweredMode || laser.IsPowered()) {


                        vector = Vector.MultN(Vector.FromAngle(Math.degreesToRadians(laser.Params.angle)), this._Sketch.ScaledUnit.width);
                        line = Vector.MultN(vector, laser.Params.range);

                        // FOR EACH LASER LOOK FOR SOURCE COLLISIONS //
                        for (var j = 0; j < App.Blocks.length; j++) {
                            var block:any = App.Blocks[j];
                            if (block !== laser && (block instanceof Source || block instanceof Logic)) {

                                outline = [];
                                p1 = this._Sketch.ConvertBaseToTransformed(this._Sketch.ConvertGridUnitsToAbsolute(laser.Position));
                                p2 = this._Sketch.ConvertBaseToTransformed(this._Sketch.ConvertGridUnitsToAbsolute(block.Position));

                                // IF IN RANGE //
                                if (this.PointFromPoint(p1.x, p1.y, p2.x, p2.y) < ((laser.Params.range * this._Sketch.ScaledUnit.width) + grd)) {

                                    // IF IN QUADRANT //
                                    if (this.QuadPartition(p1, p2, laser.Params.angle)) {

                                        //IF CLOSE TO LINE //
                                        if (this.PointFromLine(p2.x, p2.y, p1.x, p1.y, p1.x + line.X, p1.y + line.Y, false) < grd) {

                                            // INTERSECT CHECK //
                                            for (var k = 0; k < block.Outline.length; k++) {
                                                outline.push(this._Sketch.ConvertBaseToTransformed(this._Sketch.ConvertGridUnitsToAbsolute(this._Sketch.GetRelativePoint(block.Outline[k], block.Position))));
                                            }
                                            p2 = new Point(p1.x + line.X, p1.y + line.Y);
                                            if (Intersection.intersectLinePolygon(p1, p2, outline).status == "Intersection") {

                                                collisions.push(block);
                                                if (laser.Collisions.length==0 || $.inArray(block, laser.Collisions)==-1) {
                                                    console.log("HIT "+ block.Id);
                                                    if (block instanceof Logic) {
                                                        block.PerformLogic();
                                                    } else {
                                                        //block.LaserPowered = true;
                                                        if (!block.IsPowered()) {
                                                            block.TriggerAttack();
                                                        }
                                                        block.PowerConnections += 1;

                                                    }

                                                }
                                            }

                                        } // end line

                                    } // end quad

                                } // end range

                            } // end if right block

                        }// end block loop

                    } // end if powered

                    // FOR EACH COLLISION CHECK RELEASE //
                    for (var j = 0; j < laser.Collisions.length; j++) {
                        var block = laser.Collisions[j];
                        if (collisions.length==0 || $.inArray(block, collisions)==-1) {
                            console.log("RELEASE "+ block.Id);
                            //laser.Collisions[j].LaserPowered = false;
                            if (!(block instanceof Logic)) {
                                block.PowerConnections -= 1;
                                block.TriggerRelease();
                            }
                        }

                    }
                    //console.log(collisions);
                    // UPDATE COLLISIONS ARRAY
                    laser.Collisions = collisions;

                } // end if collisions don't need updating for this block

            } // end if laser

        }// end laser loop

        this.UpdateAllLasers = false;
    }





    Draw() {
        var unit = this._Sketch.ScaledUnit.width;
        var myPos,vector;
        this._Ctx.strokeStyle = this._Ctx.fillStyle = "#fff";
        this._Ctx.globalAlpha = 1;

        this._Ctx.lineWidth = (unit*2) * (0.8 + (Math.random()*0.5));
        this._Ctx.beginPath();

        for (var j=0; j<App.Blocks.length; j++) {
            var laser: ISource  = App.Blocks[j];
            if (laser instanceof Laser) {

                // If we're in self powered mode, or if this is powered
                if (laser.Params.selfPoweredMode || laser.IsPowered()) {

                    myPos = this._Sketch.ConvertGridUnitsToAbsolute(laser.Position);
                    myPos = this._Sketch.ConvertBaseToTransformed(myPos);

                    vector = Vector.FromAngle(Math.degreesToRadians(laser.Params.angle));
                    vector.Mult(laser.Params.range * unit);

                    this._Ctx.moveTo(myPos.x, myPos.y);
                    this._Ctx.lineTo(myPos.x + vector.X, myPos.y + vector.Y);
                }
            }
        }
        this._Ctx.stroke();
        this._Ctx.lineWidth = 1;

        // TEST //
        /*this._Ctx.beginPath();
        this._Ctx.moveTo(0,0);
        for (var i=0; i<this._TestPoints.length; i++) {
            //this._Ctx.fillRect(this._TestPoints[i].x - (30*unit),this._TestPoints[i].y - (30*unit),60*unit,60*unit);
            this._Ctx.lineTo(this._TestPoints[i].x,this._TestPoints[i].y);
        }
        this._Ctx.stroke();*/
    }

}

export = LaserBeams;