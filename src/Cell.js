import HalfEdge from "./HalfEdge.js";

export default class Cell {
	static junkyard = [];	
	constructor(site) {
		this.site = site;
		this.halfEdges = [];
		this.closeMe = false;
	}
	init(site) {
		this.site = site;
		this.halfEdges = [];
		this.closeMe = false;
		return this;
	}
	addHalfEdge(edge, left, right) {
		this.halfEdges.push(new HalfEdge(edge, left, right));
	}

	prepareHalfEdges() {
		var halfEdges = this.halfEdges,
			iHalfEdge = halfEdges.length,
			edge;
		// get rid of unused halfEdges
		// rhill 2011-05-27: Keep it simple, no point here in trying
		// to be fancy: dangling edges are a typically a minority.
		while (iHalfEdge--) {
			edge = halfEdges[iHalfEdge].edge;
			if (!edge.vb || !edge.va) {
				halfEdges.splice(iHalfEdge, 1);
			}
		}

		// rhill 2011-05-26: I tried to use a binary search at insertion
		// time to keep the array sorted on-the-fly (in Cell.addHalfEdge()).
		// There was no real benefits in doing so, performance on
		// Firefox 3.6 was improved marginally, while performance on
		// Opera 11 was penalized marginally.
		halfEdges.sort(function (a, b) { return b.angle - a.angle; });
		return halfEdges.length;
	};

	// Return a list of the neighbor Ids
	getNeighborIds() {
		var neighbors = [],
			iHalfEdge = this.halfEdges.length,
			edge;
		while (iHalfEdge--) {
			edge = this.halfEdges[iHalfEdge].edge;
			if (edge.lSite !== null && edge.lSite.voronoiId != this.site.voronoiId) {
				neighbors.push(edge.lSite.voronoiId);
			}
			else if (edge.rSite !== null && edge.rSite.voronoiId != this.site.voronoiId) {
				neighbors.push(edge.rSite.voronoiId);
			}
		}
		return neighbors;
	};

	// Compute bounding box
	//
	getBbox() {
		var halfEdges = this.halfEdges,
			iHalfEdge = halfEdges.length,
			xmin = Infinity,
			ymin = Infinity,
			xmax = -Infinity,
			ymax = -Infinity,
			v, vx, vy;
		while (iHalfEdge--) {
			v = halfEdges[iHalfEdge].getStartpoint();
			vx = v.x;
			vy = v.y;
			if (vx < xmin) { xmin = vx; }
			if (vy < ymin) { ymin = vy; }
			if (vx > xmax) { xmax = vx; }
			if (vy > ymax) { ymax = vy; }
			// we dont need to take into account end point,
			// since each end point matches a start point
		}
		return {
			x: xmin,
			y: ymin,
			width: xmax - xmin,
			height: ymax - ymin
		};
	};

	// Return whether a point is inside, on, or outside the cell:
	//   -1: point is outside the perimeter of the cell
	//    0: point is on the perimeter of the cell
	//    1: point is inside the perimeter of the cell
	//
	pointIntersection(x, y) {
		// Check if point in polygon. Since all polygons of a Voronoi
		// diagram are convex, then:
		// http://paulbourke.net/geometry/polygonmesh/
		// Solution 3 (2D):
		//   "If the polygon is convex then one can consider the polygon
		//   "as a 'path' from the first vertex. A point is on the interior
		//   "of this polygons if it is always on the same side of all the
		//   "line segments making up the path. ...
		//   "(y - y0) (x1 - x0) - (x - x0) (y1 - y0)
		//   "if it is less than 0 then P is to the right of the line segment,
		//   "if greater than 0 it is to the left, if equal to 0 then it lies
		//   "on the line segment"
		var halfEdges = this.halfEdges,
			iHalfEdge = halfEdges.length,
			halfEdge,
			p0, p1, r;
		while (iHalfEdge--) {
			halfEdge = halfEdges[iHalfEdge];
			p0 = halfEdge.getStartpoint();
			p1 = halfEdge.getEndpoint();
			r = (y - p0.y) * (p1.x - p0.x) - (x - p0.x) * (p1.y - p0.y);
			if (!r) {
				return 0;
			}
			if (r > 0) {
				return -1;
			}
		}
		return 1;
	};
	static create(site) {
		var cell = this.junkyard.pop();
		if (cell) {
			return cell.init(site);
		}
		return new Cell(site);
	}

}
