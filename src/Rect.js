import Point from "./Point.js";

export default class Rect {
	constructor(x, y, w, h) {
		if (arguments.length === 2) {
			this.x = 0;
			this.y = 0;
			this.w = x;
			this.h = y;
		} else {
			this.x = x;
			this.y = y;
			this.w = w;
			this.h = h;
		}
	}
	get left() {
		return this.x;
	}
	set left(val) {
		this.x = val;
	}
	get top() {
		return this.y;
	}
	set top(val) {
		this.y = val;
	}
	get right() {
		return this.x + this.w;
	}
	set right(val) {
		this.w = val - this.x;
	}
	get bottom() {
		return this.y + this.h;
	}
	set bottom(val) {
		this.h = val - this.y;
	}
	get width() {
		return this.w;
	}
	set width(val) {
		this.w = val;
	}
	get height() {
		return this.h;
	}
	set height(val) {
		this.h = val;
	}
	get centerX() {
		return this.x + this.w / 2;
	}
	get centerY() {
		return this.y + this.h / 2;
	}
	get center() {
		return new Point(this.centerX, this.centerY);
	}
	get area() {
		return this.w * this.h;
	}
	get xl() {
		return this.x;
	}
	get xr() {
		return this.x + this.w;
	}
	get yt() {
		return this.y;
	}
	get yb() {
		return this.y + this.h;
	}
}