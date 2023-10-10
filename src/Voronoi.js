import Vertex from './Vertex.js';
import Edge from './Edge.js';
import HalfEdge from './HalfEdge.js';
import BeachLine from './BeachLine.js';
import Cell from './Cell.js';
import CircleEvent from './CircleEvent.js';
import Diagram from './Diagram.js';
import BeachSection from './BeachSection.js';
import RBTree from './RBTree.js';
import Point from './Point.js';
import Rect from './Rect.js';

export default class Voronoi {
	constructor() {
		this.vertices = null;
		this.edges = null;
		this.cells = null;
		this.toRecycle = null;
		this.beachSectionJunkyard = [];
		this.circleEventJunkyard = [];
		this.firstCircleEvent = null;
		this.vertexJunkyard = [];
		this.edgeJunkyard = [];
		this.cellJunkyard = [];
	}
	reset() {
		if (!this.beachline) {
			this.beachline = new BeachLine();
		}
		// Move leftover beachSections to the beachSection junkyard.
		if (this.beachline.root) {
			var beachSection = this.beachline.root.getFirst();
			while (beachSection) {
				this.beachSectionJunkyard.push(beachSection); // mark for reuse
				beachSection = beachSection.next;
			}
		}
		this.beachline.root = null;
		if (!this.circleEvents) {
			this.circleEvents = new RBTree();
		}
		this.circleEvents.root = this.firstCircleEvent = null;
		this.vertices = [];
		this.edges = [];
		this.cells = [];
	}

	sqrt = Math.sqrt;
	abs = Math.abs;
	ε = Voronoi.ε = 1e-9;
	invε = Voronoi.invε = 1.0 / Voronoi.ε;
	equalWithEpsilon = (a, b = 0) => this.abs(a - b) < Voronoi.ε;
	greaterThanEpsilon = (a, b = 0) => a - b > Voronoi.ε;
	greaterThanOrEqualWithEpsilon = (a, b = 0) => b - a < Voronoi.ε;
	lessThanEpsilon = (a, b = 0) => b - a > Voronoi.ε;
	lessThanOrEqualWithEpsilon = (a, b = 0) => a - b < Voronoi.ε;

	createCell(site) {
		var cell = this.cellJunkyard.pop();
		if (cell) {
			return cell.init(site);
		}
		return new Cell(site);
	}
	createHalfedge(edge, lSite, rSite) {
		return new HalfEdge(edge, lSite, rSite);
	}
	createVertex(x, y) {
		var v = this.vertexJunkyard.pop();
		if (!v) {
			v = new Vertex(x, y);
		} else {
			v.moveTo(x, y);
		}
		this.vertices.push(v);
		return v;
	}
	createEdge(left, right, va, vb) {
		left = left.site || left;
		right = right.site || right;
		var edge = this.edgeJunkyard.pop();
		if (!edge) {
			edge = new Edge(left, right);
		} else {
			edge.setSites(left, right);
			edge.setVertices(va, vb);
		}

		this.edges.push(edge);
		if (va) {
			edge.setStartPoint(left, right, va);
		}
		if (vb) {
			edge.setEndPoint(left, right, vb);
		}

		this.cells[left.voronoiId].halfedges.push(this.createHalfedge(edge, left, right));
		this.cells[right.voronoiId].halfedges.push(this.createHalfedge(edge, right, left));
		return edge;
	}
	createBorderEdge(lSite, va, vb) {
		var edge = this.edgeJunkyard.pop();
		if (!edge) {
			edge = new Edge(lSite, null);
		} else {
			edge.setSites(lSite, null);
		}
		edge.setVertices(va, vb);
		this.edges.push(edge);
		return edge;
	}

	// rhill 2011-06-02: A lot of BeachSection instanciations
	// occur during the computation of the Voronoi diagram,
	// somewhere between the number of sites and twice the
	// number of sites, while the number of BeachSections on the
	// beachline at any given time is comparatively low. For this
	// reason, we reuse already created BeachSections, in order
	// to avoid new memory allocation. This resulted in a measurable
	// performance gain.

	createBeachSection(site) {
		var beachSection = this.beachSectionJunkyard.pop();
		if (!beachSection) {
			beachSection = new BeachSection();
		}
		beachSection.site = site;
		return beachSection;
	}


