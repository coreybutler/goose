# What is MDB?

MDB is a simple organizational approach for managing MongoDB schemas in a NodeJS/Mongoose environment. There's nothing
terribly fancy, just a file structure for maintaining schemas in a logical way. Please note this is not an npm package.
This is an approach. It is not necessarily perfect, but it works. Contributions are always welcome. 
I may consider making a package for this later if there is interest.

# Why?

Mongoose is a great tool for working with MongoDB in NodeJS applications, but when you first start using Mongoose, it's
easy to start writing multiple schemas into one large file. Breaking schemas out into individual files helps visualize
the entire data store in a friendlier manner.

This approach also helps with a few things such as using replica sets, creating standard database errors (which could easily log details).

# When to use it?

Though the examples here are trivial, this was designed for use in Mongo data stores that have a moderate number of schemas
in them. I've found this most useful in creating API services, especially when database connections need to remain open consistently.

# How should I use it?

If you're already familiar with Mongoose, using MDB is pretty straightforward. Though trivial, the blog post data store
schemas make for a familiar example. First, it's important to note the file structure. The mdb directory contains two files
and a schema directory. Each schema gets its own file. In the stock example, two files exist: BlogPost.js and Comments.js.

MDB automatically opens a connection and registers all schema models in the schema directory. This allows you to quickly
create queries or save new objects in your data store.

	var	sys			= require('sys'),
	MDB				= require('./model'),

	database 		= new MDB({
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
	database.Collections.BlogPost.find({}, function( err, docs ) {
		if ( err ) throw err;
		sys.puts(sys.inspect(docs));
	});

There are several options you can use, and the source code is pretty small. Take a look at it.

# Where to go from here?

If you use this, let me know. This is just an approach I came up with while working on projects.
I kept forgetting about schemas, recreating them, or simply keeping a reference of which schemas I was using. This made it
simple... open a directory and see which schemas exist. I haven't really looked into the efficiency of this approach, but 
I know there are some areas for improvement. However; for most purposes, I have found this to be an easy way to organize
my schemas. It's a little reminiscent of a SQL IDE showing a simple list of tables. 