import Cell from "./Cell.js";
import Point from "./Point.js";

export default class Site extends Point {
	constructor(x, y) {
		super(x, y);
		this.voronoiId = null;
		this.cell = new Cell(this);
	}
	addHalfEdge(edge, otherSite) {
		this.cell.addHalfEdge(edge, otherSite);
	}

}