	// ---------------------------------------------------------------------------

	// calculate the left break point of a particular beach section,
	// given a particular sweep line
	leftBreakPoint(arc, directrix) {
		// http://en.wikipedia.org/wiki/Parabola
		// http://en.wikipedia.org/wiki/Quadratic_equation
		// h1 = x1,
		// k1 = (y1+directrix)/2,
		// h2 = x2,
		// k2 = (y2+directrix)/2,
		// p1 = k1-directrix,
		// a1 = 1/(4*p1),
		// b1 = -h1/(2*p1),
		// c1 = h1*h1/(4*p1)+k1,
		// p2 = k2-directrix,
		// a2 = 1/(4*p2),
		// b2 = -h2/(2*p2),
		// c2 = h2*h2/(4*p2)+k2,
		// x = (-(b2-b1) + Math.sqrt((b2-b1)*(b2-b1) - 4*(a2-a1)*(c2-c1))) / (2*(a2-a1))
		// When x1 become the x-origin:
		// h1 = 0,
		// k1 = (y1+directrix)/2,
		// h2 = x2-x1,
		// k2 = (y2+directrix)/2,
		// p1 = k1-directrix,
		// a1 = 1/(4*p1),
		// b1 = 0,
		// c1 = k1,
		// p2 = k2-directrix,
		// a2 = 1/(4*p2),
		// b2 = -h2/(2*p2),
		// c2 = h2*h2/(4*p2)+k2,
		// x = (-b2 + Math.sqrt(b2*b2 - 4*(a2-a1)*(c2-k1))) / (2*(a2-a1)) + x1

		// change code below at your own risk: care has been taken to
		// reduce errors due to computers' finite arithmetic precision.
		// Maybe can still be improved, will see if any more of this
		// kind of errors pop up again.
		var site = arc.site;
		var rfoc = new Point(site.x, site.y);
		var pby2 = rfoc.y - directrix;
		// parabola in degenerate case where focus is on directrix
		if (!pby2) {
			return rfoc.x;
		}
		var lArc = arc.previous;
		if (!lArc) {
			return -Infinity;
		}
		site = lArc.site;
		var lfoc = new Point(site.x, site.y);
		var plby2 = lfoc.y - directrix;

		// parabola in degenerate case where focus is on directrix
		if (!plby2) {
			return lfoc.x;
		}
		var hl = lfoc.x - rfoc.x;
		var aby2 = 1 / pby2 - 1 / plby2;

		var b = hl / plby2;
		if (aby2) {
			return (-b + this.sqrt(b * b - 2 * aby2 * (hl * hl / (-2 * plby2) - lfoc.y + plby2 / 2 + rfoc.y - pby2 / 2))) / aby2 + rfoc.x;
		}
		// both parabolas have same distance to directrix, thus break point is midway
		return (rfoc.x + lfoc.x) / 2;
	}

	// calculate the right break point of a particular beach section,
	// given a particular directrix
	rightBreakPoint(arc, directrix) {
		var rArc = arc.next;
		if (rArc) {
			return this.leftBreakPoint(rArc, directrix);
		}
		var site = arc.site;
		return site.y === directrix ? site.x : Infinity;
	}

	detachBeachSection(beachSection) {
		this.detachCircleEvent(beachSection); // detach potentially attached circle event
		this.beachline.removeNode(beachSection); // remove from RB-tree
		this.beachSectionJunkyard.push(beachSection); // mark for reuse
	}

