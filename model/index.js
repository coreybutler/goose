/**
 * @author Corey Butler
 * @description MongoDB Schema Management. Supports replica sets, auto-connect,
 * debugging mode, detailed errors, & connection timeouts.
 * 
 * TODO: Add a logging feature. 
 */
var EventEmitter 	= require('events').EventEmitter,
	mongoose		= require('mongoose');



//Exports
module.exports = exports = Database;



/**
 * @param {Object} config Configuration object. Typically used to identify connection parameters.
 * @property {Boolean} ignoreAlreadyConnected Ignore errors and use the current connection if it is already connected. Defaults to false.
 * @property {Boolean} debug Debugging flag. Output is delivered to the console.
 * @property {String} username MongoDB connection username.
 * @property {String} password MongoDB connection password.
 * @property {Object} Schema The raw mongoose schema object.
 * @property {Object} connection The raw mongoose connection object.
 * @property {Boolean} connected Indicates whether a connection is established.
 * @property {Object} data Schema or collection container. This contains all of the data object definitions in the model directory which are included dynamically at runtime.
 * @property {Number} port The port number used in the MongoDB connection. Defaults to 27017.
 * @property {String} protocol The protocol/prefix used to connect (mongodb://).
 * @property {Number} timeout The number of seconds before a connection times out when attempting to connect. Defaults to 3.
 * @property {Boolean} timedout Indicates the connection has timed out.
 * @property {Boolean} autoConnect This is a configuration attribute carried through to help preserve preference. It indicates whether the connection should be automatically attempted without explicitly calling the connect method. 
 * has been established.
 * @property {Object} server The host server(s) used to connect to an instance or replica set.
 * @property {Boolean} redundant Indicates the instance is redundant.
 * @property {String} store The MongoDB store/database.
 * @property {String} connectString The connection string used to connect to the MongoDB instance. 
 */
function Database ( config ) {

	this.ignoreAlreadyConnected = config.ignoreAlreadyConnected || false;
	this.debug					= config.debug			|| false;
	this.username				= config.username		|| '';
	this.password				= config.password		|| '';
	this.Schema					= mongoose.Schema;
	this.connection				= mongoose.connection;
	this.connection.parent		= this;
	this.connected				= false;
	this.connecting				= false;
	this.data					= config.model			|| {};
	this.port					= config.port			|| 27017;
	this.protocol				= config.protocol		|| 'mongodb://';
	this.timeout				= config.timeout*1000	|| 3000;
	this.timedout				= false;
	this.autoConnect			= config.autoConnect	!== undefined 
															? config.autoConnect
															: true;
	this.server					= typeof config.server  === 'string'
															? config.server.split(',')
															: ( typeof config.server === 'object'
																? config.server
																: Array
														);
	this.redundant				= this.server.length > 1;
	this.store					= config.store 			|| null;
	this.connectString			= config.connectString	|| null;
	
	

	//Check for errors with connection string
	if ( config.connectString === null ){
		
		if ( this.server.length == 0 )
			throw new DatabaseError({
				type: 	'Configuration',
				name: 	'Invalid Parameter: Server',
				message:'The server address (domain or IP) is null.'
			});
			
		if ( this.store === null )
			throw new DatabaseError({
				type: 	'Configuration',
				name: 	'Invalid Parameter: Store',
				message:'The store (table or collection name) is null.'
			});
	}
	
	
	
	//Connection listeners
	this.connection.on('open', function(){
		if (this.parent.debug)
			console.log('Database connection opened.');
		this.parent.connecting = false;
		this.parent.connected = true;
		this.parent.initializeSchemas();
	});
	
	this.connection.on('close', function(){
		if (this.parent.debug)
			console.log('Database connection closed.');
		this.parent.connected = false;
		this.parent.connecting = false;
		this.emit('disconnect');
	});
	
	this.connection.on('timeout', function(){
		if (!this.parent.connected) {
			if (this.parent.debug)
				console.log('Database connection timed out.');
			this.parent.connected = false;
			this.parent.connecting = false;
			this.parent.emit('timeout');
			throw DatabaseConnectionTimeoutError;
		} else
			console.log('False negative: Database connection not timed out.'.red);
	});
	
	this.connection.on('initialized', function(){
		if (this.parent.debug)
			console.log('Database connection ready to accept commands.'.toUpperCase().cyan);
		this.parent.ready = true;
		this.parent.emit('ready');
	});
	
	//Autoconnect
	if ( this.autoConnect ) {
		if (this.debug)
			console.log('\nAttempting to auto-connect to database.');
		this.connect();
	}

};


//Inherit EventEmitter
Database.prototype.__proto__ = EventEmitter.prototype;



//Database Timeout (seconds)
Database.prototype.setTimeout = function( seconds ) {
	this.timeout = seconds * 1000;
}



//Create connection string
//Assumes the first server in the array is the primary.
Database.prototype.setConnectionString = function( serverIndex ) {
	
	var cs = [];
	
	for ( var i = 0; i < this.server.length; i++ )
		cs.push( this.protocol
				+ (this.username.trim().length > 0 && this.password.trim().length > 0
					? this.username.trim()+':'+this.password.trim()+'@'
					: ''
					) 
			 	+ this.server[i].trim()
			 	+ ( this.port!==null 
					? ':' + this.port 
					: '' )
				+ '/' + this.store.trim()
			);
	
			
	this.connectString = cs.join();
	
	if (this.debug)
		console.log('Database connection string set to '.cyan+' '+this.connectString.yellow);
};



