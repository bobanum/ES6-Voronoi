export default class Edge {
	static junkyard = [];
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
		// ---------------------------------------------------------------------------
	// Diagram completion methods
	
	// connect dangling edges (not if a cursory test tells us
	// it is not going to be visible.
	// return value:
	//   false: the dangling endpoint couldn't be connected
	//   true: the dangling endpoint could be connected
	connectEdge(edge, bbox) {
		// skip if end point already connected
		var vb = edge.vb;
		if (!!vb) {
			return true;
		}
		
		// make local copy for performance purpose
		var va = edge.va;
		var { left, right, top, bottom } = bbox;
		var lSite = edge.lSite;
		var rSite = edge.rSite;
		var lx = lSite.x;
		var ly = lSite.y;
		var rx = rSite.x;
		var ry = rSite.y;
		var f = edge.middlePoint();
		var fm, fb;
		
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		///////////////////////////////////////////////////////////////////////////////
		// if we reach here, this means cells which use this edge will need
		// to be closed, whether because the edge was removed, or because it
		// was connected to the bounding box.
		this.cells[lSite.voronoiId].closeMe = true;
		this.cells[rSite.voronoiId].closeMe = true;

		// get the line equation of the bisector if line is not vertical
		if (!edge.isBisectorVertical()) {
			({slope: fm, yIntercept: fb} = edge.bisector());
		}

		// remember, direction of line (relative to left site):
		// upward: left.x < right.x
		// downward: left.x > right.x
		// horizontal: left.x == right.x
		// upward: left.x < right.x
		// rightward: left.y < right.y
		// leftward: left.y > right.y
		// vertical: left.y == right.y

		// depending on the direction, find the best side of the
		// bounding box to use to determine a reasonable start point

		// rhill 2013-12-02:
		// While at it, since we have the values which define the line,
		// clip the end of va if it is outside the bbox.
		// https://github.com/gorhill/Javascript-Voronoi/issues/15
		// TODO: Do all the clipping here rather than rely on Liang-Barsky
		// which does not do well sometimes due to loss of arithmetic
		// precision. The code here doesn't degrade if one of the vertex is
		// at a huge distance.

		// special case: vertical line
		if (fm === undefined) {
			// doesn't intersect with viewport
			if (f.x < left || f.x >= right) {
				return false;
			}
			if (edge.isDownward()) {
				// downward
				if (!va || va.y < top) {
					va = this.createVertex(f.x, top);
				} else if (va.y >= bottom) {
					return false;
				}
				vb = this.createVertex(f.x, bottom);
			} else {
			// upward
				if (!va || va.y > bottom) {
					va = this.createVertex(f.x, bottom);
				} else if (va.y < top) {
					return false;
				}
				vb = this.createVertex(f.x, top);
			}
		}
		// closer to vertical than horizontal, connect start point to the
		// top or bottom side of the bounding box
		else if (fm < -1 || fm > 1) {
			// downward
			if (lx > rx) {
				if (!va || va.y < top) {
					va = this.createVertex((top - fb) / fm, top);
				} else if (va.y >= bottom) {
					return false;
				}
				vb = this.createVertex((bottom - fb) / fm, bottom);
			}
			// upward
			else {
				if (!va || va.y > bottom) {
					va = this.createVertex((bottom - fb) / fm, bottom);
				} else if (va.y < top) {
					return false;
				}
				vb = this.createVertex((top - fb) / fm, top);
			}
		}
		// closer to horizontal than vertical, connect start point to the
		// left or right side of the bounding box
		else {
			// rightward
			if (ly < ry) {
				if (!va || va.x < left) {
					va = this.createVertex(left, fm * left + fb);
				} else if (va.x >= right) {
					return false;
				}
				vb = this.createVertex(right, fm * right + fb);
			}
			// leftward
			else {
				if (!va || va.x > right) {
					va = this.createVertex(right, fm * right + fb);
				} else if (va.x < left) {
					return false;
				}
				vb = this.createVertex(left, fm * left + fb);
			}
		}
		edge.va = va;
		edge.vb = vb;

		return true;
	}
	static create(left, right, va, vb) {
		left = left.site || left;
		right = right.site || right;
		var edge = this.junkyard.pop();
		if (!edge) {
			edge = new this(left, right);
		} else {
			edge.setSites(left, right);
			edge.setVertices(va, vb);
		}

		if (va) {
			edge.setStartPoint(left, right, va);
		}
		if (vb) {
			edge.setEndPoint(left, right, vb);
		}

		return edge;
	}

}