	removeBeachSection(beachSection) {
		var circle = beachSection.circleEvent;
		var x = circle.x;
		var y = circle.ycenter;
		var vertex = this.createVertex(x, y);
		var previous = beachSection.previous;
		var next = beachSection.next;
		var disappearingTransitions = [beachSection];
		var abs_fn = Math.abs;

		// remove collapsed beachSection from beachline
		this.detachBeachSection(beachSection);

		// there could be more than one empty arc at the deletion point, this
		// happens when more than two edges are linked by the same vertex,
		// so we will collect all those edges by looking up both sides of
		// the deletion point.
		// by the way, there is *always* a predecessor/successor to any collapsed
		// beach section, it's just impossible to have a collapsing first/last
		// beach sections on the beachline, since they obviously are unconstrained
		// on their left/right side.

		// look left
		var lArc = previous;
		while (lArc.circleEvent && this.equalWithEpsilon(x - lArc.circleEvent.x) && this.equalWithEpsilon(y - lArc.circleEvent.ycenter)) {
			previous = lArc.previous;
			disappearingTransitions.unshift(lArc);
			this.detachBeachSection(lArc); // mark for reuse
			lArc = previous;
		}
		// even though it is not disappearing, I will also add the beach section
		// immediately to the left of the left-most collapsed beach section, for
		// convenience, since we need to refer to it later as this beach section
		// is the 'left' site of an edge for which a start point is set.
		disappearingTransitions.unshift(lArc);
		this.detachCircleEvent(lArc);

		// look right
		var rArc = next;
		while (rArc.circleEvent && this.equalWithEpsilon(x - rArc.circleEvent.x) && this.equalWithEpsilon(y - rArc.circleEvent.ycenter)) {
			next = rArc.next;
			disappearingTransitions.push(rArc);
			this.detachBeachSection(rArc); // mark for reuse
			rArc = next;
		}
		// we also have to add the beach section immediately to the right of the
		// right-most collapsed beach section, since there is also a disappearing
		// transition representing an edge's start point on its left.
		disappearingTransitions.push(rArc);
		this.detachCircleEvent(rArc);

		// walk through all the disappearing transitions between beach sections and
		// set the start point of their (implied) edge.
		var nArcs = disappearingTransitions.length;
		var iArc;
		for (iArc = 1; iArc < nArcs; iArc++) {
			rArc = disappearingTransitions[iArc];
			lArc = disappearingTransitions[iArc - 1];
			rArc.edge.setStartPoint(lArc.site, rArc.site, vertex);
		}

		// create a new edge as we have now a new transition between
		// two beach sections which were previously not adjacent.
		// since this edge appears as a new vertex is defined, the vertex
		// actually define an end point of the edge (relative to the site
		// on the left)
		lArc = disappearingTransitions[0];
		rArc = disappearingTransitions[nArcs - 1];
		rArc.edge = this.createEdge(lArc, rArc, undefined, vertex);

		// create circle events if any for beach sections left in the beachline
		// adjacent to collapsed sections
		this.attachCircleEvent(lArc);
		this.attachCircleEvent(rArc);
	}