//Add connection functionality
Database.prototype.connect = function(callback) {
	
	if ( this.connected  &&  !this.ignoreAlreadyConnected )
		throw new DatabaseConnectionError({
			message:'Already connected.'
		});
		
	this.connecting = true;
	
	try {

		//Connect to the DB
		this.setConnectionString();
		if ( this.server.length == 1 )
			mongoose.connect( this.connectString );
		else
			mongoose.connectSet( this.connectString );
		
	} catch (e) {
		if (this.debug)
			console.log(e);
	throw e;
		throw new DatabaseConnectionError;
		
	}
	
};



//Initialize the data schemas
Database.prototype.initializeSchemas = function() {
	
	if (this.debug)
		console.log('\nInitializing data models'.toUpperCase().underline);

	if ( !this.connected )
		throw new DatabaseConnectionError;

	var incomplete	= new Array,
		retry		= new Array,
		max			= 1000,
		tryCt		= 0;
		
	//Create a list of all the schemas
	for ( var schema in SchemaModel ) {
		
		//Make sure the object has the defined property
		if ( SchemaModel.hasOwnProperty( schema ) )
			incomplete.push( schema );
	}
	
	//Loop through the schemas and implement them.
	while ( incomplete.length > 0  &&  tryCt <= max  ||  retry.length > 0 ) {
	
		if ( incomplete.length == 0 ) {
			incomplete 	= retry;
			retry		= [];
		}
	
		tryCt++;
		try {
			
			if (this.debug)
				console.log('>> Registering '.green+incomplete[0].green.underline);
			
			//Register the data model
			mongoose.model( incomplete[0], SchemaModel[incomplete[0]] );
			
			//Get the registered schema for application use
			this.Collections[incomplete[0]] = mongoose.model( incomplete[0] );
		
			//Remove the model once it's complete
			incomplete.shift();
			
		} catch (e) {
			
			if (this.debug)
				console.log('Failed to load '.yellow+incomplete[0].yellow+': Likely caused by a dependency. Will retry.');
			
			retry.push( incomplete[0] );
			incomplete.shift();
			
		}
	
	}
	
	if ( tryCt > max )
		throw new DatabaseModelError;
	
	if (this.debug)
		console.log('Model registration complete.\n'.green);	
	this.connection.emit('initialized');
};


//Disconnect the DB
Database.prototype.disconnect = function() { 
	if (this.debug)
		console.log('Disconnecting from database.'.yellow.underline);
	try {
		mongoose.disconnect();
	} catch (e) {
		throw new DatabaseConnectionError;
	}
	
	
};


//Get or Register a Schema model
Database.prototype.model = function( name, schema ) {
	
	if ( typeof schema === 'string' ) {
		if (this.debug)
			console.log('Registering '.green.underline+' '+name.cyan+' model'.green);
		mongoose.model( name, schema );
	} else {
		if (this.debug)
			console.log('Retrieving'.cyan.underline+' '+name.cyan.underline+' model'.cyan);
		return mongoose.model( name );
	}
	
};

//Standard Exception
function DatabaseError( config ) {
	//TODO: Log the error
	this.type		= config.type		|| 'General';
	this.name 		= config.name 		|| 'Error';
	this.message	= config.message 	|| 'Unknown Exception.';
	this.detail		= config.detail		|| '';
	this.timestamp	= config.timestamp	|| Date.now;
};

DatabaseError.prototype = Error.prototype;


//Standard Connection Exception
function DatabaseConnectionError() {
	return new DatabaseError({
		type:		'Connection',
		name:		'Connection',
		message:	'Connection Failure. Please see the logs for detail.',
		detail:		null
	});
};

DatabaseConnectionError.prototype = DatabaseError.prototype;



//Standard Connection Timeout Exception
function DatabaseConnectionTimeoutError() {
	return new DatabaseError({
		type:		'Connection',
		name:		'Timeout',
		message:	'Connection Failure. The connection could not be established in the alotted time. Please see the logs for detail.',
		detail:		'The connection timedout.'
	});
};

DatabaseConnectionTimeoutError.prototype = DatabaseError.prototype;

//Model Exception
function DatabaseModelError( config ) {
	return new DatabaseError({
		type:		'Model',
		name:		config.name 	|| 'Schema Exception',
		message:	config.message 	|| 'Please see the logs for detail.',
		detail:		config.detail 	|| null
	});
};

DatabaseModelError.prototype = DatabaseError.prototype;









/**
 * This is a dynamic loader that includes all of the data model objects.
 */
var files 	= require('fs').readdirSync( __dirname );

files.forEach( function( file ) {

	//Convert filename to array
	a = file.split('.');

	//Export the schema object
	if ( file !== 'index.js' && a[a.length-1].toLowerCase() === 'js' )
		exports[a[0]] = require( './' + file )[a[0]];

});