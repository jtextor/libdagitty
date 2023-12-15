
/* Simple Hash implementation. */

function Hash(){
	this.kv = {}
}

Object.assign( Hash.prototype, {
	contains : function( key ){
		return this.kv.hasOwnProperty( key )
	},
	get : function( key ){
		return this.kv[key]
	},
	set : function( key, value ){
		this.kv[key] = value
	},
	unset : function( key ){
		delete this.kv[key]
	},
	values : function(){
		return Object.values( this.kv )
	},
	keys : function(){
		return Object.keys( this.kv )
	},
	size : function(){
		return Object.keys( this.kv ).length
	}
} )

module.exports=Hash