	addBeachSection(site) {
		var x = site.x;
		var directrix = site.y;

		// find the left and right beach sections which will surround the newly
		// created beach section.
		// rhill 2011-06-01: This loop is one of the most often executed,
		// hence we expand in-place the comparison-against-epsilon calls.
		var lArc, rArc;
		var dxl, dxr;
		var node = this.beachline.root;

		while (node) {
			dxl = this.leftBreakPoint(node, directrix) - x;
			// x lessThanWithEpsilon xl => falls somewhere before the left edge of the beachSection
			if (this.greaterThanEpsilon(dxl)) {
				node = node.left;
			}
			else {
				dxr = x - this.rightBreakPoint(node, directrix);
				// x greaterThanWithEpsilon xr => falls somewhere after the right edge of the beachSection
				if (this.greaterThanEpsilon(dxr)) {
					if (!node.right) {
						lArc = node;
						break;
					}
					node = node.right;
				} else {
					if (this.lessThanEpsilon(-dxl)) {
						// x equalWithEpsilon xl => falls exactly on the left edge of the beachSection
						lArc = node.previous;
						rArc = node;
					} else if (this.lessThanEpsilon(-dxr)) {
						// x equalWithEpsilon xr => falls exactly on the right edge of the beachSection
						lArc = node;
						rArc = node.next;
					} else {
						// falls exactly somewhere in the middle of the beachSection
						lArc = rArc = node;
					}
					break;
				}
			}
		}
		// at this point, keep in mind that lArc and/or rArc could be
		// undefined or null.

		// create a new beach section object for the site and add it to RB-tree
		var newArc = this.createBeachSection(site);
		this.beachline.insertSuccessor(lArc, newArc);

		// cases:
		//

		// [null,null]
		// least likely case: new beach section is the first beach section on the
		// beachline.
		// This case means:
		//   no new transition appears
		//   no collapsing beach section
		//   new beachSection become root of the RB-tree
		if (!lArc && !rArc) {
			return;
		}

		// [lArc,rArc] where lArc == rArc
		// most likely case: new beach section split an existing beach
		// section.
		// This case means:
		//   one new transition appears
		//   the left and right beach section might be collapsing as a result
		//   two new nodes added to the RB-tree
		if (lArc === rArc) {
			// invalidate circle event of split beach section
			this.detachCircleEvent(lArc);

			// split the beach section into two separate beach sections
			rArc = this.createBeachSection(lArc.site);
			this.beachline.insertSuccessor(newArc, rArc);

			// since we have a new transition between two beach sections,
			// a new edge is born
			newArc.edge = rArc.edge = this.createEdge(lArc, newArc);

			// check whether the left and right beach sections are collapsing
			// and if so create circle events, to be notified when the point of
			// collapse is reached.
			this.attachCircleEvent(lArc);
			this.attachCircleEvent(rArc);
			return;
		}

		// [lArc,null]
		// even less likely case: new beach section is the *last* beach section
		// on the beachline -- this can happen *only* if *all* the previous beach
		// sections currently on the beachline share the same y value as
		// the new beach section.
		// This case means:
		//   one new transition appears
		//   no collapsing beach section as a result
		//   new beach section become right-most node of the RB-tree
		if (lArc && !rArc) {
			newArc.edge = this.createEdge(lArc, newArc);
			return;
		}

		// [null,rArc]
		// impossible case: because sites are strictly processed from top to bottom,
		// and left to right, which guarantees that there will always be a beach section
		// on the left -- except of course when there are no beach section at all on
		// the beach line, which case was handled above.
		// rhill 2011-06-02: No point testing in non-debug version
		//if (!lArc && rArc) {
		//    throw "Voronoi.addBeachSection(): What is this I don't even";
		//    }

		// [lArc,rArc] where lArc != rArc
		// somewhat less likely case: new beach section falls *exactly* in between two
		// existing beach sections
		// This case means:
		//   one transition disappears
		//   two new transitions appear
		//   the left and right beach section might be collapsing as a result
		//   only one new node added to the RB-tree
		if (lArc !== rArc) {
			// invalidate circle events of left and right sites
			this.detachCircleEvent(lArc);
			this.detachCircleEvent(rArc);

			// an existing transition disappears, meaning a vertex is defined at
			// the disappearance point.
			// since the disappearance is caused by the new beachSection, the
			// vertex is at the center of the circumscribed circle of the left,
			// new and right beachSections.
			// http://mathforum.org/library/drmath/view/55002.html
			// Except that I bring the origin at A to simplify
			// calculation
			var lSite = lArc.site;
			var a = new Point(lSite.x, lSite.y);
			var b = new Point(site.x - a.x, site.y - a.y);
			var rSite = rArc.site;
			var c = new Point(rSite.x - a.x, rSite.y - a.y);
			var d = 2 * b.determinant(c);
			var hb = b.norm2();
			var hc = c.norm2();
			var vertex = this.createVertex((c.y * hb - b.y * hc) / d + a.x, (b.x * hc - c.x * hb) / d + a.y);

			// one transition disappear
			rArc.edge.setStartpoint(lSite, rSite, vertex);

			// two new transitions appear at the new vertex location
			newArc.edge = this.createEdge(lSite, site, undefined, vertex);
			rArc.edge = this.createEdge(site, rSite, undefined, vertex);

			// check whether the left and right beach sections are collapsing
			// and if so create circle events, to handle the point of collapse.
			this.attachCircleEvent(lArc);
			this.attachCircleEvent(rArc);
			return;
		}
	}

