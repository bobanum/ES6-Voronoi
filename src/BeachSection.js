import RBNode from "./RBNode.js";

export default class BeachSection extends RBNode {
	constructor() {
		super();
		this._site = null;
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
}
