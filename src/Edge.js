export default class Edge {
	constructor(left, right) {
		this.left = left;
		this.right = right;
		this.va = null;
		this.vb = null;
	}
	get lSite() {
		console.log("get lSite");
		return this.left;
	}
	set lSite(val) {
		console.log("set lSite");
		this.left = val;
	}
	get rSite() {
		console.log("get rSite");
		return this.right;
	}
	set rSite(val) {
		console.log("set rSite");
		this.right = val;
	}
	setSites(left, right) {
		this.lSite = left;
		this.rSite = right;
	}
	setVertices(va, vb) {
		this.va = va;
		this.vb = vb;
	}
	setStartPoint(left, right, vertex) {
		if (!this.va && !this.vb) {
			this.va = vertex;
			this.setSites(left, right);
		} else if (this.lSite === right) {
			this.vb = vertex;
		} else {
			this.va = vertex;
		}
	}
	setEndPoint(left, right, vertex) {
		this.setStartPoint(right, left, vertex);
	}
	middlePoint() {
		return {
			x: (this.left.x + this.right.x) / 2,
			y: (this.left.y + this.right.y) / 2
		};
	}
	isBisectorVertical() {
		return this.left.y === this.right.y;
	}
	isBisectorHorizontal() {
		return this.left.x === this.right.x;
	}
	bisector() {
		var f = this.middlePoint();
		var slope = (this.left.x - this.right.x) / (this.right.y - this.left.y);
		var yIntercept = f.y - slope * f.x;
		return { slope, yIntercept };
	}
	isUpward() {
		return this.left.x < this.right.x;
	}
	isDownward() {
		return this.left.x > this.right.x;
	}
}
