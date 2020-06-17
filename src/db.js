const mongoose = require('mongoose');


function init(log, say) {
    mongoose.connect('mongodb://localhost:27017/jarvis', { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => log('Connected to mongodb!'))
        .catch(err => log(err));

    mongoose.connection.on('connected', () => {
        say('Connected to Jarvis database');
    });

    mongoose.connection.on('disconnected', () => {
        say('Disconnected from Jarvis database');
    });

    mongoose.connection.on('connecting', () => {
        say('Connecting to Jarvis database...');
    });
}

const Person = mongoose.model('Person',
    new mongoose.Schema({
        gender: {
            type: String,
            enum: ['male', 'female', 'unknown']
        },
        firstName: String,
        middleName: String,
        lastName: String,
        nickname: [String],
        address: {
            street: String,
            city: String,
            region: String,
            postalCode: String,
            country: String
        },
        contact: {
            email: [String],
            mobile: String,
            home: String,
            work: String
        },
        dob: Date
    }, { collection: 'people', timestamps: true }));

const Book = mongoose.model('Book',
    new mongoose.Schema({
        title: String,
        isbn: String,
        pageCount: Number,
        publishedDate: Date,
        thumbnailUrl: String,
        shortDescription: String,
        longDescription: String,
        status: String,
        authors: [String],
        categories: [String]
    }, { collection: 'books' }));

module.exports = { init, Person, Book };