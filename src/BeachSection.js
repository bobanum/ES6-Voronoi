import RBNode from "./RBNode.js";

export default class BeachSection extends RBNode {
	static junkyard = [];
	constructor(site) {
		super();
		this._site = site || null;
	}
	get site() {
		return this._site;
	}
	set site(val) {
		this._site = val;
	}
	diff(other) {
		return this.site.y - other.site.y;
	}
	static create(site) {
		var beachSection = this.junkyard.pop();
		if (!beachSection) {
			beachSection = new this();
		}
		beachSection.site = site;
		return beachSection;
	}

}
