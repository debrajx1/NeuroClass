const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });
const Session = require('./models/Session');
const Event = require('./models/Event');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log("Connected to DB");
    await Session.deleteMany({});
    await Event.deleteMany({});
    console.log("Deleted all sessions and events");
    process.exit(0);
}).catch(err => {
    console.error("DB Error", err);
    process.exit(1);
});
