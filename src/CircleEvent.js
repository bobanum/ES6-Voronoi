import Point from './Point.js';
export default class CircleEvent extends Point {
	constructor(arc, x, ycenter, y) {
		super(x, y);
		this.arc = arc;
		this.rbLeft = null;
		this.rbNext = null;
		this.rbParent = null;
		this.rbPrevious = null;
		this.rbRed = false;
		this.rbRight = null;
		this.site = null;
		this.ycenter = ycenter;
	}
}
