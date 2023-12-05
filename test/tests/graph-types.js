
const {Graph, GraphTransformer} = require("../../src/index.js")
const _ = require("underscore")

QUnit.module( "dagitty" )
QUnit.test( "graph types", function( assert ) {
	var graphs = {
		graph : new Graph( "graph { x -- y -- z }" ),
		dag : new Graph( "dag { x -> y -> z }" ),
		pdag : new Graph( "pdag { x -- y -> z }" ),
		mag : new Graph( "mag { x <-> y -> z }" )
	};
	
	_.each( Object.keys(graphs), function(t){
		assert.equal( GraphTransformer.inducedSubgraph(graphs[t],
			graphs[t].getVertex(["x","y"])).getType(), t )
	});

	_.each( Object.keys(graphs), function(t){
		assert.equal( GraphTransformer.edgeInducedSubgraph(graphs[t],
			graphs[t].edges).getType(), t )
	});
	
	_.each( Object.keys(graphs), function(t){
		assert.equal( GraphTransformer.ancestorGraph(graphs[t],
			graphs[t].getVertex(["x","y"])).getType(), t )
	});

	// TODO convert these to more future-proof opt-style syntax
	_.each( ["backDoorGraph","indirectGraph"], function(f){
		_.each( Object.keys(graphs), function(t){
			assert.equal( GraphTransformer[f](graphs[t],
				graphs[t].getVertex(["x"]),graphs[t].getVertex(["z"])).getType(), t )
		})
	});

	_.each( ["activeBiasGraph"], function(f){
		_.each( Object.keys(graphs), function(t){
			assert.equal( GraphTransformer[f](graphs[t],
				{X:graphs[t].getVertex(["x"]),Y:graphs[t].getVertex(["z"])}).getType(), t )
		})
	});
	
	_.each( Object.keys(graphs), function(t){
		assert.equal( GraphTransformer.canonicalDag(graphs[t]).g.getType(), "dag" )
	});

	_.each( ["moralGraph","skeleton"], function(f){
		_.each( Object.keys(graphs), function(t){
			assert.equal( GraphTransformer[f](graphs[t]).getType(), "graph" )
		});
	});

});

