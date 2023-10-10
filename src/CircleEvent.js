import Point from './Point.js';
import RBNode from './RBNode.js';
export default class CircleEvent extends RBNode {
	static junkyard = [];
	constructor(arc, x, ycenter, y) {
		super();
		this.arc = arc;
		this.site = null;
		this._pt = new Point(x, y);
		this.ycenter = ycenter;
	}
	get x() {
		return this._pt.x;
	}
	set x(val) {
		this._pt.x = val;
	}
	get y() {
		return this._pt.y;
	}
	set y(val) {
		this._pt.y = val;
	}
}
