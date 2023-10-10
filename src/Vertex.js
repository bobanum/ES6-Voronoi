import Point from './Point.js';
export default class Vertex extends Point {
	static junkyard = [];
	constructor(x = 0, y = 0) {
		super(x, y);
	}
	static create(x, y) {
		var v = this.junkyard.pop();
		if (!v) {
			v = new Vertex(x, y);
		} else {
			v.moveTo(x, y);
		}
		return v;
	}

}

