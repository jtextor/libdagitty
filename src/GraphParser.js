/** 
    This namespace contains functions that parse a graph structure from text.
    Three different formats are supported, but two of them for legacy reasons
    only. The most modern format is a dot-like format, in which a graph looks
    something like this:

    graph {
	X [exposure]
	X [outcome]
	X <- A -> M <- B -> Y
	X -> Y
	X <- M -> Y
	A <-> B
    }
*/

/* jshint undef: true, unused: true, asi: true */
/* globals Graph,GraphAnalyzer,GraphDotParser,_ */
/* exported GraphParser */

const _ = require("underscore")
const Graph = require("./Graph.js")
const GraphAnalyzer = require("./GraphAnalyzer.js")
const GraphDotParser = require("./GraphDotParser.js")

var GraphParser = {
	VALIDATE_GRAPH_STRUCTURE : false,
	
	parseDot : function( code, g ){
		"use strict"
		code = code.trim()
		var isdot = code.trim().match(  /^(digraph|graph|dag|pdag|mag|pag)(\s+\w+)?\s*\{([\s\S]*)\}$/mi )
		if( !isdot || (isdot.length <= 1) ){
			code = "dag{ " + code + "}"
		}
		var ast = GraphDotParser.parse( code )
		if( typeof g === "undefined" ){
			g = new Graph()
		}
		this.parseDotStatementArray( ast.statements, g )
		g.setType( ast.type )
		if( ast.name ){ g.setName( ast.name ) }	
		if( this.VALIDATE_GRAPH_STRUCTURE ){
			if( !GraphAnalyzer.validate( g ) ){
				throw("invalid graph : ",g.toString() )
			}
		}
		return g	
	},

	parseDotStatementArray : function( statements, g ){
		var vsub = new Graph() // holds the vertices of this subgraph

		var v = function(id){ 
			if( id == "graph" || id == "node" ){
				throw("Syntax error: variables cannot be named 'graph' or 'node'. "+
					"Use the 'label' attribute instead.")
			}
			vsub.getVertex( id ) || vsub.addVertex( id )
			return( g.getVertex( id ) || g.addVertex( id ) ) 
		}
		var i,j,n,n2,e,pos,bb
		var positionre = new RegExp( "\\s*(-?[0-9.]+)\\s*,\\s*(-?[0-9.]+)\\s*" )
		var parse_position = function( s ){
			var tok = s.match(positionre)
			if( typeof tok[1] !== "string" || 
				typeof tok[2] !== "string" ){
				throw("Syntax error in \"pos\" option!")
			}
			return {x:parseFloat(tok[1]),y:parseFloat(tok[2])}
		}
		var bbre = new RegExp( "\\s*(-?[0-9.]+)\\s*,\\s*(-?[0-9.]+)\\s*,\\s*(-?[0-9.]+)\\s*,\\s*(-?[0-9.]+)\\s*" )
		var parse_bb = function( s ){
			var tok = s.match(bbre)
			tok.shift()
			if( _.any( tok, function(t){ return typeof t !== "string" } ) ){
				throw("Syntax error in \"bb\" option!")
			}
			return _.map( tok, parseFloat )
		}
		var recurse = function( sa ){
			var vsubnew = GraphParser.parseDotStatementArray( sa, g )
			_.each( vsubnew, function(v){
				vsub.getVertex(v.id) || vsub.addVertex( v.id )
			})
			return vsubnew
		}
		_.each( statements, function(s) {
			if( s.type == "node" && s.id == "graph" ){
				for( i = 0 ; i < s.attributes.length ; i ++ ){
					switch( s.attributes[i][0] ){
					case "bb":
						bb = parse_bb( s.attributes[i][1] )
						g.setBoundingBox( bb )
					}
				}
			} else if( s.type == "subgraph" ){
				recurse(s.statements)
			} else if( s.type == "node" ){
				n = v(s.id)
				for( i = 0 ; i < s.attributes.length ; i ++ ){
					switch( s.attributes[i][0] ){
					case "latent":
					case "l":
					case "unobserved":
					case "u":
						g.addLatentNode( n )
						break
					case "source":
					case "exposure":
					case "e":
						g.addSource( n )
						break
					case "target":
					case "outcome":
					case "o":
						g.addTarget( n )
						break
					case "adjusted":
					case "a":
						g.addAdjustedNode( n )
						break
					case "selected":
					case "s":
						g.addSelectedNode( n )
						break
					case "pos":
						pos = parse_position( s.attributes[i][1] )
						n.layout_pos_x = parseFloat( pos.x )
						n.layout_pos_y = parseFloat( pos.y )
						break
					case "label":
						n.label = s.attributes[i][1]
						break
					default:
						if( !n.attributes ){
							n.attributes={}
						}
						n.attributes[s.attributes[i][0]]=s.attributes[i][1]
						break
					}
				}
			} else if( s.type == "edge" ){
				for( i = 3; i <= s.content.length ; i += 2 ){
					if( typeof(s.content[i-3]) === "string" ){
						n = [v(s.content[i-3])]
					} else {
						n = recurse(s.content[i-3].statements)
					}
					if( typeof(s.content[i-1]) === "string" ){
						n2 = [v(s.content[i-1])]
					} else {
						n2 = recurse(s.content[i-1].statements)
					}

					_.each( n, function(n){
						_.each( n2, function(n2){
							switch( s.content[i-2] ){

							case "@-@" :
								e = g.addEdge( n, n2, Graph.Edgetype.Unspecified )
								break

							case "--" :
								e = g.addEdge( n, n2, Graph.Edgetype.Undirected )
								break

							case "<->" :
								e = g.addEdge( n, n2, Graph.Edgetype.Bidirected )
								break

							case "->" :
								e = g.addEdge( n, n2, Graph.Edgetype.Directed )
								break
							case "<-" :
								e = g.addEdge( n2, n, Graph.Edgetype.Directed )
								break

							case "@->" : 
								e = g.addEdge( n, n2, Graph.Edgetype.PartDirected )
								break
							case "<-@" : 
								e = g.addEdge( n2, n, Graph.Edgetype.PartDirected )
								break

							case "@--" : 
								e = g.addEdge( n, n2, Graph.Edgetype.PartUndirected )
								break
							case "--@" : 
								e = g.addEdge( n2, n, Graph.Edgetype.PartUndirected )
								break


							}
						})
					})

					for( j = 0 ; j < s.attributes.length ; j ++ ){
						switch( s.attributes[j][0] ){
						case "pos":
							pos = parse_position( s.attributes[j][1] )
							e.layout_pos_x = parseFloat( pos.x )
							e.layout_pos_y = parseFloat( pos.y )
							break
						case "label":
							e.id = s.attributes[j][1]
							break
						default:
							if( !e.attributes ){
								e.attributes = {}
							}
							e.attributes[s.attributes[j][0]]=s.attributes[j][1]
						}
					}
				}
			}
		} )
		return _.map( vsub.getVertices(), function(v){ return g.getVertex( v ) } )
	},
	
	parseVertexLabelsAndWeights : function( vertexLabelsAndWeights ){
		"use strict"
		var g = new Graph()
		var txt = vertexLabelsAndWeights.trim()
		var lines = txt.split(/\n/)
		var i,weight,posn
		for( i = 0 ; i < lines.length ; i ++ ){
			var l = lines[i]
			var a = l.trim().split(/\s+/)
			lines[i]=[]
			if( a.length >= 2 && l.indexOf("@") >= 0 ){
				lines[i][2]=a.pop()
				lines[i][1]=a.pop()
				lines[i][0]=a.join(" ")
			} 
			else if( a.length >= 2 ){
				lines[i][1]=a.pop()
				lines[i][0]=a.join(" ")
			}
			else if( a.length == 1 ){
				lines[i][1]="1"
				lines[i][0]=a.pop()
			}
		}
		for( i = 0 ; i<lines.length ; i ++ ){
			var vid = decodeURIComponent(lines[i][0])
			var props = lines[i][1]
			// TODO weights do not currently mean anything!
			weight = parseInt(props,10)||1
			g.addVertex( new Graph.Vertex( 
				{ id : vid, weight : weight } ) )
			if( props.indexOf("E")>=0 ){
				g.addSource( vid )
			}
			if( props.indexOf("O")>=0 ){
				g.addTarget( vid )
			}
			if( props.indexOf("A")>=0 ){
				g.addAdjustedNode( vid )
			}
			if( props.indexOf("U")>=0 ){
				g.addLatentNode( vid )
			}
			if( lines[i].length == 3 ){
				posn = lines[i][2].substring(1).split(",")
				g.getVertex( vid ).layout_pos_x = parseFloat(posn[0])
				g.getVertex( vid ).layout_pos_y = parseFloat(posn[1])
			}
		}
		g.setType("dag")
		return g
	},
  
	parseAdjacencyList : function( adjacencyList, vertexLabelsAndWeights ){
		"use strict"
		var g = this.parseVertexLabelsAndWeights( vertexLabelsAndWeights )
		var adj_list = adjacencyList.split("\n")
		var i,adj,v1, v1id, v2,v2id
		for( i = 0 ; i < adj_list.length ; i ++ ){
			adj = adj_list[i].trim().split(/\s+/)
			v1 = false; v1id = ""
			while( adj.length > 0 && !v1 ){
				v1id += adj.shift()
				v1 = g.getVertex( decodeURIComponent(v1id) )
				v1id += " "
			}
			while( adj.length > 0 ){
				v2 = false; v2id = ""
				while( adj.length > 0 && !v2 ){
					v2id += adj.shift()
					v2 = g.getVertex( decodeURIComponent(v2id) )
					v2id += " "
				}
				if( v2 ){
					var eold = g.getEdge( v2, v1, Graph.Edgetype.Directed )
					if( eold ){
						g.deleteEdge( v2, v1, Graph.Edgetype.Directed )
						var enew = g.addEdge( v1, v2, Graph.Edgetype.Bidirected )
						if( eold.layout_pos_x && !enew.layout_pos_x ){
							enew.layout_pos_x = eold.layout_pos_x
							enew.layout_pos_y = eold.layout_pos_y
						}
					} else {
						g.addEdge( v1, v2 )
					}
					if( adj.length > 0 && adj[0].charAt(0) == "@" ){
						var e = g.getEdge( v1, v2 )
						var coord_a = adj.shift().substring(1).split(",")
						if( coord_a.length >= 2 ){
							e.layout_pos_x = parseFloat( coord_a[0] )
							e.layout_pos_y = parseFloat( coord_a[1] )
						}
					}
				}
			}
		}
		if( this.VALIDATE_GRAPH_STRUCTURE ){
			if( !GraphAnalyzer.validate( g ) ){
				throw("invalid graph : ",g.toString() )
			}
		}
		return g
	},

	parseAdjacencyMatrix : function( adjacencyMatrix, vertexLabelsAndWeights ){
		"use strict"
		var g = this.parseVertexLabelsAndWeights( vertexLabelsAndWeights )

		var m = adjacencyMatrix.trim()
		var m_arr = m.split(/\s+/)
		var n = Math.sqrt( m.split(/\s+/).length )
		var l, l_arr, i, j

		if( parseInt( n, 10 ) !== n || n !== g.getNumberOfVertices()){
			throw( "Error loading data: Adjacency matrix is not square or does not match number of vertices: "+n+" , " +g.getNumberOfVertices() )
		}

		l = vertexLabelsAndWeights.trim()
		l_arr = l.split("\n")
		for( i = 0 ; i < l_arr.length ; i++ ){
			l_arr[i] = l_arr[i].trim().split(/\s+/)
		}

		for( i = 0 ; i <n ; i ++ ){
			for( j = 0 ; j <n ; j ++ ){
				if( parseInt( m_arr[i*n+j], 10 ) > 0 ){
					g.addEdge( l_arr[i][0], l_arr[j][0] )
				}
			}
		}
		if( this.VALIDATE_GRAPH_STRUCTURE ){
			if( !GraphAnalyzer.validate( g ) ){
				throw("invalid graph : ",g.toString() )
			}
		}
		g.setType( "dag" )
		return g
	},

	parseGuess : function( adjacencyListOrMatrix, vertexLabelsAndWeights ){
		"use strict"
		var first_blank, firstarg = adjacencyListOrMatrix.trim()
		if( !vertexLabelsAndWeights ){
			first_blank = adjacencyListOrMatrix.search( /\r?\n[ \t]*\r?\n/ )
			vertexLabelsAndWeights = adjacencyListOrMatrix.substr( 0, first_blank ).trim()
			adjacencyListOrMatrix = adjacencyListOrMatrix.substr( first_blank ).trim()
		}
		if( adjacencyListOrMatrix.match( /^[\s01]+$/ ) !== null ){
			return this.parseAdjacencyMatrix( adjacencyListOrMatrix, vertexLabelsAndWeights )
		} else {
			// [\s\S] is like . but also matches newline
			var isdot = firstarg.match(  /^(digraph|graph|dag|pdag|mag|pag)(\s+\w+)?\s*\{([\s\S]*)\}$/mi )
			if( isdot && isdot.length > 1 ){
				return this.parseDot( firstarg )
			} else {
				var hasarrow = firstarg.match( /(->|<->|<-)/mi )
				// allow users to omit explicit "dag{ ... }" if at least one arrow is also specified
				if( hasarrow  && hasarrow.length >= 1  ){
					return this.parseDot( firstarg )
				} else {
					return this.parseAdjacencyList( adjacencyListOrMatrix, vertexLabelsAndWeights )
				}
			}
		}
	}
}

module.exports = GraphParser