	attachCircleEvent(arc) {
		var lArc = arc.previous;
		var rArc = arc.next;
		if (!lArc || !rArc) {
			return; // does that ever happen?
		}
		var lSite = lArc.site;
		var cSite = arc.site;
		var rSite = rArc.site;

		// If site of left beachSection is same as site of
		// right beachSection, there can't be convergence
		if (lSite === rSite) {
			return;
		}

		// Find the circumscribed circle for the three sites associated
		// with the beachSection triplet.
		// rhill 2011-05-26: It is more efficient to calculate in-place
		// rather than getting the resulting circumscribed circle from an
		// object returned by calling Voronoi.circumcircle()
		// http://mathforum.org/library/drmath/view/55002.html
		// Except that I bring the origin at cSite to simplify calculations.
		// The bottom-most part of the circumcircle is our Fortune 'circle
		// event', and its center is a vertex potentially part of the final
		// Voronoi diagram.
		var b = new Point(cSite.x, cSite.y);
		var a = lSite.diff(b);
		var c = rSite.diff(b);

		// If points l->c->r are clockwise, then center beach section does not
		// collapse, hence it can't end up as a vertex (we reuse 'd' here, which
		// sign is reverse of the orientation, hence we reverse the test.
		// http://en.wikipedia.org/wiki/Curve_orientation#Orientation_of_a_simple_polygon
		// rhill 2011-05-21: Nasty finite precision error which caused circumcircle() to
		// return infinites: 1e-12 seems to fix the problem.
		var d = 2 * a.determinant(c);
		if (d >= -2e-12) {
			return;
		}
		
		var ha = a.norm2();
		var hc = c.norm2();
		var x = (c.y * ha - a.y * hc) / d;
		var y = (a.x * hc - c.x * ha) / d;
		var ycenter = y + b.y;

		// Important: ybottom should always be under or at sweep, so no need
		// to waste CPU cycles by checking
		
		// recycle circle event object if possible
		var circleEvent = this.circleEventJunkyard.pop();
		if (!circleEvent) {
			circleEvent = new CircleEvent();
		}
		circleEvent.arc = arc;
		circleEvent.site = cSite;
		circleEvent.x = x + b.x;
		circleEvent.y = ycenter + this.sqrt(x * x + y * y); // y bottom
		circleEvent.ycenter = ycenter;
		arc.circleEvent = circleEvent;
		
		// find insertion point in RB-tree: circle events are ordered from
		// smallest to largest
		var predecessor = null;
		var node = this.circleEvents.root;
		while (node) {
			if (circleEvent.y < node.y || (circleEvent.y === node.y && circleEvent.x <= node.x)) {
				if (node.left) {
					node = node.left;
				} else {
					predecessor = node.previous;
					break;
				}
			}
			else {
				if (node.right) {
					node = node.right;
				} else {
					predecessor = node;
					break;
				}
			}
		}
		this.circleEvents.insertSuccessor(predecessor, circleEvent);
		if (!predecessor) {
			this.firstCircleEvent = circleEvent;
		}
	}
	
