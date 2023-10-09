// ---------------------------------------------------------------------------
// Red-Black tree code (based on C version of "rbtree" by Franck Bui-Huu
// https://github.com/fbuihuu/libtree/blob/master/rb.c
export default class RBTree {
	constructor() {
		this.root = null;
	};

	/**
	 * 
	 * @param {RBNode} node 
	 * @param {RBNode} successor 
	 */
	insertSuccessor(node, successor) {
		var parent;
		if (node) {
			successor.previous = node;
			successor.next = node.next;
			if (node.next) {
				node.next.previous = successor;
			}
			node.next = successor;
			if (node.right) {
				node = node.right.getFirst();
				node.left = successor;
			} else {
				node.right = successor;
			}
			parent = node;
		} else if (this.root) {
			node = this.root.getFirst();
			successor.previous = null;
			successor.next = node;
			node.previous = successor;
			node.left = successor;
			parent = node;
		} else {
			successor.previous = successor.next = null;
			this.root = successor;
			parent = null;
		}
		successor.left = successor.right = null;
		successor.parent = parent;
		successor.red = true;

		var grandpa, uncle;
		node = successor;
		while (parent && parent.red) {
			grandpa = parent.parent;
			if (parent === grandpa.left) {
				uncle = grandpa.right;
				if (uncle && uncle.red) {
					parent.red = uncle.red = false;
					grandpa.red = true;
					node = grandpa;
				} else {
					if (node === parent.right) {
						this.rotateLeft(parent);
						node = parent;
						parent = node.parent;
					}
					parent.red = false;
					grandpa.red = true;
					this.rotateRight(grandpa);
				}
			} else {
				uncle = grandpa.left;
				if (uncle && uncle.red) {
					parent.red = uncle.red = false;
					grandpa.red = true;
					node = grandpa;
				} else {
					if (node === parent.left) {
						this.rotateRight(parent);
						node = parent;
						parent = node.parent;
					}
					parent.red = false;
					grandpa.red = true;
					this.rotateLeft(grandpa);
				}
			}
			parent = node.parent;
		}
		this.root.red = false;
	}

	removeNode(node) {
		// return node.remove();
		if (node.next) {
			node.next.previous = node.previous;
		}
		if (node.previous) {
			node.previous.next = node.next;
		}
		node.next = node.previous = null;
		var parent = node.parent,
			left = node.left,
			right = node.right,
			next;
		if (!left) {
			next = right;
		} else if (!right) {
			next = left;
		} else {
			next = right.getFirst();
		}
		if (parent) {
			if (parent.left === node) {
				parent.left = next;
			} else {
				parent.right = next;
			}
		} else {
			this.root = next;
		}
		// enforce red-black rules
		var isRed;
		if (left && right) {
			isRed = next.red;
			next.red = node.red;
			next.left = left;
			left.parent = next;
			if (next !== right) {
				parent = next.parent;
				next.parent = node.parent;
				node = next.right;
				parent.left = node;
				next.right = right;
				right.parent = next;
			} else {
				next.parent = parent;
				parent = next;
				node = next.right;
			}
		} else {
			isRed = node.red;
			node = next;
		}
		// 'node' is now the sole successor's child and 'parent' its
		// new parent (since the successor can have been moved)
		if (node) {
			node.parent = parent;
		}
		// the 'easy' cases
		if (isRed) { return; }
		if (node && node.red) {
			node.red = false;
			return;
		}
		// the other cases
		var sibling;
		do {
			if (node === this.root) {
				break;
			}
			if (node === parent.left) {
				sibling = parent.right;
				if (sibling.red) {
					sibling.red = false;
					parent.red = true;
					this.rotateLeft(parent);
					sibling = parent.right;
				}
				if ((sibling.left && sibling.left.red) || (sibling.right && sibling.right.red)) {
					if (!sibling.right || !sibling.right.red) {
						sibling.left.red = false;
						sibling.red = true;
						this.rotateRight(sibling);
						sibling = parent.right;
					}
					sibling.red = parent.red;
					parent.red = sibling.right.red = false;
					this.rotateLeft(parent);
					node = this.root;
					break;
				}
			} else {
				sibling = parent.left;
				if (sibling.red) {
					sibling.red = false;
					parent.red = true;
					this.rotateRight(parent);
					sibling = parent.left;
				}
				if ((sibling.left && sibling.left.red) || (sibling.right && sibling.right.red)) {
					if (!sibling.left || !sibling.left.red) {
						sibling.right.red = false;
						sibling.red = true;
						this.rotateLeft(sibling);
						sibling = parent.left;
					}
					sibling.red = parent.red;
					parent.red = sibling.left.red = false;
					this.rotateRight(parent);
					node = this.root;
					break;
				}
			}
			sibling.red = true;
			node = parent;
			parent = parent.parent;
		} while (!node.red);
		if (node) {
			node.red = false;
		}
	}

	rotateLeft(node) {
		if (!node.parent) {
			this.root = node.right;
		}
		node.rotateLeft();
	}
	
	rotateRight(node) {
		if (!node.parent) {
			this.root = node.left;
		}
		node.rotateRight();
		return;
	}
}