export default class Point {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	moveTo(x, y) {
		this.x = x;
		this.y = y;
	}
	norm() {
		return Math.sqrt(this.x ** 2 + this.y ** 2);
	}
	norm2() {
		return this.x ** 2 + this.y ** 2;
	}
	determinant(p) {
		return this.x * p.y - this.y * p.x;
	}
	dot(p) {
		return this.x * p.x + this.y * p.y;
	}
	clone() {
		return new Point(this.x, this.y);
	}
	diff(p) {
		return new Point(this.x - p.x, this.y - p.y);
	}
	sum(p) {
		return new Point(this.x + p.x, this.y + p.y);
	}
}