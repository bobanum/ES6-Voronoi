export default class RBNode {
	constructor() {
		this.left = null;
		this.next = null;
		this.parent = null;
		this.previous = null;
		this.red = false;
		this.right = null;
	}
	getFirst() {
		var node = this;
		while (node.left) {
			node = node.left;
		}
		return node;
	};

	getLast() {
		var node = this;
		while (node.right) {
			node = node.right;
		}
		return node;
	};
	getRoot() {
		var node = this;
		while (node.parent) {
			node = node.parent;
		}
		return node;
	};
	rotateLeft() {
		var right = this.right; // can't be null
		var parent = this.parent;
		if (parent) {
			if (parent.left === this) {
				parent.left = right;
			} else {
				parent.right = right;
			}
		}
		right.parent = parent;
		this.parent = right;
		this.right = right.left;
		if (this.right) {
			this.right.parent = this;
		}
		right.left = this;
	}
	rotateRight() {
		var left = this.left;
		var parent = this.parent;
		if (parent) {
			if (parent.left === this) {
				parent.left = left;
			} else {
				parent.right = left;
			}
		}
		left.parent = parent;
		this.parent = left;
		this.left = left.right;
		if (this.left) {
			this.left.parent = this;
		}
		left.right = this;
	}
}