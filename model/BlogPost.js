var Schema 			= require('mongoose').Schema,
	Comment			= require('./Comment');

/**
 * Represents a post.
 * @name BlogPost
 * @version 0.1
 * @class BlogPost
 * @requires mongoose
 * @augments Schema
 */
exports.BlogPost = BlogPost = new Schema({

	author    : ObjectId,
	title     : String,
	body      : String,
	buf       : Buffer,
	date      : Date,
	comments  : [Comment],
	meta      : {
					votes : Number,
					favs  : Number
			  }
});
