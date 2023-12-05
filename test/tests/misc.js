

const {Graph,GraphParser,GraphAnalyzer,GraphTransformer,GraphSerializer} = require("../../src/index.js")
const TestGraphs = require("../test-graphs.js")
const _ = require("underscore")
const $es = (g) => GraphSerializer.toDotEdgeStatements(g)
const $p = (s) => GraphParser.parseGuess(s)

function sep_2_str( ss ){
   var r = [];
   if( ss.length == 0 )
      return "";
   _.each( ss, function(s){
      var rs = _.pluck( s, 'id').sort().join(", ");
      r.push(rs);
   });
   r.sort();
   return "{"+r.join("}\n{")+"}";
}
function imp_2_str( imp ){
  var r = [],j,rr;
  _.each( imp, function( i ){
      for( j = 0 ; j < i[2].length ; j ++ ){
         rr = i[0]+" _||_ "+i[1];
         if( i[2][j].length > 0 ){
            rr += " | "+_.pluck( i[2][j], 'id').sort().join(", ");
         }
         r.push(rr)
      }
  } );
  return r.join("\n");
}

QUnit.module("dagitty")


QUnit.test( "uncategorized tests", function( assert ) {

assert.equal((function(){
	var g = TestGraphs.small3();
	g.addSource("S");
	g.addTarget("T");
	g.addAdjustedNode("p");
	var abg = GraphTransformer.activeBiasGraph(g);
	var gbd = GraphTransformer.backDoorGraph(abg);
	var gbdan = GraphTransformer.ancestorGraph(gbd);
	var gam = GraphTransformer.moralGraph( gbdan )
	// the undirected edges from the active bias graph graph should
	// not yield an edge x -- y in the moral graph, hence {p} again
	// becomes a valid separator 
	return sep_2_str( GraphAnalyzer.listMsasTotalEffect( abg ) );
})(), "{p, x}\n{p, z}" )

assert.equal((function(){
   var g = TestGraphs.big1();
   g.addAdjustedNode("y");
   var g_bias = GraphTransformer.activeBiasGraph( g )
   g = GraphTransformer.edgeInducedSubgraph( g, g_bias.edges )
   g = GraphTransformer.moralGraph( g )
   g.deleteVertex(g.getVertex("x"))
   return sep_2_str( GraphAnalyzer.listMinimalSeparators( g ) ) 
})(), "{a, h}\n{e, h}\n{f, h}\n{h, n}" )

assert.equal((function(){
   var g = TestGraphs.small2();
   g = GraphTransformer.activeBiasGraph(g);
   return g.toAdjacencyList();
})(), "a b s\nc b t\ng c s" )

assert.equal((function(){
   var g = TestGraphs.findExample("Schipf");
   g.addAdjustedNode("WC");
   g.addAdjustedNode("U");
   g = GraphTransformer.activeBiasGraph(g);
   return $es(g);
})(), "A -> PA\nA -> S\nA -> TT\nA -> WC\nPA -> T2DM\nPA -> WC\nS -> T2DM\nS -> TT" )

assert.equal((function(){
	var g = TestGraphs.extended_confounding_triangle()
	var gbias = GraphTransformer.activeBiasGraph(g)
	var gmor = GraphTransformer.moralGraph( gbias )
	var gsep = GraphAnalyzer.listMinimalSeparators( 
		gmor, [g.getVertex("D")], [] )
	return sep_2_str( gsep  )
})(), "{C, D}" )

assert.equal((function(){
   var g = TestGraphs.findExample("Acid");
   return sep_2_str( 
	GraphAnalyzer.listMinimalSeparators(
		GraphTransformer.moralGraph( GraphTransformer.activeBiasGraph(g) ), [], g.descendantsOf(g.getSources()) ) );
})(), "{x1}\n{x4}" )

assert.equal((function(){
   var g = TestGraphs.intermediate_adjustment_graph();
   return sep_2_str( 
		GraphAnalyzer.listMinimalSeparators(
		GraphTransformer.moralGraph(GraphTransformer.activeBiasGraph(g)), [], [g.getVertex('I')] ) );
})(), "{Z}" )

assert.equal((function(){
   var g = TestGraphs.intermediate_adjustment_graph();
   g.getVertex('I').latent = true;
   return sep_2_str( GraphAnalyzer.listMsasTotalEffect( g ) );
})(), "{Z}" )

assert.equal((function(){
   var g = TestGraphs.small_mixed();
   var cc = GraphAnalyzer.connectedComponents(g);
   var r = "";
   _.each(cc, function(c) {
      r += ("["+_.pluck(c,'id').sort().join(",")+"] ");
   } );
   return r;
})(), "[a,b,c] [d,e,f] " )

assert.equal((function(){
	// This test verifies that the below methods have
	// no side effects (which they had in an earlier, buggy
	// version of the code)
	var g = TestGraphs.extended_confounding_triangle();
	GraphTransformer.ancestorGraph(g);
	GraphTransformer.ancestorGraph(g);
	GraphTransformer.activeBiasGraph(g);
	GraphTransformer.activeBiasGraph(g);
	return g.oldToString();
})(), "A E\nB O\nC 1\nD 1\nE 1\n\nA B\nC A B\nD A C\nE B C" )

assert.equal((function(){
  var g = GraphTransformer.moralGraph( $p( "x 1\ny 1\nm 1\na 1\nb 1\n\nm x\nm y\na m x\nb m y" ) )
  return _.pluck(GraphAnalyzer.connectedComponentAvoiding( g, 
  	[g.getVertex("x")], [g.getVertex("m"), g.getVertex("b")] ),'id')
    .sort().join(",");
})(), "a,x" )

assert.equal((function(){
	GraphParser.VALIDATE_GRAPH_STRUCTURE = false;
   var g = $p( "xobs 1 @0.350,0.000\n"+
"y 1 @0.562,0.000\n"+
"t 1 @0.351,-0.017\n"+
"\n"+
"xobs y\n"+
"y t\n"+
"t xobs" );
	GraphParser.VALIDATE_GRAPH_STRUCTURE = true;
   GraphAnalyzer.containsCycle( g );
   return GraphAnalyzer.containsCycle( g );
})(), "xobs&rarr;y&rarr;t&rarr;xobs" )

assert.equal((function(){
   var g = $p( "xobs E @0.350,0.000\n"+
"y O @0.562,0.000\n"+
"t 1 @0.351,-0.017\n"+
"u1 1 @0.476,-0.013\n"+
"u2 1 @0.175,-0.017\n"+
"\n"+
"t xobs\n"+
"u1 t y\n"+
"u2 t xobs\n"+
"xobs y" );
   return sep_2_str( GraphAnalyzer.listMsasTotalEffect( g ) );
})(), "{t, u2}\n{u1}" )

assert.equal((function(){
   var g = TestGraphs.small5()
   g.addAdjustedNode("A")
   return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "T A\nU A I" )

assert.equal((function(){
   var g = TestGraphs.small5();
   return GraphTransformer.causalFlowGraph(g).toAdjacencyList();
})(), "A I\nT A" )

assert.equal((function(){
   var g = TestGraphs.small5();
   g.addAdjustedNode("A");
   return GraphTransformer.causalFlowGraph(g).toAdjacencyList();
})(), "" )

assert.equal((function(){
   var g = TestGraphs.small4();
   g.addAdjustedNode("A");
   var abg = GraphTransformer.activeBiasGraph(g);
   return abg.oldToString()
})(), "I O\nT E\n\n" )

assert.equal((function(){;
   var g = TestGraphs.small3();
   g.addAdjustedNode("p");
   g.addSource("S");
   g.addTarget("T");
   var abg = GraphTransformer.activeBiasGraph(g);
   g.deleteVertex( "p" )
   return GraphTransformer.edgeInducedSubgraph(g,abg.edges).toAdjacencyList()
})(), "x S\nz T" )

assert.equal((function(){;
   var g = TestGraphs.small3();
   g.addSource("S");
   g.addTarget("T");
   g.addAdjustedNode("p");
   // this should yield the same result as listing the MSAS of g
   // the vertex p should not be listed as contained in the separators
   // because it is not listed as compulsory in the call to "listSeparators()"
   // (see the api of the function there) 
   var g_bias = GraphTransformer.activeBiasGraph( g )
   var g_can = GraphTransformer.canonicalDag( g_bias )
   g = GraphTransformer.moralGraph( g_can.g )
   return sep_2_str( GraphAnalyzer.listMinimalSeparators( g, [], 
	g.getAdjustedNodes() ) ) 
})(), "{x}\n{z}" )

assert.equal((function(){
  var g = TestGraphs.commentator1();
  return sep_2_str( GraphAnalyzer.listMsasTotalEffect( g ) );
})(), "" )

assert.equal((function(){
  var g = $p("S E @0.395,0.046\n"+
"T O @0.715,0.039\n"+
"h 1 @0.544,0.017\n"+
"i 1 @0.544,0.017\n"+
"x 1 @0.424,0.072\n"+
"z 1 @0.610,0.071\n"+
"\n"+
"S T\n"+
"h S\n"+
"i h T\n"+
"x S z\n"+
"z T\n");
  return sep_2_str( GraphAnalyzer.listMsasTotalEffect( g ) );
})(), "{h, x}\n{h, z}\n{i, x}\n{i, z}" )

assert.equal((function(){
  var g = TestGraphs.big1();
  g.addAdjustedNode("y");
  return sep_2_str( GraphAnalyzer.listMsasTotalEffect( g ) );
})(), "{a, h, x, y}\n{a, h, y, z}\n{e, h, x, y}\n{e, h, y, z}\n{f, h, x, y}\n{f, h, y, z}\n{h, n, x, y}\n{h, n, y, z}" )

assert.equal((function(){
  var g = TestGraphs.findExample("Shrier");
  var must = [g.getVertex("FitnessLevel")];
  var must_not = [g.getVertex("Genetics"),
    g.getVertex("ConnectiveTissueDisorder"),
    g.getVertex("IntraGameProprioception")];
  
  return sep_2_str( GraphAnalyzer.listMsasTotalEffect( g, must, must_not ) );
})(), "{Coach, FitnessLevel}\n{FitnessLevel, NeuromuscularFatigue, TissueWeakness}\n{FitnessLevel, TeamMotivation}" )

assert.equal((function(){
  return sep_2_str( GraphAnalyzer.listMsasTotalEffect( TestGraphs.very_large_dag() ) );
})(), "{Allergenexposition, Antibiotika, Begleiterkrankungen, BetreuungKind, Darmflora, Erregerexposition, Geschwister, Hausstaub, Haustiere, Infektionen, RauchenAnderer, RauchenMutter, Stillen}\n{Allergenexposition, Antibiotika, Begleiterkrankungen, Darmflora, Erregerexposition, Geburtsmodus, Hausstaub, Haustiere, Infektionen, RauchenAnderer, RauchenMutter, Stillen}\n{Allergenexposition, Begleiterkrankungen, Darmflora, Erregerexposition, Impfungen, Infektionen, RauchenAnderer, RauchenMutter}" )

assert.equal((function(){
  var g = GraphTransformer.moralGraph( $p( "x E\ny O\nm\na\nb\n\nm x\nm y\na m x\nb m y" ) )
  return sep_2_str( GraphAnalyzer.listMinimalSeparators(g) );
})(), "{a, m}\n{b, m}" )

assert.equal((function(){
  // the function "neighboursOf" should, also when called on a vertex set, 
  // not return any vertices from those sets as neighbours of the set itself
  var g = GraphTransformer.moralGraph( $p( "x\ny\nm\na\nb\n\nm x\nm y\na m x\nb m y" ) )
  return _.pluck(g.neighboursOf( [g.getVertex("m"), g.getVertex("b")] ),'id')
    .sort().join(",");
})(), "a,x,y" )

assert.equal((function(){
   var g = $p("E E @-1.897,0.342\n"+
	"D O @-0.067,0.302\n"+
	"g A @-0.889,1.191\n"+
	"\n"+
	"D g\n"+
	"E D");
	return GraphAnalyzer.violatesAdjustmentCriterion( g )
})(), true )

assert.equal((function(){
   var g = $p("x E @0.083,-0.044\n"+
      "y O @0.571,-0.043\n"+
      "i1 1 @0.331,-0.037\n"+
      "i2 1 @0.328,-0.030\n"+
      "y2 A @0.333,-0.054\n"+
      "y3 1 @0.334,-0.047\n"+
      "\n"+
      "i1 y\n"+
      "i2 y\n"+
      "x y2 i2 i1 y\n"+
      "y3 y x");
   return _.pluck(GraphAnalyzer.intermediates(g),'id').join(",");
})(), "i1,i2" )

assert.equal((function(){
   var g = $p("x 1 @0.264,-0.027\n"+
      "y 1 @0.537,-0.015\n"+
      "y2 A @0.216,-0.015\n"+
      "\n"+
      "x y2 y");
   return _.pluck(GraphAnalyzer.intermediates(g),'id').join(",");
})(), "" )

assert.equal((function(){
   var g = $p("x E @0.264,-0.027\n"+
"y O @0.537,-0.015\n"+
"y2 A @0.216,-0.015\n"+
"\n"+
"x y2 y");
	return sep_2_str( GraphAnalyzer.listMsasTotalEffect( g ) );
})(), "{y2}" )

assert.equal((function(){
	var g = TestGraphs.findExample( "Many variables" );
	return sep_2_str( GraphAnalyzer.listMsasTotalEffect( g ) );
})(), "{7}\n{8}" )

assert.equal((function(){
	var g = TestGraphs.findExample( "Extended confounding" );
        g.addLatentNode( "A" );
	return imp_2_str( GraphAnalyzer.listMinimalImplications( g ) );
})(), "" )

assert.equal((function(){
	var g = TestGraphs.findExample( "Sebastiani" );
	return imp_2_str( GraphAnalyzer.listMinimalImplications( g, 7 ) );
})(), "EDN1.3 _||_ SELP.22 | SELP.17, Stroke\n"+
	"EDN1.3 _||_ SELP.22 | ECE1.13, Stroke\n"+
	"EDN1.3 _||_ SELP.22 | ECE1.12, Stroke\n"+
	"EDN1.3 _||_ SELP.22 | ANXA2.8\n"+
	"EDN1.3 _||_ SELP.17 | ECE1.13\n"+
	"EDN1.3 _||_ SELP.17 | ECE1.12, Stroke\n"+
	"EDN1.3 _||_ SELP.17 | ANXA2.8" )

assert.equal((function(){
    // X -> I -> Y, I <- M -> Y, I -> A  = bias
	var g = $p("X E\nY O\nI 1\nJ A\nM 1\n\nX I\nI J Y\nM I Y")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "I J Y\nM I Y\nX I" )

assert.equal((function(){
    // X -> I -> Y, I <- M -> Y   = bias
	var g = $p("X E\nY O\nI A\nM 1\n\nX I\nI Y\nM I Y")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "M I Y\nX I" )

assert.equal((function(){
    // X -> I -> Y, I -> A   = bias
	var g = $p("X E\nY O\nI 1\nJ A\n\nX I\nI Y J")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "I J Y\nX I" )

assert.equal((function(){
    // A <- X -> Y   = no bias
	var g = $p("X E\nY O\nI A\n\nX Y\nX I")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "" )

assert.equal((function(){
    // X -> Y -> A   = bias
	var g = $p("X E\nY O\nI A\n\nX Y\nY I")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "X Y\nY I" )

assert.equal((function(){
    // X -> A -> Y   = no bias
	var g = $p("X E\nY O\nI A\n\nX I\nI Y")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "" )

assert.equal((function(){
	return GraphTransformer.activeBiasGraph(TestGraphs.felixadjust).toAdjacencyList()
})(), "s1 s2 z\ns2 s3\ns3 y\nx s1" )

assert.equal((function(){
	var g = $p("A E @1,1\nB O @3,1\nC 1 @2,1\n\nA B\nB C")
	return g.hasCompleteLayout()
})(), true )

assert.equal((function(){
	var g = $p("A E @1,1\nB O\nC 1 @1,1\n\nA B\nB C")
	return g.hasCompleteLayout()
})(), false )

assert.equal((function(){
	var g = $p("A E\nB O\nC 1\n\nA B\nB C");
	return g.hasCompleteLayout()
})(), false )

assert.equal((function(){
	var g = $p("A E\nB O\nC 1\n\nA B\nB C");
	g.deleteVertex(g.getVertex("A"));
	return g.getSources().length;
})(), 0 )

assert.equal((function(){
	var g = $p("D O\nD2 O\nE E\nE2 E\n\nD E\nD2 E2")
	//console.log(g.toString())
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "D E\nD2 E2" )

assert.equal((function(){
	var g = $p("ein A 1\n"+
"ein B 1\n"+
"\n"+
"ein A ein B");
	return g.oldToString();
})(), "ein%20A 1\nein%20B 1\n\nein%20A ein%20B" )

assert.equal((function(){
	var g = $p("A E\nB O\nE E\nZ\nU\n\nA U\nB Z\nZ E\nU Z");
	return sep_2_str( GraphAnalyzer.listMsasTotalEffect( g ) );
})(), "{U, Z}" )

assert.equal((function(){
	var g = $p("E E\nD O\nA 1\nB U\nZ 1\n\nA E Z\nB D Z\nZ E D\nE D");
	return GraphAnalyzer.directEffectEqualsTotalEffect( g )
})(), true )

assert.equal((function(){
	var g = $p("E E\nD O\nA 1\nB U\nZ 1\n\nA E Z\nB D Z\nZ D\nE D Z");
	return GraphAnalyzer.directEffectEqualsTotalEffect( g )
})(), false )

assert.equal((function(){
	var g = $p("E E\nD O\nA 1\nB U\nZ 1\n\nA E Z\nB D Z\nZ E D");
	return sep_2_str( GraphAnalyzer.listMsasTotalEffect( g ) );
})(), "{A, Z}" )

assert.equal((function(){
	var g = $p("E E\nD O\nA 1\nB U\nZ 1\n\nA E Z\nB D Z\nZ E D");
	return sep_2_str( GraphAnalyzer.listMinimalSeparators(GraphTransformer.moralGraph(g)) );
})(), "{A, Z}\n{B, Z}" )

assert.equal((function(){;
   var g = TestGraphs.small3();
   g.addAdjustedNode("p");
   var abg = GraphTransformer.activeBiasGraph(g);
   return GraphTransformer.edgeInducedSubgraph(g,abg.edges).toAdjacencyList()
})(), "" )

assert.equal((function(){
   var g = $p("E E @-1.897,0.342\n"+
"D O @-0.067,0.302\n"+
"g A @-0.889,1.191\n"+
"\n"+
"D g\n"+
"E D");
	return _.pluck(GraphAnalyzer.nodesThatViolateAdjustmentCriterion( g ),'id').join(",");
})(), "g" )

assert.equal((function(){
	var g = $p("X1 E\nX2 E\nY1 O\nY2 O\nU1 1\nU2 1\n\nU1 X1 X2\nU2 Y1 Y2")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "" )

assert.equal((function(){
	var g = $p("A E\nB O\nC O\nD A\n\nA B\nB C\nC D")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "A B\nB C\nC D" )

assert.equal((function(){
	var g = $p("A E\nB O\nC O\n\nA B\nB C")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "" )

assert.equal((function(){
	var g = $p("X1 E\nY1 O\nY2 O\nD A\n\nX1 Y1\nY1 Y2\nY2 D")
	return GraphAnalyzer.directEffectEqualsTotalEffect( g )
})(), true )

assert.equal((function(){
	var g = $p("X1 E\nY1 O\nY2 O\nD A\n\nX1 Y1\nY2 D")
	return GraphAnalyzer.directEffectEqualsTotalEffect( g )
})(), true )

assert.equal((function(){
	var g = $p("X1 E\nY1 O\nY2 O\nD A\n\nX1 Y1\nY1 Y2\nY2 D")
	return sep_2_str( GraphAnalyzer.listMsasDirectEffect( g ) )
})(), "" )

assert.equal((function(){
	var g = $p("X1 E\nY1 O\nY2 O\nD A\n\nX1 Y1\nY2 D")
	return sep_2_str( GraphAnalyzer.listMsasDirectEffect( g ) )
})(), "{D}" )

assert.equal((function(){
	var g = $p("X1 E\nY1 O\nY2 O\nD A\n\nX1 Y1\nY1 Y2\nY2 D")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "X1 Y1\nY1 Y2\nY2 D" )

assert.equal((function(){
	var g = $p("X1 E\nY1 O\nY2 O\nD A\n\nX1 Y1\nY2 D")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "" )

assert.equal((function(){
	var g = $p("X1 E\nX2 E\nY1 O\nY2 O\n\nX1 Y1 X2\nY2 X2")
	//console.log(g.toString())
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "Y2 X2" )

assert.equal((function(){
	var g = $p("X1 E\nX2 E\n\nX1 X2")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "" )

assert.equal((function(){
	var g = $p("X1 E\nX2 E\nY1 O\nY2 O\n\nX1 Y1 X2\nX2 Y2")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "" )

assert.equal((function(){
	var g = $p("X1 E\nX2 E\nY1 O\nY2 O\n\nX1 Y1 X2\nX2 Y2")
	return _.pluck(
			_.difference(GraphAnalyzer.properPossibleCausalPaths(g),g.getSources()),
			"id").sort().join(",")
})(), "Y1,Y2" )


assert.equal((function(){
    // X -> I -> Y,  I -> A, adjust I  = no bias
	var g = $p("X E\nY O\nI A\nJ A\n\nX I\nI J Y")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "" )

assert.equal((function(){
    // X -> I -> Y, I <- M -> Y, I -> A, adjust M, I  = no bias
	var g = $p("X E\nY O\nI A\nJ A\nM A\n\nX I\nI J Y\nM I Y")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "" )

assert.equal((function(){
    // X -> I -> Y, I <- M -> Y, I -> A, adjust M = bias
	var g = $p("X E\nY O\nI 1\nJ A\nM A\n\nX I\nI J Y\nM I Y")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "I J Y\nX I" )


assert.equal((function(){
	var g = TestGraphs.findExample( "Shrier" )
	var r = ""
	var v1,v2,vv=g.getVertices()
	for( var i = 0 ; i < vv.length ; i ++ ){
		for( var j = 0 ; j < vv.length ; j ++ ){
			var c = GraphAnalyzer.minVertexCut( g, [vv[i]], [vv[j]] )
			if( c > 0 ) r += vv[i].id + " " + vv[j].id + " " + c + "\n"
		}
	}
	return r
})(), "WarmUpExercises Injury 1\nCoach WarmUpExercises 2\nCoach Injury 2\nCoach PreGameProprioception 1\nCoach PreviousInjury 1\nCoach IntraGameProprioception 2\nCoach NeuromuscularFatigue 1\nGenetics WarmUpExercises 1\nGenetics Injury 3\nGenetics PreGameProprioception 1\nGenetics TissueWeakness 1\nGenetics IntraGameProprioception 2\nTeamMotivation Injury 1\nTeamMotivation IntraGameProprioception 1\nPreGameProprioception Injury 1\nPreGameProprioception IntraGameProprioception 1\nConnectiveTissueDisorder Injury 2\nConnectiveTissueDisorder IntraGameProprioception 1\nContactSport Injury 1\nFitnessLevel WarmUpExercises 1\nFitnessLevel Injury 2\nFitnessLevel IntraGameProprioception 2\n" )

assert.equal((function(){
	var g = $p("X E\nY O\nM 1\nN A\n\nX M\nM N Y")
	return GraphTransformer.flowNetwork(g).graph.toAdjacencyList()
})(), "M N X Y\nN M\nX M __SRC\nY M __SNK\n__SNK Y\n__SRC X" )

assert.equal((function(){
	var g = $p("X E\nY O\nM 1\nN A\n\nX M\nM N Y")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "M N Y\nX M" )

assert.equal((function(){
	var g = $p("X E\nY O\nM 1\nN A\n\nX M\nM N\nY M")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "X M\nY M" )

assert.equal((function(){
	// our non-X-ancestor MSAS example from the UAI paper w/o causal edge
	var g = $p("X1 E\nX2 E\nY O\nM1 1\nM2 A\n\nX1 M1\nY M2\nM1 M2\nM2 X2")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "M1 M2\nX1 M1\nY M2" )

assert.equal((function(){
	var g = $p("X E\nY O\nM 1\n\nY M\nM X")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "M X\nY M" )

assert.equal((function(){
	var g = $p("X E\nY O\n\nY X")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "Y X" )

assert.equal((function(){
	// our non-X-ancestor MSAS example from the UAI paper w/o causal edge
	var g = $p("X1 E\nX2 E\nY O\nM1 1\nM2 1\n\nX1 M1\nY M2\nM1 M2\nM2 X2")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "M2 X2\nY M2" )

assert.equal((function(){
	var g = $p("X1 E\nY1 O\nY2 O\nM 1\n\nY1 M\nM Y2")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "" )

assert.equal((function(){
	var g = $p("X1 E\nX2 E\nY1 O\nY2 O\nU1 1\nU2 1\n\nX1 U1\nU1 X2\nY1 U2\nU2 Y2")
	return GraphTransformer.activeBiasGraph(g).toAdjacencyList()
})(), "" )


assert.equal((function(){
	var g = TestGraphs.findExample( "Thoemmes" )
	return GraphAnalyzer.minVertexCut( g, 
		[g.getVertex("e0"),g.getVertex("s2")],
		[g.getVertex("y")] ) 
})(), 2 )

assert.equal((function(){
	var g = $p("a 1\nb 1\nc 1\nd 1\ne 1\nm 1\nn 1\np 1\nu 1\nx E\ny O\n\n"
		+"a b\nb u\nc u n\nd e\ne c\nm a\nn p\np y\nu y\nx c d m")
	return GraphAnalyzer.minVertexCut( g, [g.getVertex("x")], [g.getVertex("y")] ) 
})(), 2 )

assert.equal((function(){
	var g = TestGraphs.findExample( "Confounding" )
	var r = ""
	var v1,v2,vv=g.getVertices()
	for( var i = 0 ; i < vv.length ; i ++ ){
		for( var j = 0 ; j < vv.length ; j ++ ){
			var c = GraphAnalyzer.minVertexCut( g, [vv[i]], [vv[j]] )
			if( c > 0 ) r += vv[i].id + " " + vv[j].id + " " + c + "\n"
		}
	}
	return r
})(), "A D 2\nB E 1\n" )

assert.equal((function(){
	var g = $p( 
		"digraph G { y -> m \n m -> x }"
	).addSource("x").addTarget("y")
	return $es(GraphTransformer.activeBiasGraph(g))
})(), "m -> x\ny -> m" )

assert.equal((function(){
	var g = $p( 
		"digraph G { x [exposure]\ny [outcome]\na [adjusted]\n"+
		"x -> a\nu -> x\nu -> y }" )
	return $es(GraphTransformer.activeBiasGraph(g))
})(), "u -> x\nu -> y" )

assert.equal((function(){
	var g = $p( 
		"digraph G { x [exposure]\ny [outcome]\na [adjusted]\n b [adjusted]\n"+
		"x -> a\nx -> b\nb -> a\ny -> b }" )
	return $es(GraphTransformer.activeBiasGraph(g))
})(), "x -> b\ny -> b" )

assert.equal((function(){
    var g = $p( 
		"digraph G { x [exposure]\ny [outcome]\nm [adjusted]\nx -> m\ny -> m }" )
	g = GraphTransformer.canonicalDag( g ).g
	g = GraphTransformer.ancestorGraph( g )
 	return ""+$es(g)
})(), "x -> m\ny -> m" )

assert.equal((function(){
    var g = $p( 
		"digraph G { x [exposure]\ny [outcome]\nm [adjusted]\nx -> m\ny -> m }" )
 	return $es(GraphTransformer.ancestorGraph(g))
})(), "x -> m\ny -> m" )

assert.equal((function(){
    var g = $p( 
		"digraph G { b [exposure]\nc [outcome]\na [adjusted]\na -- b\na -- c }" )
 	return GraphAnalyzer.connectedComponents(g).length
})(), 1 )

assert.equal((function(){
    var g = $p( 
		"digraph G {a -- b }" )
 	return GraphAnalyzer.connectedComponents(g).length
})(), 1 )

assert.equal((function(){
    var g = $p( 
		"digraph G {a [exposure]\nb [outcome]\nc [adjusted]\na -> c\nb -> c }" )
 	return $es(GraphTransformer.activeBiasGraph(g))
})(), "a -> c\nb -> c" )

assert.equal((function(){
    var g = $p( 
		"digraph G {a [exposure]\nb [outcome]\nc [adjusted]\na -> b\nb -> c }" )
 	return $es(GraphTransformer.activeBiasGraph(g))
})(), "a -> b\nb -> c" )

assert.equal((function(){
   var g = TestGraphs.findExample("Acid")
 	return $es(GraphTransformer.activeBiasGraph(g))
})(), "x1 -> x3\nx1 -> x4\nx10 -> x15\nx4 -> x5\nx5 -> x7\nx7 -> x9\nx9 -> x10" )

assert.equal((function(){
    var g = $p( 
		"digraph G { a [exposure] \n b [outcome] \n a <-> c \n c -> b }" )
	return $es(GraphTransformer.canonicalDag(g).g)
})(), "L1 -> a\nL1 -> c\nc -> b" )

assert.equal((function(){
    var g = $p( 
		"digraph G { a [exposure] \n b [outcome] \n a <-> c \n c -> b }" )
	return $es(GraphTransformer.activeBiasGraph(g))	
})(), "a <-> c\nc -> b" )

assert.equal((function(){
    var g = $p( "digraph G { a -- b }" )
    var ids = _.pluck(GraphAnalyzer.connectedComponentAvoiding( g, [g.getVertex("a")] )
    	,"id")
    ids=ids.sort(); return ids.join(" ")
})(), "a b" )

assert.equal((function(){
	var g = $p( 
		"digraph G { x [source] \n y [outcome] \n a [adjusted] \n "
		+"a -> x \n b -> a \n b -> y }"
	)
	return $es(GraphTransformer.activeBiasGraph(g))
})(), "" )


assert.equal( _.pluck(GraphAnalyzer.dpcp(
	$p( "digraph{ x [exposure]\n y [outcome]\n x -> y -- z }" ) ),"id").
		sort().join(","),
	"y,z" )

assert.equal( _.pluck(GraphAnalyzer.dpcp(
	$p( "digraph{ x [exposure]\n y [outcome]\n x -- y -- z }" ) ),"id").
		sort().join(","),
	"x,y,z" )


}); // end uncategorized tests

