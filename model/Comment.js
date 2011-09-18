var Schema 			= require('mongoose').Schema;

/**
 * Represents a blog post comment
 * @name Comment
 * @version 0.1
 * @class Comment
 * @requires mongoose
 * @augments Schema
 */
exports.Comment = Comment = new Schema({

	name:	{ type: String, 'default': 'hahaha' },
	age:	{ type: Number, min: 18, index: true },
	bio:	{ type: String, match: /[a-z]/ },
	date:	{ type: Date, 'default': Date.now },
	buff:	Buffer
	
});

// A setter
Comment.path('name').set(function (v) {
  return capitalize(v);
});

// Middleware
Comment.pre('save', function (next) {
  notify(this.get('email'));
  next();
});
