var sys				= require('sys'),
	MDB				= require('./model'),
	cfg				= {
							server:		'localhost',
							port:		27017,
							database:	'myDataStore',
							username:	'user',
							password:	'xxxxxxxx'
					},

	database 		= new MDB({
						server: config.server,
						port:	config.port,
						store:	config.database,
						username: config.username || '',
						password: config.password || '',
						debug:true,
						autoConnect: true
					});

//Dump all posts to the console
//The database object contains an object called Collections where all schemas are stored.
database.Collections.BlogPost.find({}, function( err, docs ) {
	if ( err ) throw err;
	sys.puts(sys.inspect(docs));
});