	detachCircleEvent(arc) {
		var circleEvent = arc.circleEvent;
		if (circleEvent) {
			if (!circleEvent.previous) {
				this.firstCircleEvent = circleEvent.next;
			}
			this.circleEvents.removeNode(circleEvent); // remove from RB-tree
			this.circleEventJunkyard.push(circleEvent);
			arc.circleEvent = null;
		}
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

	// line-clipping code taken from:
	//   Liang-Barsky function by Daniel White
	//   http://www.skytopia.com/project/articles/compsci/clipping.html
	// Thanks!
	// A bit modified to minimize code paths
	clipEdge(edge, bbox) {
		var ax = edge.va.x;
		var ay = edge.va.y;
		var bx = edge.vb.x;
		var by = edge.vb.y;
		var t0 = 0;
		var t1 = 1;
		var dx = bx - ax;
		var dy = by - ay;
		// left
		var q = ax - bbox.left;
		if (dx === 0 && q < 0) {
			return false;
		}
		var r = -q / dx;
		if (dx < 0) {
			if (r < t0) {
				return false;
			}
			if (r < t1) { t1 = r; }
		} else if (dx > 0) {
			if (r > t1) {
				return false;
			}
			if (r > t0) { t0 = r; }
		}
		// right
		q = bbox.right - ax;
		if (dx === 0 && q < 0) {
			return false;
		}
		r = q / dx;
		if (dx < 0) {
			if (r > t1) {
				return false;
			}
			if (r > t0) { t0 = r; }
		} else if (dx > 0) {
			if (r < t0) {
				return false;
			}
			if (r < t1) { t1 = r; }
		}
		// top
		q = ay - bbox.top;
		if (dy === 0 && q < 0) {
			return false;
		}
		r = -q / dy;
		if (dy < 0) {
			if (r < t0) {
				return false;
			}
			if (r < t1) { t1 = r; }
		} else if (dy > 0) {
			if (r > t1) {
				return false;
			}
			if (r > t0) { t0 = r; }
		}
		// bottom        
		q = bbox.bottom - ay;
		if (dy === 0 && q < 0) {
			return false;
		}
		r = q / dy;
		if (dy < 0) {
			if (r > t1) {
				return false;
			}
			if (r > t0) { t0 = r; }
		} else if (dy > 0) {
			if (r < t0) {
				return false;
			}
			if (r < t1) { t1 = r; }
		}

		// if we reach this point, Voronoi edge is within bbox

		// if t0 > 0, va needs to change
		// rhill 2011-06-03: we need to create a new vertex rather
		// than modifying the existing one, since the existing
		// one is likely shared with at least another edge
		if (t0 > 0) {
			edge.va = this.createVertex(ax + t0 * dx, ay + t0 * dy);
		}

		// if t1 < 1, vb needs to change
		// rhill 2011-06-03: we need to create a new vertex rather
		// than modifying the existing one, since the existing
		// one is likely shared with at least another edge
		if (t1 < 1) {
			edge.vb = this.createVertex(ax + t1 * dx, ay + t1 * dy);
		}

		// va and/or vb were clipped, thus we will need to close
		// cells which use this edge.
		if (t0 > 0 || t1 < 1) {
			this.cells[edge.lSite.voronoiId].closeMe = true;
			this.cells[edge.rSite.voronoiId].closeMe = true;
		}

		return true;
	}

	// Connect/cut edges at bounding box
	clipEdges(bbox) {
		// connect all dangling edges to bounding box
		// or get rid of them if it can't be done
		var edges = this.edges;
		var iEdge = edges.length;
		var edge;
		var abs_fn = Math.abs;

		// iterate backward so we can splice safely
		while (iEdge--) {
			edge = edges[iEdge];
			// edge is removed if:
			//   it is wholly outside the bounding box
			//   it is looking more like a point than a line
			if (!this.connectEdge(edge, bbox) ||
				!this.clipEdge(edge, bbox) ||
				(abs_fn(edge.va.x - edge.vb.x) < 1e-9 && abs_fn(edge.va.y - edge.vb.y) < 1e-9)) {
				edge.va = edge.vb = null;
				edges.splice(iEdge, 1);
			}
		}
	}

	/**
	 * Close the cells.
	 * The cells are bound by the supplied bounding box.
	 * Each cell refers to its associated site, and a list of halfedges ordered counterclockwise.
	 * 
	 * @param {Rect} bbox 
	 */
	closeCells(bbox) {
		var { left, right, top, bottom } = bbox;
		var cells = this.cells;
		var iCell = cells.length;
		var cell;
		var iLeft;
		var halfedges, nHalfedges;
		var edge;
		var va, vb, vz;
		var lastBorderSegment;
		var abs_fn = Math.abs;

		while (iCell--) {
			cell = cells[iCell];
			// prune, order halfedges counterclockwise, then add missing ones
			// required to close cells
			if (!cell.prepareHalfedges()) {
				continue;
			}
			if (!cell.closeMe) {
				continue;
			}
			// find first 'unclosed' point.
			// an 'unclosed' point will be the end point of a halfedge which
			// does not match the start point of the following halfedge
			halfedges = cell.halfedges;
			nHalfedges = halfedges.length;
			// special case: only one site, in which case, the viewport is the cell
			// ...

			// all other cases
			iLeft = 0;
			while (iLeft < nHalfedges) {
				va = halfedges[iLeft].getEndpoint();
				vz = halfedges[(iLeft + 1) % nHalfedges].getStartpoint();
				// if end point is not equal to start point, we need to add the missing
				// halfedge(s) up to vz
				if (abs_fn(va.x - vz.x) >= 1e-9 || abs_fn(va.y - vz.y) >= 1e-9) {

					// rhill 2013-12-02:
					// "Holes" in the halfedges are not necessarily always adjacent.
					// https://github.com/gorhill/Javascript-Voronoi/issues/16

					// find entry point:
					switch (true) {

						// walk downward along left side
						case this.equalWithEpsilon(va.x, left) && this.lessThanEpsilon(va.y, bottom):
							lastBorderSegment = this.equalWithEpsilon(vz.x, left);
							vb = this.createVertex(left, lastBorderSegment ? vz.y : bottom);
							edge = this.createBorderEdge(cell.site, va, vb);
							iLeft++;
							halfedges.splice(iLeft, 0, this.createHalfedge(edge, cell.site, null));
							nHalfedges++;
							if (lastBorderSegment) { break; }
							va = vb;
						// fall through

						// walk rightward along bottom side
						case this.equalWithEpsilon(va.y, bottom) && this.lessThanEpsilon(va.x, right):
							lastBorderSegment = this.equalWithEpsilon(vz.y, bottom);
							vb = this.createVertex(lastBorderSegment ? vz.x : right, bottom);
							edge = this.createBorderEdge(cell.site, va, vb);
							iLeft++;
							halfedges.splice(iLeft, 0, this.createHalfedge(edge, cell.site, null));
							nHalfedges++;
							if (lastBorderSegment) { break; }
							va = vb;
						// fall through

						// walk upward along right side
						case this.equalWithEpsilon(va.x, right) && this.greaterThanEpsilon(va.y, top):
							lastBorderSegment = this.equalWithEpsilon(vz.x, right);
							vb = this.createVertex(right, lastBorderSegment ? vz.y : top);
							edge = this.createBorderEdge(cell.site, va, vb);
							iLeft++;
							halfedges.splice(iLeft, 0, this.createHalfedge(edge, cell.site, null));
							nHalfedges++;
							if (lastBorderSegment) { break; }
							va = vb;
						// fall through

						// walk leftward along top side
						case this.equalWithEpsilon(va.y, top) && this.greaterThanEpsilon(va.x, left):
							lastBorderSegment = this.equalWithEpsilon(vz.y, top);
							vb = this.createVertex(lastBorderSegment ? vz.x : left, top);
							edge = this.createBorderEdge(cell.site, va, vb);
							iLeft++;
							halfedges.splice(iLeft, 0, this.createHalfedge(edge, cell.site, null));
							nHalfedges++;
							if (lastBorderSegment) { break; }
							va = vb;
							// fall through

							// walk downward along left side
							lastBorderSegment = this.equalWithEpsilon(vz.x, left);
							vb = this.createVertex(left, lastBorderSegment ? vz.y : bottom);
							edge = this.createBorderEdge(cell.site, va, vb);
							iLeft++;
							halfedges.splice(iLeft, 0, this.createHalfedge(edge, cell.site, null));
							nHalfedges++;
							if (lastBorderSegment) { break; }
							va = vb;
							// fall through

							// walk rightward along bottom side
							lastBorderSegment = this.equalWithEpsilon(vz.y, bottom);
							vb = this.createVertex(lastBorderSegment ? vz.x : right, bottom);
							edge = this.createBorderEdge(cell.site, va, vb);
							iLeft++;
							halfedges.splice(iLeft, 0, this.createHalfedge(edge, cell.site, null));
							nHalfedges++;
							if (lastBorderSegment) { break; }
							va = vb;
							// fall through

							// walk upward along right side
							lastBorderSegment = this.equalWithEpsilon(vz.x, right);
							vb = this.createVertex(right, lastBorderSegment ? vz.y : top);
							edge = this.createBorderEdge(cell.site, va, vb);
							iLeft++;
							halfedges.splice(iLeft, 0, this.createHalfedge(edge, cell.site, null));
							nHalfedges++;
							if (lastBorderSegment) { break; }
						// fall through

						default:
							throw "Voronoi.closeCells() > this makes no sense!";
					}
				}
				iLeft++;
			}
			cell.closeMe = false;
		}
	}

	// ---------------------------------------------------------------------------
	// Debugging helper
	/*
	dumpBeachliney) {
		console.log('Voronoi.dumpBeachline(%f) > BeachSections, from left to right:', y);
		if ( !this.beachline ) {
			console.log('  None');
			}
else {
			var bs = this.beachline.getFirst(this.beachline.root);
			while ( bs ) {
				console.log('  site %d: xl: %f, xr: %f', bs.site.voronoiId, this.leftBreakPoint(bs, y), this.rightBreakPoint(bs, y));
				bs = bs.next;
				}
			}
		};
	*/

	// ---------------------------------------------------------------------------
	// Helper: Quantize sites

	// rhill 2013-10-12:
	// This is to solve https://github.com/gorhill/Javascript-Voronoi/issues/15
	// Since not all users will end up using the kind of coord values which would
	// cause the issue to arise, I chose to let the user decide whether or not
	// he should sanitize his coord values through this helper. This way, for
	// those users who uses coord values which are known to be fine, no overhead is
	// added.

	quantizeSites(sites) {
		var ε = this.ε;
		var n = sites.length;
		var site;
		while (n--) {
			site = sites[n];
			site.x = Math.floor(site.x / ε) * ε;
			site.y = Math.floor(site.y / ε) * ε;
		}
	}

	// ---------------------------------------------------------------------------
	// Helper: Recycle diagram: all vertex, edge and cell objects are
	// "surrendered" to the Voronoi object for reuse.
	// TODO: rhill-voronoi-core v2: more performance to be gained
	// when I change the semantic of what is returned.

	recycle(diagram) {
		if (diagram) {
			if (diagram instanceof this.Diagram) {
				this.toRecycle = diagram;
			}
			else {
				throw 'Voronoi.recycleDiagram() > Need a Diagram object.';
			}
		}
	}

	// ---------------------------------------------------------------------------
	// Top-level Fortune loop

	// rhill 2011-05-19:
	//   Voronoi sites are kept client-side now, to allow
	//   user to freely modify content. At compute time,
	//   *references* to sites are copied locally.

	compute(sites, bbox) {
		// to measure execution time
		var startTime = new Date();

		// init internal state
		this.reset();

		// any diagram data available for recycling?
		// I do that here so that this is included in execution time
		if (this.toRecycle) {
			this.vertexJunkyard = this.vertexJunkyard.concat(this.toRecycle.vertices);
			this.edgeJunkyard = this.edgeJunkyard.concat(this.toRecycle.edges);
			this.cellJunkyard = this.cellJunkyard.concat(this.toRecycle.cells);
			this.toRecycle = null;
		}

		// Initialize site event queue
		var siteEvents = sites.slice(0);
		siteEvents.sort(function (a, b) {
			var r = b.y - a.y;
			if (r) {
				return r;
			}
			return b.x - a.x;
		});

		// process queue
		var site = siteEvents.pop();
		var siteid = 0;
		var xsitex; // to avoid duplicate sites
		var xsitey;
		var cells = this.cells;
		var circle;

		// main loop
		for (; ;) {
			// we need to figure whether we handle a site or circle event
			// for this we find out if there is a site event and it is
			// 'earlier' than the circle event
			circle = this.firstCircleEvent;

			// add beach section
			if (site && (!circle || site.y < circle.y || (site.y === circle.y && site.x < circle.x))) {
				// only if site is not a duplicate
				if (site.x !== xsitex || site.y !== xsitey) {
					// first create cell for new site
					cells[siteid] = this.createCell(site);
					site.voronoiId = siteid++;
					// then create a beachSection for that site
					this.addBeachSection(site);
					// remember last site coords to detect duplicate
					xsitey = site.y;
					xsitex = site.x;
				}
				site = siteEvents.pop();
			}

			// remove beach section
			else if (circle) {
				this.removeBeachSection(circle.arc);
			}

			// all done, quit
			else {
				break;
			}
		}

		// wrapping-up:
		//   connect dangling edges to bounding box
		//   cut edges as per bounding box
		//   discard edges completely outside bounding box
		//   discard edges which are point-like
		this.clipEdges(bbox);

		//   add missing edges in order to close opened cells
		this.closeCells(bbox);

		// to measure execution time
		var stopTime = new Date();

		// prepare return values
		var diagram = new Diagram();
		diagram.cells = this.cells;
		diagram.edges = this.edges;
		diagram.vertices = this.vertices;
		diagram.execTime = stopTime.getTime() - startTime.getTime();

		// clean up
		this.reset();

		return diagram;
	};
}

/******************************************************************************/

if (typeof module !== 'undefined') {
	module.exports = Voronoi;
}
