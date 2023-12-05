/*
 * 
 *  Some parts of the code in this file have been written by other authors,
 *  and were originally licensed under the MIT license. They originate from 
 *  the following projects: 
 * 
 *  - Dracula Graph Layout and Drawing Framework 0.0.3alpha
 *  (c) 2010 Philipp Strathausen <strathausen@gmail.com>,
 *      http://dracula.ameisenbar.de/index.html
 * 
 *  - which in turn are based on the Graph JavaScript framework, version 0.0.1
 *  (c) 2006 Aslak Hellesoy <aslak.hellesoy@gmail.com>
 *  (c) 2006 Dave Hoover <dave.hoover@gmail.com>
 *
 *  - Ported from Graph::Layouter::Spring in
 *    http://search.cpan.org/~pasky/Graph-Layderer-0.02/
 *  The algorithm is based on a spring-style layouter of a Java-based social
 *  network tracker PieSpy written by Paul Mutton E<lt>paul@jibble.orgE<gt>.
 *
/*--------------------------------------------------------------------------*/

/* globals _  */
/* exported GraphLayouter */

const _ = require("underscore")

const GraphLayouter = {}

GraphLayouter.prototype = {
	layoutCalcBounds: function() {
		var minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity
		_.each(this.graph.vertices.values(), function( v ){
			var x = v.layout_pos_x
			var y = v.layout_pos_y

			if(x > maxx) maxx = x
			if(x < minx) minx = x
			if(y > maxy) maxy = y
			if(y < miny) miny = y            
		} )
		var xpad = Math.max( (maxx-minx)*.1, .5 )
		maxx += xpad
		minx -= xpad
		var ypad = Math.max( (maxy-miny)*.1, .5 )
		maxy += ypad
		miny -= ypad
		var trimn = function(n){ return Math.round(n*1e3)/1e3 }
		this.graph.setBoundingBox([minx,miny,maxx,maxy].map(trimn))
	}
}

GraphLayouter.Spring = function(graph) {
	this.graph = graph
	this.iterations = 500
	this.maxRepulsiveForceDistance = 6
	this.k = 2
	this.c = 0.01
	this.maxVertexMovement = 0.5
}

GraphLayouter.Spring.prototype = {
	layoutCalcBounds : GraphLayouter.prototype.layoutCalcBounds,

	layout: function() {
		this.layoutPrepare()
		for (var i = 0; i < this.iterations; i++) {
			this.layoutIteration()
		}
		this.layoutCalcBounds()
	},

	layoutPrepare: function() {
		_.each(this.graph.vertices.values(), function( v ){
			v.layout_pos_x = 0
			v.layout_pos_y = 0
			v.layoutForceX = 0
			v.layoutForceY = 0            
		} )
		_.each(this.graph.edges, function( e ){
			delete e.attraction
		} )
	},


	layoutIteration: function() {
		// Forces on nodes due to node-node repulsions
		var nodelist = this.graph.vertices.values()
		for (var i = 0; i < nodelist.length; i++) {
			var node1 = nodelist[i]
			for (var j = i + 1; j < nodelist.length; j++) {
				var node2 = nodelist[j]
				this.layoutRepulsive(node1, node2)
			}
		}
		// Forces on nodes due to edge attractions
		for ( i = 0; i < this.graph.edges.length; i++) {
			var edge = this.graph.edges[i]
			this.layoutAttractive(edge)             
		}
  
		// Move by the given force
		for ( i = 0 ; i < nodelist.length; i ++) {
			var node = nodelist[i]
			var xmove = this.c * node.layoutForceX
			var ymove = this.c * node.layoutForceY

			var max = this.maxVertexMovement
			if(xmove > max) xmove = max
			if(xmove < -max) xmove = -max
			if(ymove > max) ymove = max
			if(ymove < -max) ymove = -max

			node.layout_pos_x += xmove
			node.layout_pos_y += ymove
			node.layoutForceX = 0
			node.layoutForceY = 0
		}
	},

	layoutRepulsive: function(node1, node2) {
		var dx = node2.layout_pos_x - node1.layout_pos_x
		var dy = node2.layout_pos_y - node1.layout_pos_y
		var d2 = dx * dx + dy * dy
		if(d2 < 0.01) {
			dx = 0.1 * Math.random() + 0.1
			dy = 0.1 * Math.random() + 0.1
			d2 = dx * dx + dy * dy
		}
		var d = Math.sqrt(d2)
		if(d < this.maxRepulsiveForceDistance) {
			var repulsiveForce = this.k * this.k / d
			node2.layoutForceX += repulsiveForce * dx / d
			node2.layoutForceY += repulsiveForce * dy / d
			node1.layoutForceX -= repulsiveForce * dx / d
			node1.layoutForceY -= repulsiveForce * dy / d
		}
	},

	layoutAttractive: function(edge) {
		var node1 = edge.v1
		var node2 = edge.v2

		var dx = node2.layout_pos_x - node1.layout_pos_x
		var dy = node2.layout_pos_y - node1.layout_pos_y
		var d2 = dx * dx + dy * dy
		if(d2 < 0.01) {
			dx = 0.1 * Math.random() + 0.1
			dy = 0.1 * Math.random() + 0.1
			d2 = dx * dx + dy * dy
		}
		var d = Math.sqrt(d2)
		if(d > this.maxRepulsiveForceDistance) {
			d = this.maxRepulsiveForceDistance
			d2 = d * d
		}
		var attractiveForce = (d2 - this.k * this.k) / this.k
		if(edge.attraction == undefined || edge.attraction < 1) edge.attraction = 1
		attractiveForce *= Math.log(edge.attraction) * 0.5 + 1

		node2.layoutForceX -= attractiveForce * dx / d
		node2.layoutForceY -= attractiveForce * dy / d
		node1.layoutForceX += attractiveForce * dx / d
		node1.layoutForceY += attractiveForce * dy / d
	}
}

module.exports = GraphLayouter
