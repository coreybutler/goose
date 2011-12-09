var	sys				= require('util'),
	Goose			= require('./model'),

	database 		= new Goose({
						server:		'127.0.0.1',
						port:		27017,
						store:		'myDataStore',
						username:	'username' || '',
						password:	'password' || '',
						debug:		true,
						autoConnect:true
					});

//Dump all posts to the console
//The database object contains an object called Collections where all schemas are stored.
database.data.BlogPost.find({}, function( err, docs ) {
	if ( err ) throw err;
	sys.puts(sys.inspect(docs));
});