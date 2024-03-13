const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const { Schema } = mongoose;
// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URL)
  .then(() => console.log('connected to mongoDB'))
  .catch((err) => console.error(err));

const UsersSchema = new Schema({
  username: { type: String, require: true }
});
const Users = mongoose.model('Users', UsersSchema);

const exercisesSchema = new Schema({
  user_id: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: {type: Date}
});

const Exercises = mongoose.model('Exercises', exercisesSchema);

/** bodyParser.urlencoded(options)
 * Parses the text as URL encoded data (which is how browsers tend to send form data from regular forms set to POST)
 * and exposes the resulting object (containing the keys and values) on req.body
 */
app.use(bodyParser.urlencoded({ extended: true }));

/**bodyParser.json(options)
* Parses the text as JSON and exposes the resulting object on req.body.
*/
app.use(bodyParser.json());

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  const userObj = new Users({ username });
  try {
    //Check if user exist in DB
    let isUserInDb = await Users.findOne({ username: username })
    let userId = null;
    if (isUserInDb) {
      console.log("username is already exist in db");
      userId = isUserInDb["_id"];
    } else {
      console.log("username added in db");
      // Insert the username into the 'users' collection
      let result = await userObj.save();
      userId = result["_id"];
    }
    res.json({ username: username, _id: userId });
  } catch (err) {
    console.error('Error fetching users from the DB:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }

});

app.get('/api/users', async (req, res) => {
  try {
    // Retrieve all users from the 'users' collection
    const allUsers = await Users.find({});
    res.json(allUsers);
  } catch (error) {
    console.error('Error fetching users from the DB:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/api/users/:_id/exercises', async (req, res) => {
  let userId = req.params['_id'];
  console.log('userId: ', userId);
  let { description, duration, date } = req.body;
  try {
    let taskDate = null;   
    let isIdValid = mongoose.Types.ObjectId.isValid(userId);
    if (!isIdValid) {
      return res.status(400).send('Id is not valid!');
    }
    //Check if user exist in DB
    let getUser = await Users.findById({_id: userId });
    if (!getUser) {
      console.log("username not exist in db");
      res.status(404).json({error: 'User not exist in Db'})
    } else {
      taskDate = date ? new Date(date) : new Date();
      // Insert the task into the 'exercises' collection
      console.log('taskdate: ', taskDate);
      let exerciseObj = new Exercises({
        user_id: userId,
        description,
        duration, 
        date: taskDate
      });
      let getExercise = await exerciseObj.save();

      return res.json({
        username: getUser.username,
        description: getExercise.description,
        duration: getExercise.duration,
        date: getExercise.date.toDateString(),
        _id: getUser['_id']
      });
    }
  } catch(error) {
    console.error('Error fetching users from the DB:', error);
    res.status(500).json({ error: 'Internal Server Error'});
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  let {from, to, limit} = req.query;
  let userId = req.params['_id'];
  try {
    let newDateObj = {};
    if (from) {
      newDateObj['$gte'] = new Date(from);
    }

    if (to) {
      newDateObj['$lte'] = new Date(to);      
    }
    let filter = {
      user_id: userId
    }
    if (from || to) {
      filter.date = newDateObj;
    }
    let getUser = await Users.findById({_id: userId});
    let getAllExercises = await Exercises.find(filter).limit(+limit || 100);
    let logsArray = [];
    getAllExercises.map(obj => {
      logsArray.push({
        description: obj.description, 
        duration: obj.duration,
        date: obj.date ? obj.date.toDateString() : null
      });
    });
    let finalObj = {
      username: getUser.username,
      count: getAllExercises.length,
      _id: userId,
      log: logsArray 
    }
    console.log("getAllExercises: ", finalObj);
    res.json(finalObj);
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error'});
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
