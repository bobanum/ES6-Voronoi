import Point from "./Point.js";

export default class Site extends Point {
	constructor(x, y) {
		super(x, y);
		this.voronoiId = null;
	}
}